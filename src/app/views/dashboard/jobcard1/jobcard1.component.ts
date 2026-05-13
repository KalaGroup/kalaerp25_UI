import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { formatDate } from '@angular/common';
import {
  Jobcard1Service,
  JobCardDtsRow,
  JobCardSubmitRequest,
  JobCard1ReportRow
} from './jobcard1.service';

@Component({
  selector: 'app-jobcard1',
  standalone: false,
  templateUrl: './jobcard1.component.html',
  styleUrl: './jobcard1.component.scss'
})
export class Jobcard1Component implements OnInit {

  // ── State ──────────────────────────────────────────────────────
  today:          string          = '';
  pcDisplay:      string          = '';
  pcCode_Act:     string          = '';
  pcCode_Old:     string          = '';
  compCode:       string          = '';
  empCode:        string          = '';
  jobCardList:    JobCardDtsRow[] = [];
  isLoading:      boolean         = false;
  isSubmitting:   boolean         = false;
  showPlanCode:   boolean         = false;
  successMessage: string          = '';
  errorMessage:   string          = '';
  warningMessage: string          = '';
  remarkMissing:  boolean         = false;

  // ── Report state ───────────────────────────────────────────────
  reportFromDate: string                = '';
  reportToDate:   string                = '';
  reportList:     JobCard1ReportRow[]   = [];
  isLoadingReport: boolean              = false;
  reportError:    string                = '';
  qrPdfRowIndex:  number                = -1;  // which row is currently generating PDF
  isLoadingExcel: boolean               = false;
  reportSearchText: string              = '';

  // Client-side filter on the loaded report — searches JobCode, Plan Code,
  // BOM Code and Part Code so any identifier can locate the row.
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


  constructor(
    private jobcardService: Jobcard1Service,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Read from localStorage — set during login
    this.compCode = localStorage.getItem('companyId')?.trim() ?? '';
    this.empCode  = localStorage.getItem('employeeCode')?.trim() ?? '';
    this.today    = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
    this.setPCByCompany();
    this.initReportRange();
    this.loadReport();
  }

