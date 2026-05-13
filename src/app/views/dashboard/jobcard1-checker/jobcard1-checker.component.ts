import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { Jobcard1Service, JobCard1CheckerRow, SixMItem, EmployeeItem, PlanDetailItem, CheckerSubmitRequest, JobCard1ReportRow } from '../jobcard1/jobcard1.service';

interface CheckerRow {
  id: number;
  sixM: string;
  description: string;
  assignTo: string;
  selected: boolean;
}

@Component({
  selector: 'app-jobcard1-checker',
  standalone: false,
  templateUrl: './jobcard1-checker.component.html',
  styleUrls: ['./jobcard1-checker.component.scss']
})
export class Jobcard1CheckerComponent implements OnInit {

  today: string = '';
  pcCode_old: string = '';
  pcCode_Act: string = '';
  pcDisplay: string = '';
  compCode: string = '';
  empCode: string = '';

  shiftType: string = '';
  selectedJobCard: string = '';
  jobCardNumbers: string[] = [];
  isLoadingJobCards: boolean = false;

  checkerList: JobCard1CheckerRow[] = [];
  isLoading: boolean = false;

  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  // Modal state
  showModal: boolean = false;
  selectedJobCode: string = '';

  employees: EmployeeItem[] = [];
  sixMItems: SixMItem[] = [];
  checkerRows: CheckerRow[] = [];

  // Plan details
  showPlanDetails: boolean = false;
  selectedPlanJobCode: string = '';
  planDetailsList: PlanDetailItem[] = [];
  isLoadingPlan: boolean = false;
  batteryColsVisible: boolean[] = [false, false, false, false];

  // Jobcard 1 Report (port from jobcard1 maker)
  reportFromDate: string                = '';
  reportToDate:   string                = '';
  reportList:     JobCard1ReportRow[]   = [];
  isLoadingReport: boolean              = false;
  reportError:    string                = '';
  qrPdfRowIndex:  number                = -1;  // shared: which report row is generating PDF
  isLoadingExcel: boolean               = false;
  reportSearchText: string              = '';

  get filteredReportList(): JobCard1ReportRow[] {
    const q = (this.reportSearchText || '').trim().toLowerCase();
    if (!q) return this.reportList;
    return this.reportList.filter(r =>
      (r.JobCode       || '').toLowerCase().includes(q) ||
      (r.PlanCode      || '').toLowerCase().includes(q) ||
      (r.BOMCode       || '').toLowerCase().includes(q) ||
      (r.DGProductCode || '').toLowerCase().includes(q)
    );
  }

  // Searchable assign dropdown per row
  assignSearchText: string[] = [];
  assignDropdownOpen: number = -1;

  constructor(private jobcardService: Jobcard1Service) {}

  ngOnInit(): void {
    this.compCode = localStorage.getItem('companyId')?.trim() ?? '';
    this.empCode  = localStorage.getItem('employeeCode')?.trim() ?? '';
    this.pcCode_old = localStorage.getItem('ProfitCenter_old')?.trim() ?? '';
    this.pcCode_Act = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    const pcName = localStorage.getItem('profitCenterName')?.trim() ?? '';
    console.log('ProfitCenter Name:', pcName, 'ProfitCenter_old:', this.pcCode_old, 'ProfitCenter_Act:', this.pcCode_Act);
    this.pcDisplay = pcName && this.pcCode_old ? `${pcName} --> ${this.pcCode_old}` : pcName || this.pcCode_old;
    this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
    this.loadJobCardNumbers();
    this.loadSixMData();
    this.loadEmployees();
    this.initReportRange();
    this.loadReport();
  }

  loadSixMData(): void {
    console.log('[6M] requesting GetSelect6MData...');
    this.jobcardService.fetchSelect6MData().subscribe({
      next: (data) => {
        this.sixMItems = data ?? [];
        console.log('[6M] raw API response:', data);
        console.log('[6M] sixMItems stored (count=' + this.sixMItems.length + '):', this.sixMItems);
        if (this.sixMItems.length > 0) {
          const sample = this.sixMItems[0];
          console.log('[6M] first item keys:', Object.keys(sample));
          console.log('[6M] first item Id=', (sample as any).Id, ' / id=', (sample as any).id);
          console.log('[6M] first item Name=', (sample as any).Name, ' / name=', (sample as any).name);
        }
      },
      error: (err) => { console.error('[6M] Failed to load 6M data:', err); }
    });
  }

