import { Component, OnInit, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { Router } from '@angular/router';

import { CanopyProcessService } from '../canopy-process.service';
import { CncCheckerService } from './cncchecker.service';
import { IcncCheckerprcDts } from './Model/cncCheckerprcDts';
import { IcnccheckerprcSave } from './Model/cncCheckerprcSave';
import { IToEmpNamePCCode } from '../sheet-metal-jobcard-checker/Model/ToEmpNamePCCode';

interface ProductionItem {
  id: number;
  name: string;
  selected: boolean;
  description: string;
  assignTo: string;
}

@Component({
  selector: 'app-cnc-checker',
  standalone: false,
  templateUrl: './cnc-checker.component.html',
  styleUrl: './cnc-checker.component.scss'
})
export class CNCCheckerComponent implements OnInit {

  // ---- Injected services (Angular 19 inject API) ----
  // canopyService: shared helpers (get6M, getToEmpNamePCCode).
  // cncService:    CNC-checker–specific endpoints (plan load, grid, save).
  private readonly canopyService = inject(CanopyProcessService);
  private readonly cncService = inject(CncCheckerService);
  private readonly router = inject(Router);

  /** Drives the in-template loading overlay (replaces ngx-spinner). */
  isLoading = false;

  // ---- UI / state ----
  optionCollection: string[] = [];
  dis = false;
  showMessage = false;
  message = '';
  errorMessage: any;
  isShowForm = true;

  today = '';

  // ---- Filter row ----
  PlanCode: string = '';
  selectedPlanCode: string = '';
  planCodes: { id: number; name: string }[] = [];

  // ---- Grid ----
  CncCheckerprcDetailsList: IcncCheckerprcDts[] = [];


   // ---- Line dropdown (GetLineByProcess) ----
  lineList: any[] = [];
  selectedLine: string = ''; 
  // ---- 6M popup ----
  showPopup = false;
  selectedCNC: any;
  remarks = '';
  showProductionModal = false;
  productionItems: ProductionItem[] = [];
  productionOptions: { ID: number; Name: string }[] = [];
  ToEmpNamePCode: IToEmpNamePCCode[] = [];
  assignTo = '';
  EmpPCCode = '';
  PCCode = ' ';

  // ---- Save payload scaffold ----
  objtempCNCCheckerprc: IcnccheckerprcSave = {} as IcnccheckerprcSave;

  // ---- Result popup (shown after Auth / Reject) ----
  showResultPopup = false;
  resultTitle = '';
  resultMessage = '';
  resultAction: 'AUTH' | 'REJECT' = 'AUTH';

  // ---- Current user (loaded from localStorage) ----
  LoginCompCode = '';
  EmpCode = '';
  PC = '';
  PCName = '';
  PCOld = '';
  FormName = '';
  FormRightId = '';
  LoginType = '';

  constructor() {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    this.EmpCode       = (localStorage.getItem('employeeCode')     ?? '').trim();
    this.PCCode            = (localStorage.getItem('ProfitCenter')     ?? '').trim();
    this.PCName        = (localStorage.getItem('profitCenterName') ?? '').trim();
    this.LoginType     = (localStorage.getItem('loginType')        ?? '').trim();
    this.LoginCompCode = (localStorage.getItem('companyId')        ?? '').trim();
    this.PCOld         = (localStorage.getItem('ProfitCenter_old') ?? '').trim();
  }

  ngOnInit(): void {
    if (this.isShowForm) {
      this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
      this.optionCollection = ['', ''];
      this.dis = false;
      //this.loadPlanCodes();
      this.loadLineByProcess();
    } else {
      this.EmpCode = '';
      this.FormName = '';
      this.FormRightId = '';
      this.LoginCompCode = '';
      this.isLoading = false;
      this.router.navigate(['/']);
    }
  }


/** Loads the lines for this process. ProcessName is hard-coded to "CNC". */
  loadLineByProcess(): void {
    this.canopyService.GetLineByProcess('CNC', this.LoginCompCode ).subscribe({
      next: (data) => { this.lineList = data ?? []; },
      error: (err) => { console.error(err); }
    });
  }

  /** On line change: use the selected line's LineWisePC as this.PC, then load plan codes. */
  onLineSelect(lineWisePC: string): void {
    this.selectedLine = lineWisePC;
    this.PC = lineWisePC;
    // Line change → reset PlanCode + grid, then reload plan codes for the new PC.
    this.PlanCode = '';
    this.selectedPlanCode = '';
    this.planCodes = [];
    this.CncCheckerprcDetailsList = [];
    this.loadPlanCodes();
  }


  // ============ Filter / Grid ============

  /** Loads available plan codes for the selected line's PC. */
  private loadPlanCodes(): void {
    this.isLoading = true;
    this.cncService.GetCNCCheckerCPPlanLoad(this.PC).subscribe({
      next: (data: any[]) => {
        this.planCodes = (data ?? []).map((item: any, index: number) => ({
          id: index + 1,
          name: item.CPCode
        }));
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  onPlanCodeChange(PlanCode: string): void {
    this.CncCheckerprcDetailsList = [];
    this.selectedPlanCode = PlanCode;
  }

  onClickSearch(): void {
    if (!this.selectedPlanCode?.trim()) {
      alert('Please select Plan Code');
      return;
    }

    this.isLoading = true;
    this.cncService
      .GetCNC_chekerDetails(this.LoginCompCode, this.selectedPlanCode, this.PC)
      .subscribe({
        next: (data: IcncCheckerprcDts[]) => {
          this.CncCheckerprcDetailsList = data ?? [];
          this.isLoading = false;
        },
        error: (error) => {
          console.log(error);
          this.isLoading = false;
        }
      });
  }

  // ============ 6M Popup ============

  openCPCodePopup(cnc: IcncCheckerprcDts): void {
    this.selectedCNC = cnc;
    this.loadToEmpNamePCCode();
    this.load6M();
    this.showPopup = true;
  }

  closePopup(): void {
    this.showPopup = false;
    this.initializeProductionItems();
    this.remarks = '';
  }

  closeModal(): void {
    this.showProductionModal = false;
  }

  get selectedProduction(): string[] {
    const selected = this.productionItems.filter(item => item.selected);
    return (selected.length ? selected : this.productionItems).map(item => item.name);
  }

  initializeProductionItems(): void {
    this.productionItems = this.productionOptions.map(option => ({
      id: option.ID,
      name: option.Name,
      selected: true,
      description: '',
      assignTo: ''
    }));
  }

  loadExistingData(): void {
    const dg = this.selectedCNC;
    if (!dg) return;

    if (dg.ProductionDetails) {
      try {
        const details = typeof dg.ProductionDetails === 'string'
          ? JSON.parse(dg.ProductionDetails)
          : dg.ProductionDetails;
        details.forEach((detail: any) => {
          const item = this.productionItems.find(p => p.name === detail.name);
          if (item) {
            item.selected = true;
            item.description = detail.description || '';
            item.assignTo = detail.assignTo || '';
          }
        });
      } catch (e) {
        console.warn('Could not parse ProductionDetails:', e);
      }
    } else if (dg.ProductionType) {
      const existingTypes = String(dg.ProductionType)
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
      existingTypes.forEach((typeName: string) => {
        const item = this.productionItems.find(p => p.name === typeName);
        if (item) item.selected = true;
      });
    }

    this.remarks = dg.Remarks || '';
  }

  toggleProduction(item: ProductionItem, checked: boolean): void {
    item.selected = checked;
    if (!checked) {
      item.description = '';
      item.assignTo = 'None';
    }
  }

  toggleSelectAll(checked: boolean): void {
    this.productionItems.forEach(item => {
      item.selected = checked;
      if (!checked) {
        item.description = '';
        item.assignTo = 'None';
      }
    });
  }

  clearAll(): void {
    this.productionItems.forEach(item => {
      item.selected = false;
      item.description = '';
      item.assignTo = '';
    });
  }

  hasSelectedItems(): boolean {
    return this.productionItems.some(item => item.selected);
  }

  load6M(): void {
    this.isLoading = true;
    this.canopyService.get6M().subscribe({
      next: (data: any[]) => {
        this.productionOptions = data ?? [];
        this.initializeProductionItems();
        this.loadExistingData();
        this.isLoading = false;
      },
      error: (error) => {
        console.log(error);
        this.isLoading = false;
      }
    });
  }

  loadToEmpNamePCCode(): void {
    this.isLoading = true;
    this.canopyService.getToEmpNamePCCode().subscribe({
      next: (data: IToEmpNamePCCode[]) => {
        this.ToEmpNamePCode = data ?? [];
        if (this.ToEmpNamePCode.length > 0) {
          const firstEmpCode = this.ToEmpNamePCode[0].ECode;
          this.productionItems.forEach(item => {
            if (!item.assignTo) item.assignTo = firstEmpCode;
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.log(error);
        this.isLoading = false;
      }
    });
  }

  onToEmpChange(selectedEmpCode: string): void {
    const selectedEmp = this.ToEmpNamePCode.find(emp => emp.ECode === selectedEmpCode);
    this.EmpPCCode = selectedEmp ? selectedEmp.Pccode : '';
  }

  // ============ Auth / Reject (shared builder + submitter) ============

  /** Shared payload builder — old code duplicated this between Auth and Reject. */
  private buildPayload(status: 'AUTH' | 'REJECT'): IcnccheckerprcSave {
    const selectedItems = this.productionItems.filter(item => item.selected);

    this.selectedCNC.ProductionType = selectedItems.map(item => item.name).join(', ');

    const productionData = selectedItems.map(item => {
      const found = this.ToEmpNamePCode?.find(x => x.ECode === (item.assignTo || ''));
      const assignToPccode = found ? found.Pccode : '';
      return [
        item.id.toString(),
        item.name,
        item.description || '',
        item.assignTo || (status === 'REJECT' ? '0' : ''),
        assignToPccode
      ].join('@#@');
    });

    this.selectedCNC.ProductionDetails = productionData.join('@@#@@');

    // Line-wise PC (same as cnc-maker submit):
    // PCCode_Act = selected line's LineWisePC (this.PC), PCCode = its ParentDgPC.
    const selectedLineObj = this.lineList.find(l => l.LineWisePC === this.selectedLine);

    return {
      Code: '0',
      EmpCode: this.EmpCode,
      PCCode_Act: this.PC,
      PCCode: selectedLineObj?.ParentDgPC ?? '',
      CompCode: this.LoginCompCode,
      pfbCode: this.selectedCNC.PFBCode,
      PlanCode: this.selectedCNC.CanopyPlanCode,
      Sheetpartcode: this.selectedCNC.Sheetpartcode,
      CatID: this.selectedCNC.CatID,
      ProductCode: this.selectedCNC.ProductCode,
      // C# DTO has `string BatchQty` — must serialise as a string,
      // not a number, otherwise the body fails to deserialise and
      // the controller reports "CpyPrcCNCReq is required".
      BatchQty: String(this.selectedCNC.NestingForQty ?? 0),
      productionType: this.selectedCNC.ProductionType,
      productionDetails: this.selectedCNC.ProductionDetails,
      status,
      details: selectedItems.map(item => {
        const found = this.ToEmpNamePCode?.find(x => x.ECode === (item.assignTo || ''));
        return {
          id: item.id,
          sixM: item.name,
          description: item.description || '',
          assignTo: item.assignTo || (status === 'REJECT' ? '0' : ''),
          assignToPccode: found ? found.Pccode : ''
        };
      })
    };
  }

  onAccept(): void {
    if (!this.selectedCNC) { alert('Header data not loaded'); return; }
    const selectedItems = this.productionItems.filter(item => item.selected);
    if (!selectedItems.length) { alert('Please select at least one item'); return; }
    this.submitChecker('AUTH');
  }

  onReject(): void {
    if (!this.selectedCNC) { alert('Header data not loaded'); return; }
    const selectedItems = this.productionItems.filter(item => item.selected);
    if (!selectedItems.length) { alert('Please select at least one 6M Production Type'); return; }
    this.submitChecker('REJECT');
  }

  private submitChecker(status: 'AUTH' | 'REJECT'): void {
    const payload = this.buildPayload(status);
    console.log(`${status} Payload:`, payload);

    this.isLoading = true;
    this.cncService.postCNC_chekerSave(payload).subscribe({
      next: (response: string) => {
        this.isLoading = false;
        const message = (response ?? '').trim();
        // The controller returns Ok() even when the API reports a
        // logical failure ("Insufficient Stock ..."), so detect it.
        const isFailure = this.isFailureMessage(message);
        this.openResultPopup(status, message, isFailure);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('API Error:', error);
        const apiMessage =
          (typeof error?.error === 'string' && error.error.trim()) ||
          error?.message ||
          'Something went wrong. Please try again.';
        this.openResultPopup(status, apiMessage, /*isError*/ true);
        this.errorMessage = error;
      }
    });
  }

  canReject(): boolean {
    const selectedItems = this.productionItems.filter(item => item.selected);
    if (selectedItems.length === 0) return false;

    const allDescriptionsFilled = selectedItems.every(item =>
      item.description && item.description.trim() !== ''
    );
    const hasAtLeastOneEmployee = selectedItems.some(item =>
      item.assignTo && item.assignTo !== 'None' && item.assignTo !== '0' && item.assignTo !== ''
    );
    return allDescriptionsFilled && hasAtLeastOneEmployee;
  }

  canAuth(): boolean {
    const selectedItems = this.productionItems.filter(item => item.selected);
    if (selectedItems.length === 0) return false;

    return selectedItems.every(item =>
      (item.description && item.description.trim() !== '') &&
      (!item.assignTo || item.assignTo === 'None' || item.assignTo === '0' || item.assignTo === '')
    );
  }

  // ============ Result popup ============

  /**
   * Detects logical failures returned with HTTP 200 — e.g.
   * "Insufficient Stock ..." — so the popup uses the red variant.
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

  private openResultPopup(action: 'AUTH' | 'REJECT', message: string, isError = false): void {
    this.resultAction = action;
    this.resultTitle = isError
      ? (action === 'REJECT' ? 'Reject Failed' : 'Auth Failed')
      : (action === 'REJECT' ? 'Job Card Rejected' : 'Job Card Authorized');
    this.resultMessage = message || (isError
      ? 'Operation failed.'
      : (action === 'REJECT' ? 'Rejected successfully.' : 'Authorized successfully.'));
    this.showResultPopup = true;
  }

  /** Closes the popup and reloads the CNC Checker page so dropdowns reset. */
  closeResultPopup(): void {
    this.showResultPopup = false;
    this.closePopup();
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/canopy-process/cnc-checker']);
    });
  }
}
