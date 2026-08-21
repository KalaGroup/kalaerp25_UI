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

  // ── Line list (hardcoded — same six canopy-assembly lines used across
  //    Canopy Plan / Plan Checker / Process Checker / Flatpack forms). No
  //    position-role fetch; every operator sees the same six lines.
  readonly lineRights: LineRight[] = [
    { LineWisePC: '01.190', LineDesc: 'Unit 1 Line A Canopy Assembly',   ParentDgPC: '01.005' },
    { LineWisePC: '03.181', LineDesc: 'Unit 4 Line B Canopy Assembly',   ParentDgPC: '03.038' },
    { LineWisePC: '03.069', LineDesc: 'Unit 4 Line C Canopy Assembly',   ParentDgPC: '03.038' },
    { LineWisePC: '28.025', LineDesc: 'Unit BLR Line A Canopy Assembly', ParentDgPC: '28.017' },
    { LineWisePC: '28.039', LineDesc: 'Unit BLR Line B Canopy Assembly', ParentDgPC: '28.017' },
    { LineWisePC: '28.116', LineDesc: 'Unit BLR Line C Canopy Assembly', ParentDgPC: '28.017' },
  ];
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
    this.todayIso    = this.toIsoDate(new Date());
    // Line list is hardcoded (see lineRights above). No API fetch.
    // Auto-select the sole entry when the list is length 1 — parity with
    // prior UX where a single-line position auto-picked itself.
    if (this.lineRights.length === 1) {
      this.selectedLineWisePC = this.lineRights[0].LineWisePC;
      this.onLineChange();
    }
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
      // Per-row invariants that legacy checked at submit time. Backend
      // now enforces the insufficient-stock guard authoritatively, so
      // we only keep the stale-search guard here (Prc Qty must still
      // match KitQty × PrcQty — otherwise the operator changed the
      // top-of-form Process Qty after Search and the row snapshot is
      // out of date).
      for (const r of this.partRows) {
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
    // Resolve the selected line ONCE so LineWisePC + ParentDgPC always come
    // from the same hardcoded row (no drift where PCCode is set but
    // ParentDgPC is accidentally blank).
    const selectedLine = this.selectedLineRight;
    if (!selectedLine || !selectedLine.LineWisePC) {
      this.errorMessage = 'Please select a Line before saving.';
      return;
    }
    if (!selectedLine.ParentDgPC) {
      this.errorMessage = `Line "${selectedLine.LineDesc}" is missing its ParentDgPC — cannot save.`;
      return;
    }

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
      PCCode:          selectedLine.LineWisePC,
      ParentDgPC:      selectedLine.ParentDgPC,
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
          this.resetForm();
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

  // ══════════════════════════════════════════════════════════════
  // EXCEL EXPORT (both tables)
  // ══════════════════════════════════════════════════════════════
  //
  // Pure CSV — Excel opens .csv files natively and no npm library
  // is required, keeping the bundle lean. UTF-8 BOM added so Excel
  // renders unicode part descriptions correctly on Windows.
  // A "SHORT?" column at the end flags each row where StkQty is
  // insufficient — that's the whole point of exporting, so the
  // operator / stores team can filter on it in Excel.

  /** Export Part Details table to CSV (opens in Excel). */
  exportPartDetailsExcel(): void {
    if (this.partRows.length === 0) return;
    const headers = ['SrNo', 'Part Description', 'Kit Qty', 'Prc Qty',
                     'Stock Qty', 'Wt', 'Total Wt', 'Sqft', 'Total Sqft',
                     'Rate', 'Part Code', 'SHORT?'];
    const rows = this.partRows.map((r, i) => [
      i + 1,
      r.Part,
      r.KitQty,
      r.PrcQty,
      r.StkQty,
      r.Wt,
      r.TotWt,
      r.Sqft,
      r.TotSqft,
      r.Rate,
      r.PartCode,
      (r.StkQty <= 0 || r.PrcQty > r.StkQty) ? 'YES' : '',
    ]);
    const fileBase = `CanopyProcess_PartDetails_${this.pfbCode || 'new'}`;
    this.downloadCsv(fileBase, headers, rows);
  }

  /** Export Assembly Kit Details table to CSV (opens in Excel). */
  exportAssemblyKitExcel(): void {
    if (this.assemblyKitRows.length === 0) return;
    const headers = ['SrNo', 'Part', 'Qty', 'Prc Qty', 'Stock Qty',
                     'Part Code', 'SHORT?'];
    const rows = this.assemblyKitRows.map((r, i) => [
      i + 1,
      r.Part,
      r.Qty,
      r.PrcQty,
      r.StkQty,
      r.PartCode,
      (r.StkQty <= 0 || r.PrcQty > r.StkQty) ? 'YES' : '',
    ]);
    const fileBase = `CanopyProcess_AssemblyKit_${this.pfbCode || 'new'}`;
    this.downloadCsv(fileBase, headers, rows);
  }

  /** Shared CSV-download helper. UTF-8 BOM so Excel picks encoding
   *  correctly. Values that contain commas / quotes / newlines are
   *  quoted per RFC 4180. Timestamp suffix keeps repeated exports
   *  from clobbering each other in the Downloads folder. */
  private downloadCsv(fileBase: string, headers: string[], rows: any[][]): void {
    const escape = (v: any): string => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines: string[] = [
      headers.map(escape).join(','),
      ...rows.map(row => row.map(escape).join(',')),
    ];
    const csv = '﻿' + lines.join('\r\n');    // BOM + CRLF for Excel

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${fileBase}_${stamp}.csv`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private resetForm(): void {

  // Keep today's date
  this.todayIso = this.toIsoDate(new Date());

  // Reset entire form
  this.selectedLineWisePC = '';
  this.resetFromLine();

  this.attachments = [];
  this.pendingFile = null;
  this.uploadProgress = 0;
  this.isUploading = false;

  this.partRows = [];
  this.assemblyKitRows = [];

  this.isLoading = false;
  this.isSearching = false;

  const input = document.getElementById('attachmentInput') as HTMLInputElement | null;
  if (input) {
    input.value = '';
  }
}
}