  loadEmployees(): void {
    this.jobcardService.fetchEmployeeList().subscribe({
      next: (data) => {
        const noneOption: EmployeeItem = { ECode: '', EmployeeName: 'None' };
        this.employees = [noneOption, ...(data ?? [])];
      },
      error: (err) => { console.error('Failed to load employees:', err); }
    });
  }

  loadJobCardNumbers(): void {
    this.isLoadingJobCards = true;
    this.jobcardService.getJobCard1CheckerDetails().subscribe({
      next: (data) => {
        console.log('JobCard Numbers API response:', data);
        this.jobCardNumbers = data ?? [];
        this.isLoadingJobCards = false;
      },
      error: (err) => {
        this.isLoadingJobCards = false;
        console.error('Failed to load jobcard numbers:', err);
      }
    });
  }

  onSearch(): void {
    if (!this.selectedJobCard) {
      this.warningMessage = 'Please select a JobCard.';
      return;
    }

    this.isLoading = true;
    this.checkerList = [];
    this.closePlanDetails();
    this.clearMessages();

    this.jobcardService.getJobCard1CheckerDetailsByCode(this.selectedJobCard).subscribe({
      next: (data) => {
        console.log('Checker Details API response:', data);
        this.checkerList = data ?? [];
        this.isLoading = false;
        if (this.checkerList.length === 0) {
          this.warningMessage = 'No details found for selected JobCard.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to fetch checker details.';
        console.error(err);
      }
    });
  }

  // Modal
  openCheckerModal(jobCode: string): void {
    console.log('[Checker Modal] open for jobCode=', jobCode);
    console.log('[Checker Modal] sixMItems at open (count=' + this.sixMItems.length + '):', this.sixMItems);

    this.selectedJobCode = jobCode;
    this.checkerRows = this.sixMItems.filter(item => item.Id > 0 && item.Name !== 'None').map(item => ({
      id: item.Id,
      sixM: item.Name,
      description: '',
      assignTo: '',
      selected: true
    }));

    console.log('[Checker Modal] checkerRows after filter (count=' + this.checkerRows.length + '):', this.checkerRows);
    if (this.sixMItems.length > 0 && this.checkerRows.length === 0) {
      console.warn('[Checker Modal] ⚠ All sixMItems were filtered out. ' +
        'Likely cause: JSON property casing mismatch (expected Id/Name, got id/name) ' +
        'OR all items have Id <= 0 / Name === "None".');
    }

    this.assignSearchText = this.checkerRows.map(() => 'None');
    this.assignDropdownOpen = -1;
    this.modalErrorMessage = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedJobCode = '';
    this.checkerRows = [];
    this.assignSearchText = [];
    this.assignDropdownOpen = -1;
    this.modalErrorMessage = '';
  }

  filteredEmployees(index: number): EmployeeItem[] {
    const search = (this.assignSearchText[index] || '').toLowerCase();
    if (!search) return this.employees;
    return this.employees.filter(e =>
      e.EmployeeName.toLowerCase().includes(search) || e.ECode.includes(search)
    );
  }

  toggleAssignDropdown(index: number): void {
    this.assignDropdownOpen = this.assignDropdownOpen === index ? -1 : index;
  }

  selectEmployee(index: number, emp: EmployeeItem): void {
    this.checkerRows[index].assignTo = emp.ECode;
    this.assignSearchText[index] = emp.EmployeeName;
    this.assignDropdownOpen = -1;
  }

  clearAssign(index: number): void {
    this.checkerRows[index].assignTo = '';
    this.assignSearchText[index] = '';
  }

  get selectedCount(): number {
    return this.checkerRows.filter(r => r.selected).length;
  }

  get canAuth(): boolean {
    const selected = this.checkerRows.filter(r => r.selected);
    if (selected.length === 0) return false;
    return selected.every(r =>
      r.description.trim().toLowerCase() === 'ok' &&
      this.assignSearchText[this.checkerRows.indexOf(r)]?.toLowerCase() === 'none'
    );
  }

  get canReject(): boolean {
    return this.checkerRows.some((r, i) => {
      const text = (this.assignSearchText[i] || '').trim().toLowerCase();
      return r.selected && text !== '' && text !== 'none';
    });
  }

  isSubmitting: boolean = false;
  modalErrorMessage: string = '';

  onAuth(): void {
    const payload: CheckerSubmitRequest = {
      empCode: this.empCode,
      pccode_Act: this.pcCode_Act,
      pcCode_Old: this.pcCode_old,
      jobCode: this.selectedJobCode,
      status: 'Auth',
      details: this.checkerRows.map((row, i) => ({
        sixM: row.sixM,
        description: row.description,
        assignTo: row.assignTo,
        assignName: this.assignSearchText[i] || ''
      }))
    };
    this.submitChecker(payload);
  }

  onReject(): void {
    const payload: CheckerSubmitRequest = {
      empCode: this.empCode,
      pccode_Act: this.pcCode_Act,
      pcCode_Old: this.pcCode_old,
      jobCode: this.selectedJobCode,
      status: 'Reject',
      details: this.checkerRows.map((row, i) => ({
        sixM: row.sixM,
        description: row.description,
        assignTo: row.assignTo,
        assignName: this.assignSearchText[i] || '',
        selected: row.selected
      }))
    };
    this.submitChecker(payload);
  }

  private submitChecker(payload: CheckerSubmitRequest): void {
    console.log('submitChecker called with:', payload);
    this.isSubmitting = true;
    this.modalErrorMessage = '';
    this.jobcardService.submitJobcard1Checker(payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.closeModal();
        this.checkerList = [];
        this.selectedJobCard = '';
        this.closePlanDetails();
        this.loadJobCardNumbers();
        this.clearMessages();
        if (payload.status === 'Auth') {
          this.successMessage = response || `JobCode ${payload.jobCode} authorized successfully.`;
        } else {
          this.successMessage = response || `JobCode ${payload.jobCode} rejected successfully.`;
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.modalErrorMessage = 'Failed to submit. Please try again.';
        console.error(err);
      }
    });
  }

