import { Component, OnInit } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import {
  CanopyAssemblyProcessService,
  CanopyProcessAssemblyKitRow,
  CanopyProcessAttachment,
  CanopyProcessKit,
  CanopyProcessKva,
  CanopyProcessMachine,
  CanopyProcessModel,
  CanopyProcessPartLine,
  CanopyProcessPartRow,
  CanopyProcessPlanContext,
  LineRight,
  SubmitCanopyProcessRequest,
} from './canopy-assembly-process.service';

@Component({
  selector: 'app-canopy-assembly-process',
  standalone: false,
  templateUrl: './canopy-assembly-process.component.html',
  styleUrl: './canopy-assembly-process.component.scss',
})
export class CanopyAssemblyProcessComponent implements OnInit {
  // ── Context (read-only, from localStorage) ────────────────────
  pcCode: string = '';
  pcName: string = '';
  companyCode: string = '';
  empCode: string = '';
  todayIso: string = '';

  // ── Line-rights dropdown (same idiom as Canopy Plan) ──────────
  prmCode: string = '';
  lineRights: LineRight[] = [];
  selectedLineWisePC: string = '';

  // ── Cascading dropdowns ───────────────────────────────────────
  machines: CanopyProcessMachine[] = [];
  selectedMachine: string = '';           // PartCode "Foam-->Foam1"

  kvaList: CanopyProcessKva[] = [];
  selectedKVA: string = '';

  modelList: CanopyProcessModel[] = [];
  selectedModel: string = '';

  // ── Plan header state (readonly once picked) ──────────────────
  planCode: string = '';
  planDt: string = '';
  productCode: string = '';
  productPart: string = '';               // "PartDesc-->PartCode"
  bomCode: string = '';
  pfbCode: string = '';
  eDt: string = '';
  batchQty: number = 0;
  planQtyBal: number = 0;
  prcQty: number = 0;
  pfbRate: number = 0;

  // ── Kit picker (only in PSH mode) ─────────────────────────────
  kitList: CanopyProcessKit[] = [];
  selectedKit: string = '';

  // ── Search result tables ──────────────────────────────────────
  partRows: CanopyProcessPartRow[] = [];
  assemblyKitRows: CanopyProcessAssemblyKitRow[] = [];

  // ── Attachments (queued in memory + uploaded to temp folder) ──
  pendingFile: File | null = null;
  attachments: CanopyProcessAttachment[] = [];
  uploadProgress: number = 0;
  isUploading: boolean = false;

  // ── UI state ───────────────────────────────────────────────────
  isLoading: boolean = false;
  isSearching: boolean = false;
  isSaving: boolean = false;

  // ── Modals ─────────────────────────────────────────────────────
  successMessage: string = '';
  errorMessage: string = '';
  confirmMessage: string = '';

  constructor(private processService: CanopyAssemblyProcessService) {}

  ngOnInit(): void {
    const rawPc = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    this.pcCode      = rawPc === 'undefined' || rawPc === 'null' ? '' : rawPc;
    this.pcName      = localStorage.getItem('profitCenterName')?.trim() ?? '';
    this.companyCode = localStorage.getItem('companyId')?.trim() ?? '01';
    this.empCode     = localStorage.getItem('employeeCode')?.trim() ?? '';
    this.prmCode     = localStorage.getItem('positionRoleId')?.trim() ?? '';
    this.todayIso    = this.toIsoDate(new Date());
    this.loadLineRights();
  }

  // ── Dynamic Save button caption ───────────────────────────────
  // "End" for PSH mode with EDt null (record already open, closing units).
  // "Start" for NEW mode (creating a fresh PSH record).
  get saveButtonLabel(): string {
    if (this.isSaving) return this.isEndMode ? 'Ending…' : 'Saving…';
    return this.isEndMode ? 'End' : 'Start';
  }

  get isEndMode(): boolean {
    return !!this.pfbCode && this.pfbCode.substring(0, 3).toUpperCase() === 'PSH' && !this.eDt;
  }

  get isNewMode(): boolean {
    return !!this.pfbCode && this.pfbCode.substring(0, 3).toUpperCase() === 'NEW';
  }

