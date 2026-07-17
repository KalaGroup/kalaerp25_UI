import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { formatDate } from '@angular/common';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { CanopyProcessService } from '../canopy-process.service';
import { IJobcardCpyChekerDts } from './Model/jobCard_Cpy_chekerDts';
import { IToEmpNamePCCode } from './Model/ToEmpNamePCCode';
import { IRejectPayload } from './Model/jobcard_Cpy_chekerSave';

interface ProductionItem {
  id: number;
  name: string;
  selected: boolean;
  description: string;
  assignTo: string;
}

@Component({
  selector: 'app-sheet-metal-jobcard-checker',
  standalone: false,
  templateUrl: './sheet-metal-jobcard-checker.component.html',
  styleUrl: './sheet-metal-jobcard-checker.component.scss'
})
export class SheetMetalJobcardCheckerComponent implements OnInit {

  // Properties
  optionCollection: string[] = [];
  dis: boolean = false;
  today: string = '';
  PC: string = ' ';
  SheetMetalJobcardCheckerDetailsList: IJobcardCpyChekerDts[] = [];
  PartCode: string = '-';
  errorMessage: any;
  LoginCompCode: string = '';
  EmpCode: string = '';
  FormName: string = '';
  PCName: string = '';
  FormRightId: string = '';
  LoginType: string = '';
  isShowForm: boolean = true;

  PlanCode: string = '';
  planCodes: { id: number; name: string }[] = [];
  selectedPlanCode: string = ' ';

  showPopup = false;
  selectedDG: any;
  remarks: string = '';
  showProductionModal: boolean = false;
  productionItems: ProductionItem[] = [];
  productionOptions: { ID: number; Name: string }[] = [];
  ToEmpNamePCode: IToEmpNamePCCode[] = [];
  assignTo: string = '';
  EmpPCCode: string = '';
  isLoading: boolean = false;

  // ===== Result popup (shown after AUTH / REJECT) — same pattern as bending-checker =====
  showResultPopup = false;
  resultTitle = '';
  resultMessage = '';
  resultAction: 'AUTH' | 'REJECT' = 'AUTH';

  // ===== Checker Done Report + QR =====
  @ViewChild('qrHost') qrHost?: ElementRef<HTMLDivElement>;
  reportList: IJobcardCpyChekerDts[] = [];
  showQrPopup = false;
  qrPlan: IJobcardCpyChekerDts | null = null;
  qrValue = '';

  // ===== Stage Sheet Popup (CNC / Bending / Fabrication / PowderCoating) =====
  showStagePopup = false;
  stagePlan: IJobcardCpyChekerDts | null = null;
  stageName = '';
  stageRows: any[] = [];
  isStageLoading = false;