  onViewPlan(row: JobCard1CheckerRow): void {
    this.selectedPlanJobCode = row.JobCode;
    this.planDetailsList = [];
    this.batteryColsVisible = [false, false, false, false];
    this.isLoadingPlan = true;
    this.showPlanDetails = true;

    this.jobcardService.getPlanDetails(row.JobCode).subscribe({
      next: (data) => {
        this.planDetailsList = data ?? [];
        this.computeBatteryVisibility();
        this.isLoadingPlan = false;
      },
      error: (err) => {
        this.isLoadingPlan = false;
        this.errorMessage = 'Failed to fetch plan details.';
        console.error(err);
      }
    });
  }

  private computeBatteryVisibility(): void {
    const cols: (keyof PlanDetailItem)[] = ['Battery1', 'Battery2', 'Battery3', 'Battery4'];
    this.batteryColsVisible = cols.map(col =>
      this.planDetailsList.some(p => !!(p[col] && String(p[col]).trim()))
    );
  }

  get visibleBatteryCount(): number {
    return this.batteryColsVisible.filter(v => v).length;
  }

  get planTableColspan(): number {
    // Priority + BOM + Plan + Date + Part + Engine + Alt + Canopy = 8 fixed cols
    return 8 + this.visibleBatteryCount;
  }

  // ── Default report range: 1st of current month → today ────────
  initReportRange(): void {
    const now   = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    this.reportFromDate = formatDate(first, 'yyyy-MM-dd', 'en-US');
    this.reportToDate   = formatDate(now,   'yyyy-MM-dd', 'en-US');
  }

  // ── Fetch JobCard production report ────────────────────────────
  loadReport(): void {
    if (!this.compCode || !this.pcCode_Act) return;
    if (!this.reportFromDate || !this.reportToDate) {
      this.reportError = 'Please select From and To dates.';
      return;
    }
    if (this.reportFromDate > this.reportToDate) {
      this.reportError = 'From Date cannot be later than To Date.';
      return;
    }

    this.isLoadingReport = true;
    this.reportError     = '';
    this.reportList      = [];

    this.jobcardService
      .getJobCard1Report(this.compCode, this.pcCode_Act, this.reportFromDate, this.reportToDate)
      .subscribe({
        next: (data) => {
          this.reportList     = data ?? [];
          this.isLoadingReport = false;
        },
        error: (err) => {
          this.isLoadingReport = false;
          if (err?.status === 404) {
            this.reportList = [];
          } else {
            this.reportError = 'Failed to load report. Please try again.';
            console.error(err);
          }
        }
      });
  }