  // ── Line-rights ───────────────────────────────────────────────
  get selectedLineRight(): LineRight | undefined {
    return this.lineRights.find(l => l.LineWisePC === this.selectedLineWisePC);
  }

  private loadLineRights(): void {
    if (!this.prmCode) { this.lineRights = []; return; }
    this.processService.getLineRights(this.prmCode).subscribe({
      next: (rows) => {
        this.lineRights = Array.isArray(rows) ? rows : [];
        if (this.lineRights.length === 1) {
          this.selectedLineWisePC = this.lineRights[0].LineWisePC;
          this.onLineChange();
        }
      },
      error: () => { this.lineRights = []; },
    });
  }

  onLineChange(): void {
    this.resetFromLine();
    if (!this.selectedLineWisePC) return;
    this.isLoading = true;
    this.processService.getMachineList(this.selectedLineWisePC).subscribe({
      next: (rows) => {
        this.machines = rows ?? [];
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.extractErr(err, 'Failed to load canopy type list.');
      },
    });
  }

  onMachineChange(): void {
    this.resetFromMachine();
    if (!this.selectedMachine || !this.selectedLineWisePC) return;
    this.isLoading = true;
    this.processService.getKvaList(this.selectedMachine, this.selectedLineWisePC).subscribe({
      next: (rows) => {
        this.kvaList = rows ?? [];
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.extractErr(err, 'Failed to load KVA list.');
      },
    });
  }

  onKvaChange(): void {
    this.resetFromKva();
    if (!this.selectedKVA || !this.selectedMachine || !this.selectedLineWisePC) return;
    this.isLoading = true;
    this.processService.getModelList(this.selectedMachine, this.selectedKVA, this.selectedLineWisePC).subscribe({
      next: (rows) => {
        this.modelList = rows ?? [];
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.extractErr(err, 'Failed to load Model list.');
      },
    });
  }

  onModelChange(): void {
    this.resetFromModel();
    if (!this.selectedModel || !this.selectedKVA || !this.selectedMachine || !this.selectedLineWisePC) return;

    this.isLoading = true;
    this.processService.getPlanContext(
      this.selectedMachine, this.selectedKVA, this.selectedModel, this.selectedLineWisePC
    ).subscribe({
      next: (ctx: CanopyProcessPlanContext | null) => {
        this.isLoading = false;
        if (!ctx) {
          this.errorMessage = 'No open plan found for the selected machine / KVA / Model.';
          return;
        }
        this.planCode    = ctx.CPCode ?? '';
        this.planDt      = ctx.Dt ?? '';
        this.productCode = ctx.Partcode ?? '';
        this.productPart = ctx.Part ?? '';
        this.bomCode     = ctx.BOMCode ?? '';
        this.pfbCode     = ctx.PFBCode ?? '';
        this.eDt         = ctx.EDt ?? '';
        this.batchQty    = Number(ctx.CPQty ?? 0);
        this.planQtyBal  = Number(ctx.PlanQtyBal ?? 0);
        this.prcQty      = Number(ctx.PrcQty ?? 0);

        // PSH-mode auto-flow: load kit picker + auto-select first + auto-search
        // so the operator lands directly on the "End" screen.
        if (this.isEndMode) this.loadKitList();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.extractErr(err, 'Failed to load Plan header.');
      },
    });
  }

  private loadKitList(): void {
    if (!this.selectedMachine || !this.selectedLineWisePC) return;
    this.processService.getKitList(
      this.selectedMachine, this.selectedLineWisePC, this.planCode, this.productCode
    ).subscribe({
      next: (rows) => {
        this.kitList = rows ?? [];
        if (this.kitList.length > 0 && this.isEndMode) {
          this.selectedKit = this.kitList[0].KitCode;
          this.onKitChange();
        }
      },
      error: (err) => {
        this.errorMessage = this.extractErr(err, 'Failed to load kit list.');
      },
    });
  }

  onKitChange(): void {
    if (!this.selectedKit) return;
    const kitParts = this.selectedKit.split('-->');
    const kitCode = kitParts[0] ?? '';
    this.processService.getKitContext(
      this.selectedMachine, kitCode, this.selectedLineWisePC, this.planCode, this.productCode
    ).subscribe({
      next: (ctx) => {
        if (!ctx) return;
        this.planQtyBal = ctx.Bal ?? 0;
        this.prcQty     = ctx.Bal ?? 0;
        this.pfbRate    = ctx.SRate ?? 0;
        this.onClickSearch();
      },
      error: (err) => {
        this.errorMessage = this.extractErr(err, 'Failed to load kit context.');
      },
    });
  }