  /**
   * Column schema per stage. The SrNo and QR Code columns are added
   * automatically around these data columns by the template and PDF.
   */
  private readonly STAGE_COLUMNS: Record<string, Array<{ key: string; label: string; type?: 'num'; width?: number; concatKey?: string; reverseArrow?: boolean }>> = {
    CNC: [
      // "Process Part" = Sheet description concatenated with its SheetCode.
      { key: 'Sheet',           label: 'Process Part',    width: 200, concatKey: 'SheetCode' },
      { key: 'Thickness',       label: 'Thk',             type: 'num', width: 40 },
      { key: 'CatagoryName',    label: 'category ',        width: 80 },
      { key: 'SerialNo',        label: 'SrNo',            type: 'num', width: 55 },
   //   { key: 'MachinePartCode', label: 'MachinePartCode', width: 100 },
      // Supplier is bound to the data; the remaining empty keys are
      // manual-fill columns the operator writes by hand on the printed PDF.
      { key: 'Supplier',        label: 'Supplier',        width: 160 },
      { key: '',                label: 'Machine',         width: 120 },
      { key: '',                label: 'Start Date',      width: 90 },
      { key: '',                label: 'End Date',        width: 90 }
    ],
    Bending: [
      // "Process Part" shows the KitCode value reordered as "desc -->partcode".
      { key: 'KitCode',   label: 'Process Part', width: 250, reverseArrow: true },
      { key: 'CatagoryName',     label: 'category ',    width: 80 },
      // Manual-fill columns (operator writes by hand on the printed PDF).
      { key: '',          label: 'Machine',     width: 120 },
      { key: '',          label: 'Start Date',  width: 90 },
      { key: '',          label: 'End Date',    width: 90 }
    ],
    Fabrication: [
      // "Process Part" shows the KitCode value reordered as "desc -->partcode".
      { key: 'KitCode',   label: 'Process Part', width: 250, reverseArrow: true },
      { key: 'CatagoryName',     label: 'category ',    width: 80  },
      { key: 'Qty',       label: 'Qty',         type: 'num', width: 50 },
      // Supplier is bound to the data (SName); the rest are manual-fill.
      { key: 'SName',     label: 'Supplier',    width: 160 },
      { key: '',          label: 'Machine',     width: 120 },
      { key: '',          label: 'Start Date',  width: 90 },
      { key: '',          label: 'End Date',    width: 90 }
    ],
    PowderCoating: [
      // "Process Part" = KitDesc concatenated with KitCode as "desc -->partcode".
      { key: 'KitDesc',   label: 'Process Part', width: 250, concatKey: 'KitCode' },
      { key: 'CatagoryName',     label: 'category ',    width: 80  },
      // Supplier is bound to the data (SName); the rest are manual-fill.
      { key: 'SName',     label: 'Supplier',    width: 160 },
      { key: '',          label: 'Machine',     width: 120 },
      { key: '',          label: 'Start Date',  width: 90 },
      { key: '',          label: 'End Date',    width: 90 }
    ]
  };

  get currentStageColumns() {
    return this.STAGE_COLUMNS[this.stageName] ?? this.STAGE_COLUMNS['CNC'];
  }