  getStatusClass(value: string): string {
    const v = (value ?? '').toLowerCase();
    if (v === 'complete' || v === 'authorized' || v === 'done') return 'jc-status-ok';
    if (v === 'pending' || v === 'pending auth')                return 'jc-status-pending';
    if (v === 'inactive')                                        return 'jc-status-off';
    return 'jc-status-neutral';
  }

  getQtyClass(row: JobCard1ReportRow): string {
    if (row.PlannedQty > 0 && row.Stage2CompletedQty >= row.PlannedQty) return 'jc-qty-done';
    if (row.Stage2CompletedQty > 0)                                     return 'jc-qty-progress';
    return 'jc-qty-pending';
  }

  // PlanDate from API is "DD/MM/YYYY"; render as "05 May 2026" in the PDF
  private formatPlanDate(s: string | undefined): string {
    if (!s) return '-';
    const parts = s.split('/');
    if (parts.length !== 3) return s;
    const [dd, mm, yyyy] = parts;
    const d = new Date(+yyyy, +mm - 1, +dd);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Download QR Code PDF for a JobCard 1 Report row ────────────
  async downloadReportQrPdf(row: JobCard1ReportRow, index: number): Promise<void> {
    if (this.qrPdfRowIndex !== -1) return;
    if (row.JobCardAuthStatus !== 'Authorized') {
      alert(
        `Cannot download QR Code PDF.\n\n` +
        `JobCard ${row.JobCode} is currently "${row.JobCardAuthStatus}".\n` +
        `Please authorize the JobCard first, then try again.`
      );
      return;
    }
    this.qrPdfRowIndex = index;

    try {
      if (!(window as any).jspdf) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }
      if (!(window as any).qrcode) {
        await this.loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js');
      }

      const jsPDF  = (window as any).jspdf?.jsPDF;
      const qrcode = (window as any).qrcode;
      if (!jsPDF || !qrcode) {
        alert('PDF libraries failed to load. Please check your connection and try again.');
        return;
      }

      // Components present in this row (skip empties)
      const items: { label: string; desc: string; serial: string }[] = [];
      const push = (label: string, desc: string | undefined, serial: string | undefined) => {
        const s = (serial ?? '').trim();
        if (s) items.push({ label, desc: (desc ?? '').trim(), serial: s });
      };
      push('Engine',     row.Engine_SrNoDesc,     row.Engine_SrNo);
      push('Alternator', row.Alternator_SrNoDesc, row.Alternator_SrNo);
      push('Battery 1',  row.Battery1_SrNoDesc,   row.Battery1_SrNo);
      push('Battery 2',  row.Battery2_SrNoDesc,   row.Battery2_SrNo);
      push('Battery 3',  row.Battery3_SrNoDesc,   row.Battery3_SrNo);
      push('Battery 4',  row.Battery4_SrNoDesc,   row.Battery4_SrNo);
      push('Canopy',     row.Canopy_SrNoDesc,     row.Canopy_SrNo);

      if (items.length === 0) {
        alert('No serial numbers available for this plan.');
        return;
      }

      const priority = row.PlanNo;
      const planDate = this.formatPlanDate(row.PlanDate);

      const pdf   = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();   // 210
      const pageH = pdf.internal.pageSize.getHeight();  // 297
      const margin = 10;
      const usableW = pageW - margin * 2;

      // ──────────────── HEADER ────────────────
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text('Jobcard Details with SrNo QRCode', pageW / 2, margin + 6, { align: 'center' });

      // Header KV helper (label bold, value normal, label width fixed)
      const kv = (label: string, value: string, x: number, y: number, labelW = 22) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(label, x, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value || '-', x + labelW, y);
      };

      // Line 1 — JobCode | PlanCode | PlanDate (3 equal columns)
      let y = margin + 14;
      const colW = usableW / 3;
      kv('Job Card:',  row.JobCode  || '-', margin,             y);
      kv('Plan Code:', row.PlanCode || '-', margin + colW,      y);
      kv('Plan Date:', planDate,            margin + colW * 2,  y);

      // Line 2 — DG Desc full width (wraps)
      y += 7;
      const dgDesc = (row.DGProductDesc || row.DGProductCode || '-').trim();
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('DG Desc:', margin, y);
      pdf.setFont('helvetica', 'normal');
      const descLines: string[] = pdf.splitTextToSize(dgDesc, usableW - 22);
      pdf.text(descLines, margin + 22, y);
      y += Math.max(0, descLines.length - 1) * 4;

      // Line 3 — KVA | Phase | Model | Priority (4 columns)
      y += 7;
      const c4 = usableW / 4;
      kv('KVA:',      String(row.KVA ?? '-'),  margin,            y, 14);
      kv('Phase:',    row.Phase || '-',        margin + c4,       y, 16);
      kv('Model:',    row.Model || '-',        margin + c4 * 2,   y, 16);
      kv('Priority:', String(priority),        margin + c4 * 3,   y, 20);

      // Divider
      y += 4;
      pdf.setDrawColor(160);
      pdf.setLineWidth(0.4);
      pdf.line(margin, y, pageW - margin, y);

      // ──────────────── COMPONENT TABLE ────────────────
      // Columns: Component | Description | Serial No | QR Code | Remark
      const colComp   = 24;
      const colDesc   = 60;
      const colSerial = 34;
      const colQr     = 30;
      const colRemark = usableW - (colComp + colDesc + colSerial + colQr); // ~42mm
      const xComp     = margin;
      const xDesc     = xComp + colComp;
      const xSerial   = xDesc + colDesc;
      const xQr       = xSerial + colSerial;
      const xRemark   = xQr + colQr;

      // Table header bar
      const thY = y + 6;
      pdf.setFillColor(21, 101, 192);              // primary blue
      pdf.rect(margin, thY - 5, usableW, 7, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255);
      pdf.text('Component',   xComp + 2,                    thY);
      pdf.text('Description', xDesc + 2,                    thY);
      pdf.text('Serial No',   xSerial + 2,                  thY);
      pdf.text('QR Code',     xQr + colQr / 2,              thY, { align: 'center' });
      pdf.text('Remark',      xRemark + colRemark / 2,      thY, { align: 'center' });
      pdf.setTextColor(0);

      // Compute per-row heights to fit page; QR fits inside row
      const bodyTop    = thY + 2;
      const bodyBottom = pageH - margin;
      const availH     = bodyBottom - bodyTop;
      const rowH       = Math.min(34, Math.max(22, availH / items.length));
      const qrSize     = Math.min(rowH - 6, colQr - 8, 22);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);