  // ── Search ─────────────────────────────────────────────────────
  onClickSearch(): void {
    if (!this.planCode || !this.pfbCode) {
      this.errorMessage = 'Pick Canopy Type / KVA / Model first to resolve a plan.';
      return;
    }
    if (this.isNewMode && this.planQtyBal < this.prcQty) {
      this.errorMessage = 'Process Qty cannot be greater than Balance Qty.';
      return;
    }
    if (this.prcQty <= 0) {
      this.errorMessage = 'Process Qty must be greater than 0.';
      return;
    }

    // productPart carries "PartDesc-->PartCode" — extract the code half.
    const partSplit = this.productPart.split('-->');
    const partCodeForSearch = partSplit.length > 1 ? partSplit[1] : this.productCode;

    this.isSearching = true;
    this.processService.getPartRows(
      this.selectedLineWisePC, Number(this.prcQty), partCodeForSearch,
      this.planCode, this.bomCode, this.pfbCode
    ).subscribe({
      next: (rows) => {
        this.partRows = rows ?? [];
      },
      error: (err) => {
        this.errorMessage = this.extractErr(err, 'Failed to load Part Details.');
      },
    });

    this.processService.getAssemblyKitRows(
      this.selectedLineWisePC, Number(this.prcQty), partCodeForSearch,
      this.planCode, this.bomCode, this.pfbCode
    ).subscribe({
      next: (rows) => {
        this.assemblyKitRows = rows ?? [];
        this.isSearching = false;
      },
      error: (err) => {
        this.isSearching = false;
        this.errorMessage = this.extractErr(err, 'Failed to load Assembly Kit rows.');
      },
    });
  }