  /** Loads an image (from assets) and returns it as a PNG data URL for jsPDF. */
  private loadImageDataUrl(url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  /** Trims literal 'null'/'Null' strings down to empty for display. */
  formatCellValue(v: any): string {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.toLowerCase() === 'null' ? '' : s;
  }

  /**
   * Value for a stage cell. When the column has a `concatKey` (e.g. CNC's
   * "Process Part"), it joins the main value with the secondary value as
   * "Sheet -->SheetCode".
   */
  stageCellValue(row: any, col: { key: string; concatKey?: string; reverseArrow?: boolean }): string {
    const main = this.formatCellValue(row[col.key]);

    // reverseArrow: value is "partcode-->desc"; display it as "desc -->partcode".
    if (col.reverseArrow && main.includes('-->')) {
      const idx = main.indexOf('-->');
      const left = main.slice(0, idx).trim();
      const right = main.slice(idx + 3).trim();
      return `${right} -->${left}`;
    }

    if (!col.concatKey) return main;
    const extra = this.formatCellValue(row[col.concatKey]);
    if (main && extra) return `${main} -->${extra}`;
    return main || extra;
  }

  constructor(
    private canopyService: CanopyProcessService,
    private router: Router
  ) {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    this.EmpCode       = (localStorage.getItem('employeeCode')     ?? '').trim();
    this.PC            = (localStorage.getItem('ProfitCenter')     ?? '').trim();
    this.PCName        = (localStorage.getItem('profitCenterName') ?? '').trim();
    this.LoginType     = (localStorage.getItem('loginType')        ?? '').trim();
    this.LoginCompCode = (localStorage.getItem('companyId')        ?? '').trim();
  }

  ngOnInit(): void {
    this.isLoading = false;
    this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
    this.loadPlanCodes();
   this.loadCheckerDoneReport();
  }

  private loadPlanCodes(): void {
    this.isLoading = true;
    this.canopyService.GetCheckerCPPlanLoad().subscribe({
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
    this.SheetMetalJobcardCheckerDetailsList = [];
    this.selectedPlanCode = PlanCode;
  }

  onClickSearch(): void {
    if (!this.selectedPlanCode?.trim()) {
      alert('Please select Plan Code');
      return;
    }

    this.isLoading = true;
    this.canopyService
      .GetJobCardCpychecker(
        this.LoginCompCode,
        this.selectedPlanCode
      )
      .subscribe({
        next: (data: IJobcardCpyChekerDts[]) => {
          this.SheetMetalJobcardCheckerDetailsList = data;
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          console.log(error);
        }
      });

   // this.loadCheckerDoneReport();
  }

  /** Loads the checker-done plans into the report grid. */
  loadCheckerDoneReport(): void {
    this.canopyService
      .GetJobCardCpyCheckerDone()
      .subscribe({
        next: (data: IJobcardCpyChekerDts[]) => {
          this.reportList = data ?? [];
        },
        error: (error) => {
          this.reportList = [];
          console.log(error);
        }
      });
  }

  // ============ POPUP METHODS ============

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

  openCPCodePopup(dg: any): void {
    this.selectedDG = dg;
    console.log('Selected DG:', this.selectedDG);
    this.loadToEmpNamePCCode();
    this.load6M();
    this.showPopup = true;
  }

  loadExistingData(): void {
    const dg = this.selectedDG;
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
      const existingTypes = dg.ProductionType.toString()
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

  closePopup(): void {
    this.showPopup = false;
    this.initializeProductionItems();
    this.remarks = '';
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
        this.productionOptions = data;
        console.log('productionOptions', this.productionOptions);
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
        this.ToEmpNamePCode = data;
        if (this.ToEmpNamePCode?.length > 0) {
          const firstEmpCode = this.ToEmpNamePCode[0].ECode;
          this.productionItems.forEach(item => {
            if (!item.assignTo) {
              item.assignTo = firstEmpCode;
            }
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

  private buildPayload(status: 'AUTH' | 'REJECT'): IRejectPayload {
    const selectedItems = this.productionItems.filter(item => item.selected);

    this.selectedDG.ProductionType = selectedItems.map(item => item.name).join(', ');

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

    this.selectedDG.ProductionDetails = productionData.join('@@#@@');

    return {
      Code: '0',
      EmpCode: this.EmpCode,
      PCCode: this.PC,
      CompCode: this.LoginCompCode,
      planCode: this.selectedDG.CPCode,
      kva: this.selectedDG.KVA,
      model: this.selectedDG.Model,
      batchQty: this.selectedDG.BatchQty,
      Partcode: this.selectedDG.Partcode,
      bomCode: this.selectedDG.BomCode,
      productionType: this.selectedDG.ProductionType,
      productionDetails: this.selectedDG.ProductionDetails,
      status: status,
     details: selectedItems.map(item => {
  const found = this.ToEmpNamePCode?.find(x => x.ECode === (item.assignTo || ''));
  return {
    id: item.id,
    sixM: item.name,
    description: item.description || '',
    assignTo: item.assignTo || (status === 'REJECT' ? '0' : ''),
    empPCCode: found ? found.Pccode : ''   // ← renamed from assignToPccode
  };
})
    };
  }

  onAccept(): void {
    if (!this.selectedDG) {
      alert('Header data not loaded');
      return;
    }
    const selectedItems = this.productionItems.filter(item => item.selected);
    if (!selectedItems.length) {
      alert('Please select at least one item');
      return;
    }

    const payload = this.buildPayload('AUTH');
    console.log('AUTH Payload:', payload);

    this.isLoading = true;
    this.canopyService.postSheetMetalJobcardCheckerSave(payload).subscribe({
      next: (response: string) => {
        this.isLoading = false;
        const message = (response ?? '').trim();
        const isFailure = this.isFailureMessage(message);
        this.openResultPopup('AUTH', message, isFailure);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('API Error:', error);
        const apiMessage =
          (typeof error?.error === 'string' && error.error.trim()) ||
          error?.message ||
          'Something went wrong. Please try again.';
        this.openResultPopup('AUTH', apiMessage, /*isError*/ true);
        this.errorMessage = error;
      }
    });
  }

  onReject(): void {
    if (!this.selectedDG) {
      alert('Header data not loaded');
      return;
    }
    const selectedItems = this.productionItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      alert('Please select at least one 6M Production Type');
      return;
    }

    const payload = this.buildPayload('REJECT');
    console.log('REJECT Payload:', payload);

    this.isLoading = true;
    this.canopyService.postSheetMetalJobcardCheckerSave(payload).subscribe({
      next: (response: string) => {
        this.isLoading = false;
        const message = (response ?? '').trim();
        const isFailure = this.isFailureMessage(message);
        this.openResultPopup('REJECT', message, isFailure);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('API Error:', error);
        const apiMessage =
          (typeof error?.error === 'string' && error.error.trim()) ||
          error?.message ||
          'Something went wrong. Please try again.';
        this.openResultPopup('REJECT', apiMessage, /*isError*/ true);
        this.errorMessage = error;
      }
    });
  }

  // ============ Result popup (same pattern as bending-checker) ============

  /**
   * Recognises a logical failure the API returned with a 200 OK status —
   * e.g. "Insufficient ..." — so the popup shows the red error variant.
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

  /** Closes the popup and reloads the checker page so dropdowns/grid reset. */
  closeResultPopup(): void {
    this.showResultPopup = false;
    this.closePopup();
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/canopy-process/sheet-metal-jobcard-checker']);
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

  // ============ CHECKER DONE REPORT + QR (UI only) ============

  openQrPopup(plan: IJobcardCpyChekerDts): void {
    this.qrPlan = plan;
    this.qrValue = plan?.CPCode ?? '';
    this.showQrPopup = true;
    // Render after the modal element exists in the DOM.
    setTimeout(() => this.renderQr(), 0);
  }

  closeQrPopup(): void {
    this.showQrPopup = false;
    this.qrPlan = null;
    this.qrValue = '';
    if (this.qrHost) {
      this.qrHost.nativeElement.innerHTML = '';
    }
  }

  private renderQr(): void {
    const host = this.qrHost?.nativeElement;
    if (!host) return;
    host.innerHTML = '';
    if (!this.qrValue) return;

    const markup = this.buildBarcodeSvgMarkup(this.qrValue, 90);
    if (markup) {
      host.innerHTML = markup;
    } else {
      host.innerHTML = `<span class="barcode-text">${this.qrValue}</span>`;
    }
  }

  printQr(): void {
    const cpCode = this.qrPlan?.CPCode ?? '';
    this.printWithFileName(`${cpCode}_Barcode`);
  }

  // ============ STAGE SHEET POPUP (line-wise, with barcode column) ============

  /**
   * Opens the stage sheet popup for the given plan and stage
   * (CNC / Bending / Fabrication / PowderCoating). Fetches sheet
   * rows from the API and renders a Code-128 barcode in the last
   * column of every row, using the row's SheetCode.
   */
  openStageQrPopup(rpt: IJobcardCpyChekerDts, stage: string): void {
    this.stagePlan = rpt;
    this.stageName = stage;
    this.stageRows = [];
    this.showStagePopup = true;
    this.isStageLoading = true;

    this.canopyService
      .GetStageSheetData(rpt.CPCode, rpt.Partcode, stage, this.PC)
      .subscribe({
        next: (data: any[]) => {
          this.stageRows = data ?? [];
          this.isStageLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.stageRows = [];
          this.isStageLoading = false;
        }
      });
  }

  closeStagePopup(): void {
    this.showStagePopup = false;
    this.stagePlan = null;
    this.stageName = '';
    this.stageRows = [];
  }

  /**
   * Generates a paginated PDF of the current stage sheet list
   * (one row per sheet, QR embedded in the last column) and
   * triggers a direct download. Uses jsPDF + jspdf-autotable so
   * the PDF flows across multiple pages automatically.
   */
  async downloadStagePdf(): Promise<void> {
    if (!this.stageRows?.length) return;

    const cpCode = this.stagePlan?.CPCode ?? '';
    const partCode = this.stagePlan?.Partcode ?? '';
    const stage = this.stageName ?? '';
    const safeName = `${cpCode}_${stage}`.replace(/[\/\\?%*:|"<>]/g, '-').trim() || 'stage';

    this.isStageLoading = true;
    try {
      const stageCols = this.currentStageColumns;

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Company logo — top-right corner.
      try {
        const logo = await this.loadImageDataUrl('assets/images/kala-logo.png');
        doc.addImage(logo, 'PNG', pageWidth - 84, 12, 64, 64);
      } catch (e) {
        console.warn('Logo not added to PDF:', e);
      }

      // Header — title + meta line. Aligned with the table's left edge (25pt).
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${stage} List`, 25, 40);

      const planQty = this.formatCellValue(this.stagePlan?.BatchQty);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Plan Code: ${cpCode}`, 25, 58);
      doc.text(`Part Code: ${partCode}`, 200, 58);
      doc.text(`Stage: ${stage}`, 380, 58);
      doc.text(`Plan Qty: ${planQty}`, 520, 58);
      doc.text(`Rows: ${this.stageRows.length}`, 640, 58);

      // Part description on its own wrapped line beneath the meta row.
      let tableStartY = 72;
      const partDesc = this.stagePlan?.PartDesc;
      if (partDesc) {
        const descText = `Part Description: ${partDesc}`;
        const lines = doc.splitTextToSize(descText, pageWidth - 50);
        doc.text(lines, 25, 72);
        tableStartY = 72 + lines.length * 11; // ~11pt per line at fontSize 9
      }

      const head = [[
        'SrNo',
        ...stageCols.map(c => c.label)
      ]];

      const body = this.stageRows.map((r, i) => [
        String(i + 1),
        ...stageCols.map(c => this.stageCellValue(r, c))
      ]);

      const columnStyles: Record<number, any> = {
        0: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
      };

      // Columns whose values are codes/IDs read better in a monospaced font
      // — same visual treatment as the on-screen popup.
      const monoKeys = new Set(['SheetCode', 'MachinePartCode']);
      const centerKeys = new Set(['CatID', 'CatagoryName', 'StartDate', 'EndDate']);
      const leftKeys = new Set(['Sheet', 'KitDesc', 'MachineName']);

      stageCols.forEach((col, idx) => {
        const colIdx = idx + 1;
        const style: any = {};
        if (col.width)               style.cellWidth = col.width;
        if (col.type === 'num')      style.halign = 'right';
        else if (centerKeys.has(col.key)) style.halign = 'center';
        else if (leftKeys.has(col.key))   style.halign = 'left';
        if (monoKeys.has(col.key))   style.font = 'courier';
        // Manual-fill columns (no key) — give them a very light tint so the
        // operator sees clearly which cells need to be written in by hand.
        if (!col.key)                style.fillColor = [255, 251, 235];
        columnStyles[colIdx] = style;
      });

      autoTable(doc, {
        startY: tableStartY,
        head,
        body,
        // Tighten margins so a wider table still fits the A4 portrait page.
        margin: { top: tableStartY, left: 25, right: 25, bottom: 30 },
        tableWidth: 'wrap',
        // Never split a row across pages — push it intact to the next page.
        rowPageBreak: 'avoid',
        // 'grid' draws full borders around every cell — the cleanest, most
        // readable look for a data table.
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 6,
          valign: 'middle',
          overflow: 'linebreak',
          lineColor: [180, 188, 200],
          lineWidth: 0.5,
          textColor: [30, 41, 59]
        },
        // Tall rows so operators have room to handwrite in the manual-fill
        // columns (Supplier / Machine / Start Date / End Date).
        bodyStyles: { minCellHeight: 32 },
        headStyles: {
          fillColor: [15, 118, 110],          // teal header to match the in-app theme
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left',
          minCellHeight: 22,
          lineColor: [15, 118, 110],
          lineWidth: 0.5
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]          // soft zebra striping for legibility
        },
        columnStyles
      });

      doc.save(`${safeName}.pdf`);
    } catch (e) {
      console.error('PDF generation failed', e);
      alert('PDF generation failed.');
    } finally {
      this.isStageLoading = false;
    }
  }


  /**
   * Triggers window.print() after setting document.title so that the
   * browser's "Save as PDF" dialog defaults to the given file name.
   * The original title is restored once printing completes.
   */
  private printWithFileName(fileName: string): void {
    const safeName = (fileName || 'print').replace(/[\/\\?%*:|"<>]/g, '-').trim() || 'print';
    const originalTitle = document.title;
    document.title = safeName;

    const restore = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);

    try {
      window.print();
    } finally {
      // Safety net: some browsers don't fire `afterprint` reliably.
      setTimeout(restore, 1500);
    }
  }

  /**
   * Code 39 patterns. Each value is 9 elements alternating bar/space
   * (B,S,B,S,B,S,B,S,B). 'N' = narrow, 'W' = wide. Code 39 reliably
   * encodes 0-9, A-Z and a few symbols, and is scannable by any
   * standard 1D barcode reader.
   */
  private static readonly CODE39_PATTERNS: Record<string, string> = {
    '0': 'NNNWWNWNN', '1': 'WNNWNNNNW', '2': 'NNWWNNNNW', '3': 'WNWWNNNNN',
    '4': 'NNNWWNNNW', '5': 'WNNWWNNNN', '6': 'NNWWWNNNN', '7': 'NNNWNNWNW',
    '8': 'WNNWNNWNN', '9': 'NNWWNNWNN', 'A': 'WNNNNWNNW', 'B': 'NNWNNWNNW',
    'C': 'WNWNNWNNN', 'D': 'NNNNWWNNW', 'E': 'WNNNWWNNN', 'F': 'NNWNWWNNN',
    'G': 'NNNNNWWNW', 'H': 'WNNNNWWNN', 'I': 'NNWNNWWNN', 'J': 'NNNNWWWNN',
    'K': 'WNNNNNNWW', 'L': 'NNWNNNNWW', 'M': 'WNWNNNNWN', 'N': 'NNNNWNNWW',
    'O': 'WNNNWNNWN', 'P': 'NNWNWNNWN', 'Q': 'NNNNNNWWW', 'R': 'WNNNNNWWN',
    'S': 'NNWNNNWWN', 'T': 'NNNNWNWWN', 'U': 'WWNNNNNNW', 'V': 'NWWNNNNNW',
    'W': 'WWWNNNNNN', 'X': 'NWNNWNNNW', 'Y': 'WWNNWNNNN', 'Z': 'NWWNWNNNN',
    '-': 'NWNNNNWNW', '.': 'WWNNNNWNN', ' ': 'NWWNNNWNN',
    '$': 'NWNWNWNNN', '/': 'NWNWNNNWN', '+': 'NWNNNWNWN', '%': 'NNNWNWNWN',
    '*': 'NWNNWNWNN'
  };

  /**
   * Builds the raw Code 39 SVG markup (including the readable
   * caption underneath). Returns null if the value contains any
   * character not supported by Code 39.
   */
  private buildBarcodeSvgMarkup(text: string, height = 50): string | null {
    if (!text) return null;

    const patterns = SheetMetalJobcardCheckerComponent.CODE39_PATTERNS;
    const upper = String(text).toUpperCase();

    for (const ch of upper) {
      if (!patterns[ch]) return null;
    }

    const narrow = 2;          // narrow element width (units)
    const wide   = narrow * 3; // wide element width (Code 39 ratio = 3:1)
    const quiet  = narrow * 10;

    // Frame the data with '*' start/stop characters.
    const sequence = `*${upper}*`;

    let x = quiet;
    let bars = '';

    for (let i = 0; i < sequence.length; i++) {
      const pattern = patterns[sequence[i]];
      for (let j = 0; j < 9; j++) {
        const w = pattern[j] === 'W' ? wide : narrow;
        const isBar = (j % 2) === 0;
        if (isBar) {
          bars += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000"/>`;
        }
        x += w;
      }
      if (i < sequence.length - 1) {
        x += narrow; // inter-character narrow gap
      }
    }
    const totalWidth = x + quiet;

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" ` +
      `viewBox="0 0 ${totalWidth} ${height}" ` +
      `width="100%" height="${height}" ` +
      `preserveAspectRatio="none" shape-rendering="crispEdges">${bars}</svg>` +
      `<div class="barcode-text">${text}</div>`
    );
  }

  /** Build a sanitized QR code SVG (with caption underneath) for binding via [innerHTML]. */
}
