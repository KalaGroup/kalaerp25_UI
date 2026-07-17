import { Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from 'environments/environment';

import { CanopyProcessService } from '../canopy-process.service';

import { IfabricationprcloadMachine }    from './Model/fabricationprcloadMachine';
import { IfabricationprcloadOSSupplier } from './Model/fabricationprcloadOSSupplier';
import { IfabricationprcloadKVA }        from './Model/fabricationprcloadKVA';
import { IfabricationprcloadModel }      from './Model/fabricationprcloadModel';
import { IfabricationprcloadCpyKit }     from './Model/fabricationprcloadCpyKit';
import { IfabricationPrcPartDts }        from './Model/fabricationprcPartDts';
import { IfabricationprcSave }           from './Model/fabricationprcSave';
import { FabricationprcService } from './fabricationprc.service';

/** A single attachment row tracked in the component grid. */
interface IAttachmentRow {
  SrNo: number;
  Attachfile: string;
  FileSaveYOrN: string;
}

@Component({
  selector: 'app-fabrication-maker',
  standalone: false,
  templateUrl: './fabrication-maker.component.html',
  styleUrl: './fabrication-maker.component.scss'
})
export class FabricationMakerComponent implements OnInit {

  // ---- Injected services ----
  private readonly api = inject(FabricationprcService);
  private readonly canopyService = inject(CanopyProcessService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ---- Line dropdown (GetLineByProcess) ----
  readonly lineList = signal<any[]>([]);
  selectedLine = '';

  // ---- async / status state as signals ----
  readonly machineList    = signal<IfabricationprcloadMachine[]>([]);
  readonly supplierList   = signal<IfabricationprcloadOSSupplier[]>([]);
  readonly kvaList        = signal<IfabricationprcloadKVA[]>([]);
  readonly modelList      = signal<IfabricationprcloadModel[]>([]);
  readonly cpyKitList     = signal<IfabricationprcloadCpyKit[]>([]);
  readonly partDtsList    = signal<IfabricationPrcPartDts[] | null>(null);
  readonly attachments    = signal<IAttachmentRow[]>([]);

  readonly loading        = signal(false);
  readonly message        = signal('');
  readonly showMessage    = signal(false);
  readonly uploadPercent  = signal(0);

  // ---- two-way (ngModel) form fields ----
  today = '';
  pc = '';
  Spccode = '';
  selectedMachine     = '0';
  selectedOSSupplier  = '0';
  selectedKVA         = '0';
  selectedModel       = '0';
  selectedCpyKit      = '0';

  cpyPlanCode = '';
  cpyPlanDt   = '';
  cpyPlanPart = '';
  planQty     = 0;
  planQtyBal  = 0;
  prcQty      = 0;

  strPartcode = '';
  strPfbCode  = '0';
  bomCode     = '0';
  edt: string | null = '0';
  strPfbRate  = 0;

  kitRate     = 0;
  kitWt       = 0;
  kitSqft     = 0;
  fabCatID    = '';

  lblSaveCaption = 'Submit';

  // ---- Result popup ----
  showResultPopup = false;
  resultTitle = '';
  resultMessage = '';
  resultAction: 'Submit' | 'End' = 'Submit';

  // ---- session ----
  empCode = '';
  pcName = '';
  pcOld = '';
  loginType = '';
  loginCompCode = '';
  isShowForm = true;

  // attachment input buffer
  newAttachment: Partial<IAttachmentRow> = {};
  private pendingFiles: File[] = [];

  constructor() {
    this.loadCurrentUser();
  }

  /** Same key-by-key pattern used by cnc-maker / bending-maker. */
  private loadCurrentUser(): void {
    this.empCode       = (localStorage.getItem('employeeCode')     ?? '').trim();
    this.Spccode            = (localStorage.getItem('ProfitCenter')     ?? this.pc).trim();
    this.pcName        = (localStorage.getItem('profitCenterName') ?? '').trim();
    this.loginType     = (localStorage.getItem('loginType')        ?? '').trim();
    this.loginCompCode = (localStorage.getItem('companyId')        ?? '').trim();
    this.pcOld         = (localStorage.getItem('ProfitCenter_old') ?? '').trim();
  }

  ngOnInit(): void {
    if (!this.isShowForm) {
      this.router.navigate(['/']);
      return;
    }
    this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
    // this.loadMachine();
    //this.loadSupplier();
    this.loadLineByProcess();
  }

  /** Loads the lines for this process. ProcessName is hard-coded to "Fabrication". */
  loadLineByProcess(): void {
    this.canopyService.GetLineByProcess('Fabrication', this.loginCompCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.lineList.set(data ?? []); },
        error: (err)  => { console.error(err); },
      });
  }

  /** On line change: set this.pc, reset everything below, then reload suppliers. */
  onLineSelect(lineWisePC: string): void {
    this.selectedLine = lineWisePC;
    this.pc = lineWisePC;
    this.resetFromSupplier();
    this.loadSupplier();
  }

  // ============ Cascading dropdowns ============

  loadMachine(): void {
    this.loading.set(true);
    this.api.LoadMachine(this.pc)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.machineList.set(data ?? []); this.loading.set(false); },
        error: (err)  => { console.error(err); this.loading.set(false); },
      });
      
  }

  loadSupplier(): void {
    this.loading.set(true);
    this.api.LoadOSSupplier(this.pc)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.supplierList.set(data ?? []); this.loading.set(false); },
        error: (err)  => { console.error(err); this.loading.set(false); },
      });
  }

  onSupplierSelect(supplierCode: string): void {
    this.selectedOSSupplier = supplierCode;
    this.resetFromMachine();
    this.loadMachine();
  }

  onMachineSelect(machineCode: string): void {
    this.selectedMachine = machineCode;
    this.resetFromKva();
    this.loadKVA();
  }

  loadKVA(): void {
    this.loading.set(true);
    this.resetFromKva();
    this.api.FabGetKVA(this.pc, this.selectedMachine, this.selectedOSSupplier)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.kvaList.set(data ?? []); this.loading.set(false); },
        error: (err)  => { console.error(err); this.loading.set(false); },
      });
  }

  onKVASelect(kva: string): void {
    this.selectedKVA = kva;
    this.resetFromModel();
    this.loading.set(true);
    this.api.FabGetModel(this.pc, this.selectedMachine, kva, this.selectedOSSupplier)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.modelList.set(data ?? []); this.loading.set(false); },
        error: (err)  => { console.error(err); this.loading.set(false); },
      });
  }

  onModelSelect(kva: string, model: string): void {
    this.selectedKVA = kva;
    this.selectedModel = model;
    this.resetPlan();
    this.loading.set(true);
    this.api.FabGetPlanDts(this.pc, this.selectedMachine, kva, model, this.selectedOSSupplier)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const plan = (data ?? []).filter((d) => d.KVAMod === `${kva}-->${model}`);
          if (plan.length > 0) {
            const p = plan[0];
            this.cpyPlanCode = p.CPCode;
            this.cpyPlanDt   = p.Dt;
            this.cpyPlanPart = p.Part;
            this.planQty     = p.CPQty;
            this.strPartcode = p.Partcode;
            this.strPfbCode  = p.PFBCode;
            this.bomCode     = p.BOMCode;
            this.edt         = p.EDt;
          }
          this.loading.set(false);
          this.loadCpyKit();
        },
        error: (err) => { console.error(err); this.loading.set(false); },
      });
  }

  loadCpyKit(): void {
    this.cpyKitList.set([]);
    this.selectedCpyKit = '';
    this.loading.set(true);
    this.api.FabGetCpyKit(
      this.selectedMachine, this.pc, this.cpyPlanCode, this.strPartcode, this.selectedOSSupplier
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const list = data ?? [];
          this.cpyKitList.set(list);
          if (list.length > 0) {
            this.fabCatID = list[0].catID ?? '';
          }
          // Auto-select for "End" flow.
          if (this.edt == null && this.strPfbCode.substring(0, 3) === 'PSH' && list.length > 0) {
            this.selectedCpyKit = list[0].KitCode;
            this.onCpyKitSelect(list[0].KitCode);
            this.onClickSearch();
            this.lblSaveCaption = 'End';
          }
          this.loading.set(false);
        },
        error: (err) => { console.error(err); this.loading.set(false); },
      });
  }

  onCpyKitSelect(cpyKit: string): void {
    this.selectedCpyKit = cpyKit;
    this.partDtsList.set(null);
    this.planQtyBal = 0;
    this.prcQty = 0;
    this.strPfbRate = 0;

    const cpyKitCode = this.selectedCpyKit.split('-->');
    this.loading.set(true);
    this.api.FabGetCpyKitQty(
      this.selectedMachine, cpyKitCode[0], this.pc,
      this.cpyPlanCode, this.strPartcode, this.selectedOSSupplier
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const q = data?.[0];
          if (q) {
            this.planQty    = q.CPQty;
            this.planQtyBal = q.Bal;
            this.prcQty     = q.Bal;
            this.strPfbRate = q.SRate;
            this.kitRate    = q.Rate;
            this.kitWt      = q.Pwt;
            this.kitSqft    = q.Psqft;
            this.fabCatID   = q.CatID;
          }
          this.loading.set(false);
        },
        error: (err) => { console.error(err); this.loading.set(false); },
      });
  }

  onClickSearch(): void {
    if (this.edt == null) {
      this.partDtsList.set(null);
      this.loading.set(true);
      this.api.FabGetEndPrcPartDts(this.pc, this.strPfbCode)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data) => {
            const parts = data ?? [];
            this.partDtsList.set(parts);
            if (parts.length > 0 && !this.fabCatID) {
              const first: any = parts[0];
              this.fabCatID = String(first.categoryID ?? first.CatID ?? '');
            }
            this.loading.set(false);
          },
          error: (err) => { console.error(err); this.loading.set(false); },
        });
      return;
    }

    if (this.selectedCpyKit === '0' || this.selectedCpyKit === '') {
      alert('Pl Select The Canopy Kit For process');
      return;
    }
    if (this.strPfbRate === 0) {
      alert('Pl Price List For This Kit Not Updated');
      return;
    }
    if (this.planQtyBal < this.prcQty) {
      alert('Process Qty cannot Be Greater Than Bal Qty');
      return;
    }

    const cpyKitCode = this.selectedCpyKit.split('-->');
    this.loading.set(true);
    this.api.FabGetCpyKitDts(this.pc, cpyKitCode[0], this.bomCode, this.prcQty)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.partDtsList.set(data ?? []); this.loading.set(false); },
        error: (err)  => { console.error(err); this.loading.set(false); },
      });
  }

  // ============ Attachments ============

  getAttachmentFileDetails(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.pendingFiles = input.files ? Array.from(input.files) : [];
  }

  addAttachmentFieldValue(isValid: boolean): void {
    if (!isValid) return;

    if (this.pendingFiles.length === 0) {
      alert(' Please Attach File ');
      return;
    }

    for (const file of this.pendingFiles) {
      if (this.attachments().some((a) => a.Attachfile.trim() === file.name.trim())) {
        alert(`${file.name.trim()} - File Allready Attach .. Try again `);
        return;
      }
    }

    const nextSrNo = this.attachments().length === 0
      ? 1
      : this.attachments()[this.attachments().length - 1].SrNo + 1;

    for (const file of this.pendingFiles) {
      const frmData = new FormData();
      this.showMessage.set(false);
      frmData.append('fileUpload', file);
      frmData.append('FrmEcode', this.empCode);
      frmData.append('FileUploadType', 'Save');

      this.http.post(`${environment.apiURL}/FabPrc/UploadFiles`, frmData, {
        reportProgress: true,
        observe: 'events',
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (event: HttpEvent<unknown>) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              this.uploadPercent.set(Math.round((event.loaded / event.total) * 100));
            } else if (event.type === HttpEventType.Response) {
              this.uploadPercent.set(0);
              this.attachments.update((rows) => [
                ...rows,
                { SrNo: nextSrNo, Attachfile: file.name.trim(), FileSaveYOrN: 'Uploaded Successfully ' },
              ]);
              this.message.set('Uploaded Successfully ');
              this.showMessage.set(true);
            }
          },
          error: (err) => {
            console.error(err);
            this.message.set('Something went wrong in file attachmnet');
            this.showMessage.set(true);
          },
        });
    }

    this.pendingFiles = [];
    this.newAttachment = {};
  }

  deleteAttachmentFieldValue(index: number): void {
    const row = this.attachments()[index];
    if (!row?.Attachfile?.trim()) return;

    const frmData = new FormData();
    this.showMessage.set(false);
    frmData.append('fileUpload', row.Attachfile.trim());
    frmData.append('FrmEcode', this.empCode);
    frmData.append('FileUploadType', 'Delete');

    this.http.post(`${environment.apiURL}/FabPrc/UploadFiles`, frmData, {
      reportProgress: true,
      observe: 'events',
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event: HttpEvent<unknown>) => {
          if (event.type === HttpEventType.Response) {
            this.attachments.update((rows) => rows.filter((_, i) => i !== index));
            this.message.set('Delete Successfully ');
            this.showMessage.set(true);
          }
        },
        error: (err) => {
          console.error(err);
          this.message.set('Something went wrong in file attachmnet');
          this.showMessage.set(true);
        },
      });
  }

  // ============ Submit ============

  onFormSubmit(_form: NgForm): void {
    const parts = this.partDtsList();
    if (parts == null) {
      alert('Please Search Process Details');
      return;
    }

    if (!this.selectedOSSupplier || this.selectedOSSupplier === '0') {
      alert('Please Select Supplier');
      return;
    }

    // Stock check only for new processes.
    if (this.strPfbCode === 'NEW') {
      const short = parts.find((item) => item.BatchQty > item.StkQty);
      if (short) {
        alert('Insufficient Stk For Part ' + short.Part);
        return;
      }
      const mismatch = parts.find(
        (item) => Math.round(item.BatchQty) !== Math.round(item.KitQty * this.prcQty)
      );
      if (mismatch) {
        alert('Pl Click Search As You have Changed Process Qty');
        return;
      }
    }

    const prcDts = parts
      .map((item) =>
        [
          item.PartCode, item.KitQty, item.BatchQty, item.PRate, item.SRate,
          item.Length, item.Width, item.Thickness, item.LossWgt,
          item.categoryID, item.WtPerUnit, item.sqft,
        ].join('-->'))
      .join(',');

    const attachFileDts = this.attachments()
      .map((a) => `${a.SrNo}-->${a.Attachfile}`)
      .join('@#@');

    // PCCode_Act = selected line's PC (LineWisePC); PCCode = its ParentDgPC.
    const selectedLineObj = this.lineList().find((l) => l.LineWisePC === this.selectedLine);

    // Resolve the selected supplier's SCode for the save payload.
    const selectedSupplierObj = this.supplierList().find((s) => s.SCode === this.selectedOSSupplier);

    // The C# DTO has every numeric field typed as `string`, so we must
    // serialise them as strings — otherwise body deserialisation fails.
    const payload: IfabricationprcSave = {
      EmpCode:        this.empCode         ?? '',
      PCCode_Act:     this.pc,
      PCCode:         selectedLineObj?.ParentDgPC ?? '',
      PlanCode:       this.cpyPlanCode     ?? '',
      ProductCode:    this.strPartcode     ?? '',
      PFBCode:        this.strPfbCode      ?? '',
      CpyKitcode:     (this.selectedCpyKit ?? '').split('-->')[0],
      BatchQty:       String(this.planQty    ?? 0),
      PrcQty:         String(this.prcQty     ?? 0),
      PFBRate:        String(this.strPfbRate ?? 0),
      Rate:           String(this.kitRate    ?? 0),
      PWt:            String(this.kitWt      ?? 0),
      PSqft:          String(this.kitSqft    ?? 0),
      MachineCodeSrNo: this.selectedMachine ?? '',
      OSSupplierCode: selectedSupplierObj?.SCode ?? '',
      BOMcode:        this.bomCode         ?? '0',
      PrcDts:         prcDts                ?? '',
      Remark:         (this.lblSaveCaption === 'End' ? 'End' : 'Nil'),
      AttachFileDts:  attachFileDts.trim(),
      CatID:          this.fabCatID         ?? '0',
    };

    this.loading.set(true);
    const action: 'Submit' | 'End' = this.lblSaveCaption === 'End' ? 'End' : 'Submit';

    this.api.postFabSave(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msg) => {
          this.loading.set(false);
          const message = (msg ?? '').trim();
          const isFailure = this.isFailureMessage(message);
          this.openResultPopup(action, message, isFailure);
        },
        error: (err) => {
          this.loading.set(false);
          console.error(err);
          const apiMessage =
            (typeof err?.error === 'string' && err.error.trim()) ||
            err?.message ||
            'Something went wrong. Please try again.';
          this.openResultPopup(action, apiMessage, /*isError*/ true);
        },
      });
  }

  // ============ Result popup ============

  private isFailureMessage(message: string): boolean {
    if (!message) return false;
    const lower = message.toLowerCase();
    const failureSignals = [
      'insufficient', 'not enough', 'error', 'failed', 'fail',
      'invalid', 'cannot', 'unable', 'missing', 'duplicate',
      'already', 'not found', 'denied'
    ];
    return failureSignals.some(p => lower.includes(p));
  }

  private openResultPopup(action: 'Submit' | 'End', message: string, isError = false): void {
    this.resultAction = action;
    this.resultTitle = isError
      ? (action === 'End' ? 'End Failed' : 'Submit Failed')
      : (action === 'End' ? 'Fabrication Process Ended' : 'Fabrication Process Submitted');
    this.resultMessage = message || (isError
      ? 'Operation failed.'
      : `${action} completed successfully.`);
    this.showResultPopup = true;
  }

  /** Closes the popup and reloads the Fabrication Maker page. */
  closeResultPopup(): void {
    this.showResultPopup = false;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/canopy-process/fabrication-maker']);
    });
  }

  // ============ Reset helpers ============

  /** Reset Supplier dropdown and everything below it (Machine → KVA → Model → Plan). */
  private resetFromSupplier(): void {
    this.supplierList.set([]);
    this.selectedOSSupplier = '';
    this.resetFromMachine();
  }

  /** Reset Machine dropdown and everything below it (KVA → Model → Plan). */
  private resetFromMachine(): void {
    this.machineList.set([]);
    this.selectedMachine = '';
    this.resetFromKva();
  }

  private resetFromKva(): void {
    this.kvaList.set([]);
    this.selectedKVA = '';
    this.resetFromModel();
  }

  private resetFromModel(): void {
    this.modelList.set([]);
    this.selectedModel = '';
    this.cpyKitList.set([]);
    this.selectedCpyKit = '';
    this.resetPlan();
  }

  private resetPlan(): void {
    this.cpyPlanCode = '';
    this.cpyPlanDt = '';
    this.cpyPlanPart = '';
    this.planQty = 0;
    this.strPartcode = '';
    this.strPfbCode = '';
    this.bomCode = '';
    this.edt = '';
    this.planQtyBal = 0;
    this.prcQty = 0;
    this.strPfbRate = 0;
    this.fabCatID = '';
    this.partDtsList.set(null);
  }
}