  // ── Attachments ────────────────────────────────────────────────
  onFileSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    this.pendingFile = input.files && input.files.length > 0 ? input.files[0] : null;
  }

  onAddAttachment(): void {
    if (!this.pendingFile) {
      this.errorMessage = 'Choose a file first.';
      return;
    }
    if (!this.empCode) {
      this.errorMessage = 'Employee code missing — please login again.';
      return;
    }
    // Guard against duplicates (server also skips duplicates silently).
    const already = this.attachments.some(a =>
      a.FileName.trim().toLowerCase() === this.pendingFile!.name.trim().toLowerCase());
    if (already) {
      this.errorMessage = `${this.pendingFile!.name} — file already attached.`;
      return;
    }

    this.uploadProgress = 0;
    this.isUploading = true;
    const file = this.pendingFile;
    this.processService.uploadFile(file, this.empCode).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round(100 * (event.loaded / event.total));
        } else if (event.type === HttpEventType.Response) {
          this.attachments.push({
            SrNo: this.attachments.length + 1,
            FileName: file.name,
          });
          this.pendingFile = null;
          this.isUploading = false;
          this.uploadProgress = 0;
          const input = document.getElementById('attachmentInput') as HTMLInputElement | null;
          if (input) input.value = '';
        }
      },
      error: (err) => {
        this.isUploading = false;
        this.uploadProgress = 0;
        this.errorMessage = this.extractErr(err, 'File upload failed.');
      },
    });
  }

  onRemoveAttachment(idx: number): void {
    if (idx < 0 || idx >= this.attachments.length) return;
    const att = this.attachments[idx];
    this.processService.deleteFile(att.FileName, this.empCode).subscribe({
      next: () => {
        this.attachments.splice(idx, 1);
        // Re-number SrNo so the UI stays sequential.
        this.attachments.forEach((a, i) => a.SrNo = i + 1);
      },
      error: (err) => {
        this.errorMessage = this.extractErr(err, 'Failed to delete attachment on server.');
      },
    });
  }

  // ── Save ───────────────────────────────────────────────────────
  onSaveClick(): void {
    if (!this.pfbCode || !this.planCode || !this.productCode) {
      this.errorMessage = 'Pick Canopy Type / KVA / Model first to resolve a plan.';
      return;
    }
    if (this.prcQty <= 0) {
      this.errorMessage = 'Process Qty must be greater than 0.';
      return;
    }
    if (this.isNewMode) {
      if (this.planQtyBal < this.prcQty) {
        this.errorMessage = 'Process Qty cannot be greater than Balance Qty.';
        return;
      }
      if (this.partRows.length === 0) {
        this.errorMessage = 'Click Search first to load Part Details.';
        return;
      }
      // Enforce per-row invariants that legacy checked at submit time.
      for (const r of this.partRows) {
        if (r.PrcQty > r.StkQty) {
          this.errorMessage = `Insufficient Stock for Part: ${r.Part}`;
          return;
        }
        if (Math.round(r.PrcQty) !== Math.round(r.KitQty * this.prcQty)) {
          this.errorMessage = 'Please click Search again — Process Qty has changed since last search.';
          return;
        }
      }
    }

    this.confirmMessage = this.isEndMode
      ? `End process ${this.pfbCode} for ${this.prcQty} unit(s)?`
      : `Start process for ${this.prcQty} unit(s)?`;
  }

  onConfirmSave(): void {
    this.confirmMessage = '';
    this.doSave();
  }

  onCancelConfirm(): void {
    this.confirmMessage = '';
  }

  private doSave(): void {
    this.isSaving = true;
    const prcDts: CanopyProcessPartLine[] = this.isNewMode
      ? this.partRows.map(r => ({
          PartCode: r.PartCode,
          KitQty:   r.KitQty,
          PrcQty:   r.PrcQty,
          Rate:     r.Rate,
          Wt:       r.Wt,
          Sqft:     r.Sqft,
        }))
      : [];

    const req: SubmitCanopyProcessRequest = {
      EmpCode:         this.empCode,
      PCCode:          this.selectedLineWisePC,
      ParentDgPC:      this.selectedLineRight?.ParentDgPC ?? '',
      CompanyCode:     this.companyCode || '01',
      MachineCodeSrNo: this.selectedMachine,
      PlanCode:        this.planCode,
      ProductCode:     this.extractCode(this.productPart, this.productCode),
      BOMCode:         this.bomCode,
      PFBCode:         this.pfbCode,
      BatchQty:        Number(this.batchQty),
      PrcQty:          Number(this.prcQty),
      Remark:          'Nil',
      PrcDts:          prcDts,
      Attachments:     this.attachments,
    };

    this.processService.submit(req).subscribe({
      next: (resp) => {
        this.isSaving = false;
        this.successMessage = resp?.Message
          || `Process ${resp?.PFBCode ?? ''} saved successfully.`;
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = this.extractErr(err, 'Save failed.');
      },
    });
  }

  // ── State reset helpers (cascading clear on upstream change) ──
  private resetFromLine(): void {
    this.machines = []; this.selectedMachine = '';
    this.resetFromMachine();
  }
  private resetFromMachine(): void {
    this.kvaList = []; this.selectedKVA = '';
    this.resetFromKva();
  }
  private resetFromKva(): void {
    this.modelList = []; this.selectedModel = '';
    this.resetFromModel();
  }
  private resetFromModel(): void {
    this.planCode = ''; this.planDt = '';
    this.productCode = ''; this.productPart = '';
    this.bomCode = ''; this.pfbCode = ''; this.eDt = '';
    this.batchQty = 0; this.planQtyBal = 0; this.prcQty = 0; this.pfbRate = 0;
    this.kitList = []; this.selectedKit = '';
    this.partRows = []; this.assemblyKitRows = [];
  }

  // ── Modal close handlers ──────────────────────────────────────
  closeError(): void { this.errorMessage = ''; }
  closeSuccess(): void { this.successMessage = ''; }

  // ── Helpers ───────────────────────────────────────────────────
  trackByIndex = (i: number) => i;

  private extractCode(concatenated: string, fallback: string): string {
    if (!concatenated) return fallback;
    const idx = concatenated.indexOf('-->');
    return idx < 0 ? concatenated : concatenated.substring(idx + 3).trim();
  }

  private extractErr(err: any, fallback: string): string {
    if (err?.status === 0) return 'Unable to reach server. Please try again.';
    return err?.error?.message
        || err?.error
        || err?.message
        || fallback;
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