  // ── Default report range: 1st of current month → today ────────
  private initReportRange(): void {
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
          // 404 from API just means "no rows" — present cleanly
          if (err?.status === 404) {
            this.reportList = [];
          } else {
            this.reportError = 'Failed to load report. Please try again.';
            console.error(err);
          }
        }
      });
  }

  // ── Status badge class for stage cells ─────────────────────────
  getStatusClass(value: string): string {
    const v = (value ?? '').toLowerCase();
    if (v === 'complete' || v === 'authorized' || v === 'done') return 'jc-status-ok';
    if (v === 'pending' || v === 'pending auth')                return 'jc-status-pending';
    if (v === 'inactive')                                        return 'jc-status-off';
    return 'jc-status-neutral';
  }

  // ── Qty cell colour: green if all done, otherwise warning ─────
  getQtyClass(row: JobCard1ReportRow): string {
    if (row.PlannedQty > 0 && row.Stage2CompletedQty >= row.PlannedQty) return 'jc-qty-done';
    if (row.Stage2CompletedQty > 0)                                     return 'jc-qty-progress';
    return 'jc-qty-pending';
  }


  // ── Download QR Code PDF for one report row ───────────────────
  // Mirrors the implementation in jobcard1-checker.component.ts but pulls
  // serial numbers from the flat JobCard1ReportRow (Engine_SrNo / *_SrNoDesc)
  // and uses Authorized-only gating.
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
      // PlanDate from this API is already "DD/MM/YYYY" — convert to "05 May 2026"
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

      const kv = (label: string, value: string, x: number, y: number, labelW = 22) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(label, x, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value || '-', x + labelW, y);
      };

      // Line 1 — JobCode | PlanCode | PlanDate
      let y = margin + 14;
      const colW = usableW / 3;
      kv('Job Card:',  row.JobCode  || '-', margin,             y);
      kv('Plan Code:', row.PlanCode || '-', margin + colW,      y);
      kv('Plan Date:', planDate,            margin + colW * 2,  y);

      // Line 2 — DG Desc full width
      y += 7;
      const dgDesc = (row.DGProductDesc || row.DGProductCode || '-').trim();
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('DG Desc:', margin, y);
      pdf.setFont('helvetica', 'normal');
      const descLines: string[] = pdf.splitTextToSize(dgDesc, usableW - 22);
      pdf.text(descLines, margin + 22, y);
      y += Math.max(0, descLines.length - 1) * 4;

      // Line 3 — KVA | Phase | Model | Priority
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
      const colComp   = 24;
      const colDesc   = 60;
      const colSerial = 34;
      const colQr     = 30;
      const colRemark = usableW - (colComp + colDesc + colSerial + colQr);
      const xComp     = margin;
      const xDesc     = xComp + colComp;
      const xSerial   = xDesc + colDesc;
      const xQr       = xSerial + colSerial;
      const xRemark   = xQr + colQr;

      const thY = y + 6;
      pdf.setFillColor(21, 101, 192);
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

      const bodyTop    = thY + 2;
      const bodyBottom = pageH - margin;
      const availH     = bodyBottom - bodyTop;
      const rowH       = Math.min(34, Math.max(22, availH / items.length));
      const qrSize     = Math.min(rowH - 6, colQr - 8, 22);

      let rowY = bodyTop;
      for (const item of items) {
        pdf.setDrawColor(220);
        pdf.setLineWidth(0.2);
        pdf.rect(margin, rowY, usableW, rowH);
        pdf.line(xDesc,   rowY, xDesc,   rowY + rowH);
        pdf.line(xSerial, rowY, xSerial, rowY + rowH);
        pdf.line(xQr,     rowY, xQr,     rowY + rowH);
        pdf.line(xRemark, rowY, xRemark, rowY + rowH);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(item.label, xComp + 2, rowY + rowH / 2 + 1.5);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const dLines: string[] = pdf.splitTextToSize(item.desc || '-', colDesc - 4);
        const dBlockH = dLines.length * 3.5;
        const dStartY = rowY + (rowH - dBlockH) / 2 + 3;
        pdf.text(dLines, xDesc + 2, dStartY);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        const sLines: string[] = pdf.splitTextToSize(item.serial, colSerial - 4);
        const sBlockH = sLines.length * 3.8;
        const sStartY = rowY + (rowH - sBlockH) / 2 + 3;
        pdf.text(sLines, xSerial + 2, sStartY);

        const qr = qrcode(0, 'H');
        qr.addData(item.serial);
        qr.make();
        const qrDataUrl = qr.createDataURL(10, 0);
        const qX = xQr + (colQr - qrSize) / 2;
        const qY = rowY + (rowH - qrSize) / 2;
        pdf.addImage(qrDataUrl, 'PNG', qX, qY, qrSize, qrSize);

        rowY += rowH;
      }

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

  // PlanDate from API is "DD/MM/YYYY"; render as "05 May 2026"
  private formatPlanDate(s: string | undefined): string {
    if (!s) return '-';
    const parts = s.split('/');
    if (parts.length !== 3) return s;
    const [dd, mm, yyyy] = parts;
    const d = new Date(+yyyy, +mm - 1, +dd);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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

  // ── Set profit center label and code from logged-in employee ──
  private setPCByCompany(): void {
    this.pcCode_Act = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    this.pcCode_Old = localStorage.getItem('ProfitCenter_old')?.trim() ?? '';
    const pcName   = localStorage.getItem('profitCenterName')?.trim() ?? '';
    this.pcDisplay = pcName && this.pcCode_Old ? `${pcName} --> ${this.pcCode_Old}` : pcName || this.pcCode_Old;
  }

  // ── Search ────────────────────────────────────────────────────
  onSearch(): void {
    if (!this.compCode) {
      this.warningMessage = 'Company code not found. Please login again.';
      return;
    }

    this.isLoading   = true;
    this.jobCardList = [];
    this.clearMessages();

    this.jobcardService.getJobCardDetails(this.compCode, this.pcCode_Act).subscribe({
      next: (data) => {
        this.jobCardList = data ?? [];
        this.isLoading   = false;
        if (this.jobCardList.length === 0)
          this.warningMessage = 'No records found for the selected profit center.';
      },
      error: (err) => {
        this.isLoading    = false;
        this.errorMessage = 'Failed to fetch job card details. Please try again.';
        console.error(err);
      }
    });
  }

  // ── Submit ────────────────────────────────────────────────────
  onSubmit(form: NgForm): void {
    const remark = (form.value.remark || '').trim();
    if (!remark) {
      this.remarkMissing = true;
      this.warningMessage = 'Please fill remark before submitting.';
      return;
    }
    this.remarkMissing = false;

    if (!this.jobCardList || this.jobCardList.length === 0) {
      this.warningMessage = 'Please search for job card details first.';
      return;
    }

    // Validate each row — Qty must not exceed PenPQty
    for (const row of this.jobCardList) {
      if (row.Qty > 0 && row.PenPQty != null && row.Qty > row.PenPQty) {
        this.warningMessage =
          `Qty cannot exceed Pending Qty (${row.PenPQty}) for Part: ${row.PartCode}`;
        return;
      }
    }

    // Only submit rows where user has entered Qty > 0
    const selectedRows = this.jobCardList.filter(r => r.Qty > 0);
    if (selectedRows.length === 0) {
      this.warningMessage = 'Please enter quantity for at least one row.';
      return;
    }

    const request: JobCardSubmitRequest = {
      pcCode_Act:  this.pcCode_Act,
      pcCode_Old:  this.pcCode_Old,
      remark:  form.value.remark?.trim() ?? '',
      empCode: this.empCode,
      plans:   selectedRows
    };

    console.log('Submitting Job Card with request:', request);

    this.isSubmitting = true;
    this.clearMessages();

    this.jobcardService.submitJobCard(request).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = response
          ? `Job Card created successfully: ${response}`
          : 'Job Card created successfully.';
        this.jobCardList = [];
        form.resetForm();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = this.extractErrorMessage(err);
        console.error(err);
      }
    });
  }

  // ── Extract friendly message from HttpErrorResponse ────────────
  private extractErrorMessage(err: any): string {
    const body = err?.error;
    if (typeof body === 'string' && body.trim()) return body.trim();
    if (body?.message && typeof body.message === 'string') return body.message;
    if (err?.status === 0) return 'Cannot reach server. Check your connection and try again.';
    return 'Failed to submit job card. Please try again.';
  }

  // ── Row background based on stock and today flag ───────────────
  getRowBackground(row: JobCardDtsRow): string {
    if (row.TodayFlag === 'TODAY') return '#fff8e1';
    const hasAllStock =
      Number(row.Eng) > 0 &&
      Number(row.Alt) > 0 &&
      Number(row.Bat) > 0 &&
      Number(row.Cpy) > 0;
    return hasAllStock ? '' : '#fff9f9';
  }

  // ── Cap qty at PenPQty on input change ────────────────────────
  onQtyChange(row: JobCardDtsRow): void {
    if (row.PenPQty != null && row.Qty > row.PenPQty) {
      row.Qty = row.PenPQty;
    }
  }

  // ── Clear all alert messages ───────────────────────────────────
  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage   = '';
    this.warningMessage = '';
  }
}