      let rowY = bodyTop;
      for (const item of items) {
        // Row border
        pdf.setDrawColor(220);
        pdf.setLineWidth(0.2);
        pdf.rect(margin, rowY, usableW, rowH);
        // Vertical separators
        pdf.line(xDesc,   rowY, xDesc,   rowY + rowH);
        pdf.line(xSerial, rowY, xSerial, rowY + rowH);
        pdf.line(xQr,     rowY, xQr,     rowY + rowH);
        pdf.line(xRemark, rowY, xRemark, rowY + rowH);

        // Component label (bold, vertically centered)
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(item.label, xComp + 2, rowY + rowH / 2 + 1.5);

        // Description (wraps)
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const dLines: string[] = pdf.splitTextToSize(item.desc || '-', colDesc - 4);
        const lineH = 3.5;
        const dBlockH = dLines.length * lineH;
        const dStartY = rowY + (rowH - dBlockH) / 2 + 3;
        pdf.text(dLines, xDesc + 2, dStartY);

        // Serial (bold, centered vertically; wraps if long)
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        const sLines: string[] = pdf.splitTextToSize(item.serial, colSerial - 4);
        const sBlockH = sLines.length * 3.8;
        const sStartY = rowY + (rowH - sBlockH) / 2 + 3;
        pdf.text(sLines, xSerial + 2, sStartY);

        // QR (centered in cell)
        const qr = qrcode(0, 'H');
        qr.addData(item.serial);
        qr.make();
        const qrDataUrl = qr.createDataURL(10, 0);
        const qX = xQr + (colQr - qrSize) / 2;
        const qY = rowY + (rowH - qrSize) / 2;
        pdf.addImage(qrDataUrl, 'PNG', qX, qY, qrSize, qrSize);

        rowY += rowH;
      }

