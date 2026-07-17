import { Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from 'environments/environment';

import { BendingprcService } from './bendingprc.service';
import { CanopyProcessService } from '../canopy-process.service';

import { IbendingprcloadMachine } from './Model/bendingprcloadMachine';
import { IbendingprcloadKVA }     from './Model/bendingprcloadKVA';
import { IbendingprcloadModel }   from './Model/bendingprcloadModel';
import { IbendingprcloadCpyKit }  from './Model/bendingprcloadCpyKit';
import { IBendingPrcPartDts }     from './Model/bendingprcPartDts';
import { IbendingprcSave }        from './Model/bendingprcSave';

/** A single attachment row tracked in the component grid. */
interface IAttachmentRow {
  SrNo: number;
  Attachfile: string;
  FileSaveYOrN: string;
}

@Component({
  selector: 'app-bending-maker',
  standalone: false,
  templateUrl: './bending-maker.component.html',
  styleUrl: './bending-maker.component.scss'
})
export class BendingMakerComponent implements OnInit {

  private readonly api = inject(BendingprcService);
  private readonly canopyService = inject(CanopyProcessService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ---- Line dropdown (GetLineByProcess) ----
  readonly lineList = signal<any[]>([]);
  selectedLine = '';

  // ---- async / status state as signals ----
  readonly machineList = signal<IbendingprcloadMachine[]>([]);
  readonly kvaList = signal<IbendingprcloadKVA[]>([]);
  readonly modelList = signal<IbendingprcloadModel[]>([]);
  readonly cpyKitList = signal<IbendingprcloadCpyKit[]>([]);
  readonly partDtsList = signal<IBendingPrcPartDts[] | null>(null);
  readonly attachments = signal<IAttachmentRow[]>([]);
 
  readonly loading = signal(false);
  readonly message = signal('');
  readonly showMessage = signal(false);
  readonly uploadPercent = signal(0);
 
  // ---- two-way (ngModel) form fields ----
  today = '';
  Spccode = '';
  PC = '';
  selectedMachine = '0';
  selectedKVA = '0';
  selectedModel = '0';
  selectedCpyKit = '0';
 
  cpyPlanCode = '';
  cpyPlanDt = '';
  cpyPlanPart = '';
  planQty = 0;
  planQtyBal = 0;
  prcQty = 0;
 
  strPartcode = '';
  strPfbCode = '0';
  bomCode = '0';
  edt: string | null = '0';
  strPfbRate = 0;
 
  kitRate = 0;
  kitWt = 0;
  kitSqft = 0;
  benCatID = '';
 
  lblSaveCaption = 'Submit';

  // ---- Result popup (shown after Submit / End succeeds) ----
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

  /**
   * Loads the current user from localStorage — same key-by-key pattern
   * used by cnc-maker / cnc-checker / sheet-metal-jobcard-checker.
   */
  private loadCurrentUser(): void {
    this.empCode       = (localStorage.getItem('employeeCode')     ?? '').trim();
    this.Spccode       = (localStorage.getItem('ProfitCenter')     ?? this.Spccode).trim();
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
    this.loadLineByProcess();
  }

  /** Loads the lines for this process. ProcessName is hard-coded to "Bending". */
  loadLineByProcess(): void {
    this.canopyService.GetLineByProcess('Bending', this.loginCompCode )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.lineList.set(data ?? []); },
        error: (err) => { console.error(err); },
      });
  }

   /** On line change: use the selected line's LineWisePC as this.PC, then load machines. */
  onLineSelect(lineWisePC: string): void {
    this.selectedLine = lineWisePC;
    this.PC = lineWisePC;
    this.loadMachine();
  }
  // ---------------------------------------------------------------- cascades

  loadMachine(): void {
    this.loading.set(true);
    this.api.LoadMachine(this.PC)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.machineList.set(data ?? []); this.loading.set(false); },
        error: (err) => { console.error(err); this.loading.set(false); },
      });
  }
 
  onMachineSelect(machineCode: string): void {
    this.selectedMachine = machineCode;
    this.resetFromKva();
    this.loadKVA();
  }
 
  loadKVA(): void {
    this.loading.set(true);
    this.resetFromKva();
    this.api.getKVA(this.PC, this.selectedMachine)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.kvaList.set(data ?? []); this.loading.set(false); },
        error: (err) => { console.error(err); this.loading.set(false); },
      });
  }
 
  onKVASelect(kva: string): void {
    this.selectedKVA = kva;
    this.resetFromModel();
    this.loading.set(true);
    this.api.getModel(this.PC, this.selectedMachine, kva)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.modelList.set(data ?? []); this.loading.set(false); },
        error: (err) => { console.error(err); this.loading.set(false); },
      });
  }
 
  onModelSelect(kva: string, model: string): void {
    this.selectedKVA = kva;
    this.selectedModel = model;
    this.resetPlan();
    this.loading.set(true);
    this.api.BendGetPlanDts(this.PC, this.selectedMachine, kva, model)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const plan = (data ?? []).filter((d) => d.KVAMod === `${kva}-->${model}`);
          if (plan.length > 0) {
            const p = plan[0];
            this.cpyPlanCode = p.CPCode;
            this.cpyPlanDt = p.Dt;
            this.cpyPlanPart = p.Part;
            this.planQty = p.CPQty;
            this.strPartcode = p.Partcode;
            this.strPfbCode = p.PFBCode;
            this.bomCode = p.BOMCode;
            this.edt = p.EDt;
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
    this.api.BendGetCpyKit(this.selectedMachine, this.PC, this.cpyPlanCode, this.strPartcode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.cpyKitList.set(data ?? []);
          // Auto-select for "End" flow (existing PFB starting with PSH and no end date).
          if (this.edt == null && this.strPfbCode.substring(0, 3) === 'PSH' && (data?.length ?? 0) > 0) {
            this.selectedCpyKit = data![0].KitDesc;
            this.onCpyKitSelect(data![0].KitCode);
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
    this.api.BendGetCpyKitQty(this.selectedMachine, cpyKitCode[0], this.PC, this.cpyPlanCode, this.strPartcode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const q = data?.[0];
          if (q) {
            this.planQtyBal = q.Bal;
            this.prcQty = q.Bal;
            this.strPfbRate = q.SRate;
            this.kitRate = q.Rate;
            this.kitWt = q.Pwt;
            this.kitSqft = q.Psqft;
            this.benCatID = q.CatID;
          }
          this.onClickSearch();
          this.loading.set(false);
        },
        error: (err) => { console.error(err); this.loading.set(false); },
      });
  }
 
  onClickSearch(): void {
    if (this.edt == null) {
      this.partDtsList.set(null);
      this.loading.set(true);
      this.api.BendGetEndPrcPartDts(this.PC, this.strPfbCode)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data) => {
            const parts = data ?? [];
            this.partDtsList.set(parts);
            // End flow: BendGetCpyKitQty doesn't run (no balance left
            // for an already-processed PSH plan) so benCatID never
            // gets populated. Pull it off the first part row so the
            // save payload's required CatID isn't null.
            if (parts.length > 0) {
              const first: any = parts[0];
              if (!this.benCatID) {
                this.benCatID = String(first.categoryID ?? first.CatID ?? '');
              }
            }
            this.loading.set(false);
          },
          error: (err) => { console.error(err); this.loading.set(false); },
        });
      return;
    }
 
    if (this.selectedCpyKit === '0') {
      alert('Pl Select The Canopy Kit For process');
      return;
    }
    if (this.strPfbRate === 0) {
      alert('Pl Price List For This Kit Not Updated');
      return;
    }
 
    const cpyKitCode = this.selectedCpyKit.split('-->');
    this.loading.set(true);
    this.api.BendGetCpyKitDts(this.PC, cpyKitCode[0], this.bomCode, this.prcQty)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.partDtsList.set(data ?? []); this.loading.set(false); },
        error: (err) => { console.error(err); this.loading.set(false); },
      });
  }
 
  // ---------------------------------------------------------------- attachments
 
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
 
    // Reject duplicates by file name.
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
 
      this.http.post(`${environment.apiURL}/BendPrc/UploadFiles`, frmData, {
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
 
    this.http.post(`${environment.apiURL}/BendPrc/UploadFiles`, frmData, {
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
 
  // ---------------------------------------------------------------- submit
 
  onFormSubmit(_form: NgForm): void {
    const parts = this.partDtsList();
    if (parts == null) {
      alert('Please Search Process Details');
      return;
    }
 
    // Stock check only for new processes.
    if (this.strPfbCode === 'NEW') {
      const short = parts.find((item) => item.BatchQty > item.StkQty);
      if (short) {
        alert('Insufficient Stk For Part ' + short.Part);
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

    // The C# DTO has every numeric field typed as `string` and
    // CatID / BOMcode are marked [Required], so we never send null or
    // undefined — fall back to '' / '0' so model binding succeeds.
    const payload: IbendingprcSave = {
      EmpCode:        this.empCode         ?? '',
      PCCode_Act:     this.PC,
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
      BOMcode:        this.bomCode         ?? '0',
      PrcDts:         prcDts                ?? '',
      Remark:         (this.lblSaveCaption === 'End' ? 'End' : 'Nil'),
      AttachFileDts:  attachFileDts.trim(),
      CatID:          this.benCatID         ?? '0',
    };
 
    this.loading.set(true);
    // Remember whether this submit was a normal Submit or an End,
    // so the result popup can show the right title / message.
    const action: 'Submit' | 'End' = this.lblSaveCaption === 'End' ? 'End' : 'Submit';

    this.api.postBendSave(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msg) => {
          this.loading.set(false);
          const message = (msg ?? '').trim();
          // The controller can return Ok() with a validation message
          // (e.g. "Insufficient Stock ..."), so a 200 may still be a
          // logical failure. Inspect the body to decide.
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

  // ---------------------------------------------------------------- result popup

  /**
   * Recognises a logical failure that the API returned with a 200 OK
   * status — e.g. "Insufficient Stock For Consumable ..." — so the
   * popup can show the red error variant instead of green success.
   */
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

  /** Opens the result popup with stage-appropriate title + message. */
  private openResultPopup(action: 'Submit' | 'End', message: string, isError = false): void {
    this.resultAction = action;
    this.resultTitle = isError
      ? (action === 'End' ? 'End Failed' : 'Submit Failed')
      : (action === 'End' ? 'Bending Process Ended' : 'Bending Process Submitted');
    this.resultMessage = message || (isError
      ? 'Operation failed.'
      : `${action} completed successfully.`);
    this.showResultPopup = true;
  }

  /** Closes the popup and reloads the Bending Maker page so all dropdowns reset. */
  closeResultPopup(): void {
    this.showResultPopup = false;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/canopy-process/bending-maker']);
    });
  }

  // ---------------------------------------------------------------- reset helpers
 
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
    this.partDtsList.set(null);
  }

}
