import { Component, OnInit, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { Router } from '@angular/router';

import { SheetMetalReverseProcessService } from './sheet-metal-reverse-process.service';
import { CanopyProcessService } from '../canopy-process.service';
import { IcpyCatagory }             from './Model/cpyCatagory';
import { IcpyreverseloadPcCode }    from './Model/cpyreverseloadPcCode';
import { IcpyreverseloadTransType } from './Model/cpyreverseloadTransType';
import { IcpyreverseDts }           from './Model/cpyreverseDts';
import { ICpyReverseSave }          from './Model/cpyreverseSave';
import { IToEmpNamePCCode } from '../sheet-metal-jobcard-checker/Model/ToEmpNamePCCode';

interface ProductionItem {
  id: number;
  name: string;
  selected: boolean;
  description: string;
  assignTo: string;
}

@Component({
  selector: 'app-sheet-metal-reverse-process',
  standalone: false,
  templateUrl: './sheet-metal-reverse-process.component.html',
  styleUrl: './sheet-metal-reverse-process.component.scss'
})
export class SheetMetalReverseProcessComponent implements OnInit {

  // ---- Injected services ----
  private readonly api = inject(SheetMetalReverseProcessService);
  private readonly canopyService = inject(CanopyProcessService);
  private readonly router = inject(Router);

  /** Drives the in-template loading overlay (replaces ngx-spinner). */
  isLoading = false;

  today = '';
  PC = '';
  isShowForm = true;

  // ---- Dropdowns ----
  CatagoryTypelist: IcpyCatagory[] = [];
  PCCodeList: IcpyreverseloadPcCode[] = [];
  TransTypeList: IcpyreverseloadTransType[] = [];

  selectedCatagory = '';
  selectedPC = '';
  selectedTransType = '0';

  // ---- Grid ----
  ReverseDetailsList: IcpyreverseDts[] | null = null;

  // ---- Row detail popup (opened on row click) ----
  showRowPopup = false;
  selectedRow: IcpyreverseDts | null = null;
  rowRemark = '';

  // ---- 6M production (inside the row popup) ----
  productionItems: ProductionItem[] = [];
  productionOptions: { ID: number; Name: string }[] = [];
  ToEmpNamePCode: IToEmpNamePCCode[] = [];

  // ---- Result popup ----
  showResultPopup = false;
  resultTitle = '';
  resultMessage = '';
  resultOk = true;

  // ---- Current user (from localStorage) ----
  EmpCode = '';
  PCName = '';
  PCOld = '';
  LoginType = '';
  LoginCompCode = '';

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
    if (!this.isShowForm) {
      this.router.navigate(['/']);
      return;
    }
    this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
    this.getCatagoryType();
  }

  // ============ Dropdown cascade ============

  getCatagoryType(): void {
    this.isLoading = true;
    this.api.getCatagoryType().subscribe({
      next: (data) => { this.CatagoryTypelist = data ?? []; this.isLoading = false; },
      error: (err) => { console.error(err); this.isLoading = false; }
    });
  }

  /** Category change → reset PC, reload PC list for the category + trans types. */
  onCategoryChange(): void {
    this.selectedPC = '';
    this.PCCodeList = [];
    this.ReverseDetailsList = null;
    if (this.selectedCatagory) {
      this.getPCcode(this.selectedCatagory);
    }
  }

  getPCcode(catId: string): void {
    this.isLoading = true;
    this.api.getPCcode(catId).subscribe({
      next: (data) => { this.PCCodeList = data ?? []; this.isLoading = false; },
      error: (err) => { console.error(err); this.isLoading = false; }
    });
    this.getTransType();
  }

  getTransType(): void {
    this.api.getTransType().subscribe({
      next: (data) => { this.TransTypeList = data ?? []; },
      error: (err) => { console.error(err); }
    });
  }

  // ============ Search ============

  onClickSearch(): void {
    if (!this.selectedPC) {
      alert('Please select ProfitCenter');
      return;
    }
    this.isLoading = true;
    this.api.getReversCpyDetails(this.selectedPC, this.selectedCatagory).subscribe({
      next: (data) => { this.ReverseDetailsList = data ?? []; this.isLoading = false; },
      error: (err) => { console.error(err); this.isLoading = false; }
    });
  }

  // ============ Row detail popup ============

  /** Row click → open the detail popup for that row (with the 6M grid). */
  openRowPopup(row: IcpyreverseDts): void {
    this.selectedRow = row;
    this.rowRemark = '';
    this.productionItems = [];
    this.loadToEmpNamePCCode();
    this.load6M();
    this.showRowPopup = true;
  }

  closeRowPopup(): void {
    this.showRowPopup = false;
    this.selectedRow = null;
    this.rowRemark = '';
    this.productionItems = [];
  }

  // ============ 6M production grid ============

  load6M(): void {
    this.isLoading = true;
    this.canopyService.get6M().subscribe({
      next: (data: any[]) => {
        this.productionOptions = data ?? [];
        this.initializeProductionItems();
        this.isLoading = false;
      },
      error: (err) => { console.error(err); this.isLoading = false; }
    });
  }

  loadToEmpNamePCCode(): void {
    this.canopyService.getToEmpNamePCCode().subscribe({
      next: (data: IToEmpNamePCCode[]) => {
        this.ToEmpNamePCode = data ?? [];
        if (this.ToEmpNamePCode.length > 0) {
          const firstEmpCode = this.ToEmpNamePCode[0].ECode;
          this.productionItems.forEach((item) => {
            if (!item.assignTo) item.assignTo = firstEmpCode;
          });
        }
      },
      error: (err) => { console.error(err); }
    });
  }

  initializeProductionItems(): void {
    this.productionItems = this.productionOptions.map((option) => ({
      id: option.ID,
      name: option.Name,
      selected: false,
      description: '',
      assignTo: this.ToEmpNamePCode[0]?.ECode ?? ''
    }));
  }

  toggleProduction(item: ProductionItem, checked: boolean): void {
    item.selected = checked;
    if (!checked) {
      item.description = '';
      item.assignTo = 'None';
    }
  }

  /**
   * Submit is enabled when a remark is entered and *at least one* selected
   * 6M row has a Description filled and an Assign To that isn't "None".
   */
  canSubmit(): boolean {
    if (!this.rowRemark?.trim()) return false;

    return this.productionItems.some(item =>
      item.selected &&
      !!item.description && item.description.trim() !== '' &&
      !!item.assignTo && item.assignTo !== 'None' && item.assignTo !== '0' && item.assignTo !== ''
    );
  }

  private resolveAssignPccode(assignTo: string): string {
    if (!this.ToEmpNamePCode?.length) return '';
    const found = this.ToEmpNamePCode.find((x) => x.ECode === (assignTo || ''));
    return found ? found.Pccode : '';
  }

  // ============ Submit (single row from the popup) ============

  submitRow(): void {
    if (!this.selectedRow) return;

    if (!this.rowRemark?.trim()) {
      alert('Remark is required');
      return;
    }

    // Details = List<CpyRevDetail> for the clicked reverse row.
    const details = [{
      CPCode: this.selectedRow.CPCode,
      ProductCode: this.selectedRow.ProductCode,
      CatId: this.selectedRow.CatID
    }];

    // PCCode_Act = selected PC's PCCode; PCCode = its ParentDgPC.
    const selectedPcObj = this.PCCodeList.find(p => p.PCCode === this.selectedPC);

    // ProductionDetails = List<ProductionDetail> for the selected 6M rows.
    const productionDetails = this.productionItems
      .filter(item => item.selected)
      .map(item => ({
        Id: item.id,
        SixM: item.name,
        Description: item.description || '',
        AssignTo: item.assignTo || '',
        EmpPCCode: this.resolveAssignPccode(item.assignTo)
      }));

    const payload: ICpyReverseSave = {
      PCCode: selectedPcObj?.ParentDgPC ?? '',
      PCCode_Act: this.selectedPC,
      TransType: this.selectedTransType,
      EmpCode: this.EmpCode,
      Details: details,
      ProductionDetails: productionDetails
    };

    this.isLoading = true;
    this.api.postReverseSave(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.showRowPopup = false;
        const message = (response ?? '').trim();
        this.openResultPopup(message, !this.isFailureMessage(message));
      },
      error: (error) => {
        this.isLoading = false;
        console.error('API Error:', error);
        const apiMessage =
          (typeof error?.error === 'string' && error.error.trim()) ||
          error?.message ||
          'Something went wrong. Please try again.';
        this.openResultPopup(apiMessage, /*ok*/ false);
      }
    });
  }

  // ============ Result popup ============

  private isFailureMessage(message: string): boolean {
    if (!message) return false;
    const lower = message.toLowerCase();
    const failureSignals = [
      'insufficient', 'not enough', 'error', 'failed', 'fail',
      'invalid', 'cannot', "can't", 'unable', 'missing', 'duplicate',
      'already', 'not found', 'denied'
    ];
    return failureSignals.some(p => lower.includes(p));
  }

  private openResultPopup(message: string, ok: boolean): void {
    this.resultOk = ok;
    this.resultTitle = ok ? 'Reverse Process Submitted' : 'Submit Failed';
    this.resultMessage = message || (ok ? 'Submitted successfully.' : 'Operation failed.');
    this.showResultPopup = true;
  }

  /** Closes the popup; on success reloads the Reverse Process page. */
  closeResultPopup(): void {
    this.showResultPopup = false;
    if (this.resultOk) {
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate(['/canopy-process/sheet-metal-reverse-process']);
      });
    }
  }
}
