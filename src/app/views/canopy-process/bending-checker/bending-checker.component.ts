import { Component, OnInit, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { Router } from '@angular/router';

import { CanopyProcessService } from '../canopy-process.service';
import { BendingCheckerService } from './bendingchecker.service';
import { Ibendingcheckerprcdts } from './Model/bendingcheckerprcdts';
import { IbendingcheckerprcSave } from './Model/bendingcheckerprcsave';
import { IToEmpNamePCCode } from '../sheet-metal-jobcard-checker/Model/ToEmpNamePCCode';

interface ProductionItem {
  id: number;
  name: string;
  selected: boolean;
  description: string;
  assignTo: string;
}

@Component({
  selector: 'app-bending-checker',
  standalone: false,
  templateUrl: './bending-checker.component.html',
  styleUrl: './bending-checker.component.scss'
})
export class BendingCheckerComponent implements OnInit {

  // ---- Injected services ----
  // canopyService:    shared helpers (get6M, getToEmpNamePCCode).
  // bendCheckService: bending-checker–specific endpoints.
  private readonly canopyService = inject(CanopyProcessService);
  private readonly bendCheckService = inject(BendingCheckerService);
  private readonly router = inject(Router);

  /** Drives the in-template loading overlay (replaces ngx-spinner). */
  isLoading = false;

  // ---- UI / state ----
  errorMessage: any;
  isShowForm = true;
  today = '';

  // ---- Line dropdown (GetLineByProcess) ----
  lineList: any[] = [];
  selectedLine: string = '';

  // ---- Filter row ----
  PlanCode: string = '';
  selectedPlanCode: string = '';
  planCodes: { id: number; name: string }[] = [];

  // ---- Grid ----
  BendingCheckerprcDetailsList: Ibendingcheckerprcdts[] = [];

  // ---- 6M popup ----
  showPopup = false;
  showProductionModal = false;
  selectedBending: Ibendingcheckerprcdts | null = null;
  selectedDG: any;
  remarks = '';
  productionItems: ProductionItem[] = [];
  productionOptions: { ID: number; Name: string }[] = [];
  ToEmpNamePCode: IToEmpNamePCCode[] = [];
  assignTo = '';
  EmpPCCode = '';

  // ---- Result popup (shown after AUTH / REJECT) ----
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
    this.PC            = (localStorage.getItem('ProfitCenter')     ?? '').trim();
    this.PCName        = (localStorage.getItem('profitCenterName') ?? '').trim();
    this.LoginType     = (localStorage.getItem('loginType')        ?? '').trim();
    this.LoginCompCode = (localStorage.getItem('companyId')        ?? '').trim();
    this.PCOld         = (localStorage.getItem('ProfitCenter_old') ?? '').trim();
  }

  ngOnInit(): void {
    if (this.isShowForm) {
      this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
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

  // ============ Line dropdown ============

  /** Loads the lines for this process. ProcessName is hard-coded to "Bending". */
  loadLineByProcess(): void {
    this.canopyService.GetLineByProcess('Bending', this.LoginCompCode).subscribe({
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
    this.BendingCheckerprcDetailsList = [];
    this.loadPlanCodes();
  }

  // ============ Filter / Grid ============

  /** Loads available plan codes for the selected line's PC. */
  private loadPlanCodes(): void {
    this.isLoading = true;
    this.bendCheckService.GetBendingCheckerCPPlanLoad(this.PC).subscribe({
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

  onPlanCodeChange(planCode: string): void {
    this.BendingCheckerprcDetailsList = [];
    this.selectedPlanCode = planCode;
  }

  onClickSearch(): void {
    if (!this.selectedPlanCode?.trim()) {
      alert('Please select Plan Code');
      return;
    }

    this.isLoading = true;
    this.bendCheckService
      .GetBending_chekerDetails(this.LoginCompCode, this.selectedPlanCode, this.PC)
      .subscribe({
        next: (data: Ibendingcheckerprcdts[]) => {
          this.BendingCheckerprcDetailsList = data ?? [];
          this.isLoading = false;
        },
        error: (error) => {
          console.error(error);
          this.isLoading = false;
        }
      });
  }

  // ============ 6M Popup ============

  openCPCodePopup(bending: Ibendingcheckerprcdts): void {
    this.selectedBending = bending;
    this.selectedDG = bending; // alias used by loadExistingData
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
    const selected = this.productionItems.filter((item) => item.selected);
    return (selected.length ? selected : this.productionItems).map((item) => item.name);
  }

  initializeProductionItems(): void {
    this.productionItems = this.productionOptions.map((option) => ({
      id: option.ID,
      name: option.Name,
      selected: true,
      description: '',
      assignTo: ''
    }));
  }

  loadExistingData(): void {
    const dg = this.selectedDG ?? this.selectedBending;
    if (!dg) return;

    if (dg.ProductionDetails) {
      try {
        const details =
          typeof dg.ProductionDetails === 'string'
            ? JSON.parse(dg.ProductionDetails)
            : dg.ProductionDetails;

        details.forEach((detail: any) => {
          const item = this.productionItems.find((p) => p.name === detail.name);
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
        const item = this.productionItems.find((p) => p.name === typeName);
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
    this.productionItems.forEach((item) => {
      item.selected = checked;
      if (!checked) {
        item.description = '';
        item.assignTo = 'None';
      }
    });
  }

  clearAll(): void {
    this.productionItems.forEach((item) => {
      item.selected = false;
      item.description = '';
      item.assignTo = '';
    });
  }

  hasSelectedItems(): boolean {
    return this.productionItems.some((item) => item.selected);
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
        console.error(error);
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
          this.productionItems.forEach((item) => {
            if (!item.assignTo) item.assignTo = firstEmpCode;
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error(error);
        this.isLoading = false;
      }
    });
  }

  onToEmpChange(selectedEmpCode: string): void {
    const selectedEmp = this.ToEmpNamePCode.find((emp) => emp.ECode === selectedEmpCode);
    this.EmpPCCode = selectedEmp ? selectedEmp.Pccode : '';
  }

  // ============ Auth / Reject (shared submit) ============

  onAccept(): void { this.submit('AUTH'); }
  onReject(): void { this.submit('REJECT'); }

  private submit(status: 'AUTH' | 'REJECT'): void {
    if (!this.selectedBending) {
      alert('Header data not loaded');
      return;
    }

    const selectedItems = this.productionItems.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      alert(
        status === 'AUTH'
          ? 'Please select at least one item'
          : 'Please select at least one 6M Production Type'
      );
      return;
    }

    const assignFallback = status === 'AUTH' ? '' : '0';

    this.selectedBending.ProductionType = selectedItems.map((item) => item.name).join(', ');

    const productionData = selectedItems.map((item) =>
      [
        item.id.toString(),
        item.name,
        item.description || '',
        item.assignTo || assignFallback,
        this.resolveAssignPccode(item.assignTo)
      ].join('@#@')
    );
    this.selectedBending.ProductionDetails = productionData.join('@@#@@');

    // Line-wise PC (same as cnc-maker / cnc-checker submit):
    // PCCode_Act = selected line's LineWisePC (this.PC), PCCode = its ParentDgPC.
    const selectedLineObj = this.lineList.find((l) => l.LineWisePC === this.selectedLine);

    // C# DTO has every numeric field typed as string and several
    // required fields, so guard each one with safe defaults.
    const payload: IbendingcheckerprcSave = {
      Code: '0',
      EmpCode: this.EmpCode ?? '',
      PCCode_Act: this.PC ?? '',
      PCCode: selectedLineObj?.ParentDgPC ?? '',
      CompCode: this.LoginCompCode ?? '',
      pfbCode: this.selectedBending.PFBCode ?? '',
      PlanCode: this.selectedBending.CanopyPlanCode ?? '',
      Sheetpartcode: this.selectedBending.Sheetpartcode ?? '',
      CatID: String(this.selectedBending.CatID ?? '0'),
      ProductCode: this.selectedBending.ProductCode ?? '',
      BatchQty: String(this.selectedBending.NestingForQty ?? 0),
      productionType: this.selectedBending.ProductionType ?? '',
      productionDetails: this.selectedBending.ProductionDetails ?? '',
      status,
      details: selectedItems.map((item) => ({
        id: item.id,
        sixM: item.name,
        description: item.description || '',
        assignTo: item.assignTo || assignFallback,
        assignToPccode: this.resolveAssignPccode(item.assignTo)
      }))
    };

    this.isLoading = true;
    this.bendCheckService.postBending_chekerSave(payload).subscribe({
      next: (response: string) => {
        this.isLoading = false;
        const message = (response ?? '').trim();
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

  private resolveAssignPccode(assignTo: string): string {
    if (!this.ToEmpNamePCode?.length) return '';
    const found = this.ToEmpNamePCode.find((x) => x.ECode === (assignTo || ''));
    return found ? found.Pccode : '';
  }

  canReject(): boolean {
    const selectedItems = this.productionItems.filter((item) => item.selected);
    if (selectedItems.length === 0) return false;

    const allDescriptionsFilled = selectedItems.every(
      (item) => item.description && item.description.trim() !== ''
    );
    const hasAtLeastOneEmployee = selectedItems.some(
      (item) =>
        item.assignTo &&
        item.assignTo !== 'None' &&
        item.assignTo !== '0' &&
        item.assignTo !== ''
    );
    return allDescriptionsFilled && hasAtLeastOneEmployee;
  }

  canAuth(): boolean {
    const selectedItems = this.productionItems.filter((item) => item.selected);
    if (selectedItems.length === 0) return false;

    return selectedItems.every(
      (item) =>
        item.description &&
        item.description.trim() !== '' &&
        (!item.assignTo ||
          item.assignTo === 'None' ||
          item.assignTo === '0' ||
          item.assignTo === '')
    );
  }

  // ============ Result popup ============

  /**
   * Recognises a logical failure that the API returned with a 200 OK
   * status — e.g. "Insufficient Stock ..." — so the popup can show
   * the red error variant instead of green success.
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
      : (action === 'REJECT' ?  'Bending process Rejected' : 'Bending process Authorized');
    this.resultMessage = message || (isError
      ? 'Operation failed.'
      : (action === 'REJECT' ? 'Rejected successfully.' : 'Authorized successfully.'));
    this.showResultPopup = true;
  }

  /** Closes the popup and reloads the Bending Checker page so dropdowns reset. */
  closeResultPopup(): void {
    this.showResultPopup = false;
    this.closePopup();
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/canopy-process/bending-checker']);
    });
  }
}