      // Filename — '/' is illegal in OS filenames, swap to '_' (preserves year hyphen).
      // Append priority so each row in the same JobCode produces a unique file.
      const safeJob = (row.JobCode || 'JobCard')
        .replace(/\//g, '_')
        .replace(/[\\:*?"<>|]/g, '-');
      pdf.save(`${safeJob}_P${priority}.pdf`);
    } catch (err) {
      console.error('Failed to generate QR PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      this.qrPdfRowIndex = -1;
    }
  }

  // ── Download report as Excel (.xlsx) ───────────────────────────
  async downloadReportExcel(): Promise<void> {
    if (this.isLoadingExcel) return;
    if (this.reportList.length === 0) {
      alert('No records to export. Please load the report first.');
      return;
    }

    this.isLoadingExcel = true;
    try {
      if (!(window as any).XLSX) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      }
      const XLSX = (window as any).XLSX;
      if (!XLSX) {
        alert('Excel library failed to load. Please check your connection and try again.');
        return;
      }

      const source = this.filteredReportList.length > 0 ? this.filteredReportList : this.reportList;
      const rows = source.map((r, i) => ({
        'SrNo':            i + 1,
        'JobCode':         r.JobCode,
        'Auth Status':     r.JobCardAuthStatus,
        'JobCard Status':  r.JobCardStatus,
        'Jobcard Date':    r.JobDate,
        'Plan No':         r.PlanNo,
        'Plan Code':       r.PlanCode,
        'Plan Date':       r.PlanDate,
        'BOM Code':        r.BOMCode || '',
        'Part Code':       r.DGProductCode,
        'KVA':             r.KVA,
        'Phase':           r.Phase,
        'Model':           r.Model || '',
        'DG Description':  r.DGProductDesc,
        'Planned Qty':     r.PlannedQty,
        'Completed Qty':   r.Stage2CompletedQty,
        'Engine':          r.Engine_SrNo || '',
        'Engine Desc':     r.Engine_SrNoDesc || '',
        'Alternator':      r.Alternator_SrNo || '',
        'Alternator Desc': r.Alternator_SrNoDesc || '',
        'Battery 1':       r.Battery1_SrNo || '',
        'Battery 2':       r.Battery2_SrNo || '',
        'Battery 3':       r.Battery3_SrNo || '',
        'Battery 4':       r.Battery4_SrNo || '',
        'Canopy':          r.Canopy_SrNo || '',
        'Stage 1':         r.Stage1,
        'Stage 1 QA':      r.Stage1QAStatus,
        'Stage 2':         r.Stage2,
        'Stage 2 QA':      r.Stage2QAStatus,
        'JobCard 2':       r.JobCard2Status,
        'Remark':          r.Remark || '',
        'Profit Center':   r.ProfitCenter || '',
        'Assembly Line':   r.AssemblyLine || '',
        'Financial Year':  r.FinancialYear || '',
        'Company Code':    r.CompanyCode || ''
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Jobcard 1 Report');

      const safe = (s: string) => (s || '').replace(/[\\/:*?"<>|]/g, '-');
      const filename = `Jobcard1_Report_${safe(this.reportFromDate)}_to_${safe(this.reportToDate)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Failed to generate Excel:', err);
      alert('Failed to generate Excel. Please try again.');
    } finally {
      this.isLoadingExcel = false;
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
      if (existing) {
        if ((existing as any).dataset.loaded === '1') { resolve(); return; }
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error(`Failed to load: ${src}`)));
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload  = () => { (script as any).dataset.loaded = '1'; resolve(); };
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  }

  closePlanDetails(): void {
    this.showPlanDetails = false;
    this.selectedPlanJobCode = '';
    this.planDetailsList = [];
    this.batteryColsVisible = [false, false, false, false];
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.warningMessage = '';
  }
}
