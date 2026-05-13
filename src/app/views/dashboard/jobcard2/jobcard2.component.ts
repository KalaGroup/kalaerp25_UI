import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { Jobcard2Service, JobCard2ReportRow } from './jobcard2.service';

@Component({
  selector: 'app-jobcard2',
  standalone: false,
  templateUrl: './jobcard2.component.html',
  styleUrls: ['./jobcard2.component.scss']
})
export class Jobcard2Component implements OnInit {
  today: string = '';
  pcCode_act: string = '';
  pcCode_old: string = '';
  pcDisplay: string = '';
  compCode: string = '';
  jobCardCode: string = '';
  remarkText: string = '';

  dataSource: any[] = [];
  panelTypeOptions: { PanelTypeName: string; PanelTypeCode: string }[] = [];
  isLoading: boolean = false;
  isSubmitting: boolean = false;

  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  // ── Report state ───────────────────────────────────────────────
  reportFromDate:  string                = '';
  reportToDate:    string                = '';
  reportList:      JobCard2ReportRow[]   = [];
  isLoadingReport: boolean               = false;
  reportError:     string                = '';
  qrPdfRowIndex:   number                = -1;
  isLoadingExcel:  boolean               = false;
  reportSearchText: string               = '';

  get filteredReportList(): JobCard2ReportRow[] {
    const q = (this.reportSearchText || '').trim().toLowerCase();
    if (!q) return this.reportList;
    return this.reportList.filter(r =>
      (r.JobCard2Code   || '').toLowerCase().includes(q) ||
      (r.JobCard1Code   || '').toLowerCase().includes(q) ||
      (r.BOMCode        || '').toLowerCase().includes(q) ||
      (r.DGProductCode  || '').toLowerCase().includes(q)
    );
  }

  displayedColumns = [
    { key: 'SrNo', label: 'Sr' },
    { key: 'jobcard2Qty', label: 'Qty' },
    { key: 'Stage3Qty', label: 'St3 Qty' },
    { key: 'JobCard1Qty', label: 'JC1 Qty' },
    { key: 'KVA', label: 'KVA' },
    { key: 'Phase', label: 'Phase' },
    { key: 'Model', label: 'Model' },
    { key: 'DGPanel', label: 'DG Panel' },
    { key: 'PanelType', label: 'Panel Type' },
    { key: 'DGStk', label: 'CPStk(DG)' },
    { key: 'CPStk', label: 'CPStk(CP)' },
    { key: 'PartCode', label: 'Part Code' },
    { key: 'BOMCode', label: 'BOM Code' },
  ];

  constructor(private jobcard2Service: Jobcard2Service) {}

  ngOnInit(): void {
    this.compCode = localStorage.getItem('companyId')?.trim() ?? '';
    this.pcCode_act = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    this.pcCode_old = localStorage.getItem('ProfitCenter_old')?.trim() ?? '';
    const pcName = localStorage.getItem('profitCenterName')?.trim() ?? '';
    this.pcDisplay = pcName && this.pcCode_old ? `${pcName} --> ${this.pcCode_old}` : pcName || this.pcCode_old;
    this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
    this.loadPanelTypes();
    this.initReportRange();
    this.loadReport();
  }

  // ── Default report range: 1st of current month → today ────────
  initReportRange(): void {
    const now   = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    this.reportFromDate = formatDate(first, 'yyyy-MM-dd', 'en-US');
    this.reportToDate   = formatDate(now,   'yyyy-MM-dd', 'en-US');
  }

  // ── Fetch JobCard 2 production report ─────────────────────────
  loadReport(): void {
    if (!this.compCode || !this.pcCode_act) return;
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

    this.jobcard2Service
      .getJobCard2Report(this.compCode, this.pcCode_act, this.reportFromDate, this.reportToDate)
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

  getQtyClass(_row: JobCard2ReportRow): string {
    return 'jc-qty-pending';
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
        'SrNo':              i + 1,
        'JobCard 2 Code':    r.JobCard2Code,
        'JobCard 1 Code':    r.JobCard1Code,
        'Auth Status':       r.JobCardAuthStatus,
        'JobCard Status':    r.JobCardStatus,
        'Jobcard Date':      r.JobDate,
        'Plan No':           r.PlanNo,
        'BOM Code':          r.BOMCode || '',
        'Part Code':         r.DGProductCode,
        'KVA':               r.KVA,
        'Phase':             r.Phase,
        'Model':             r.Model || '',
        'Panel Type':        r.PanelType,
        'Control Panel':     r.ControlPanel || '',
        'DG Description':    r.DGProductDesc,
        'Planned Qty':       r.PlannedQty,
        'Engine':            r.EngineSrNo || '',
        'Alternator':        r.AlternatorSrNo || '',
        'Battery 1':         r.Battery1SrNo || '',
        'Battery 2':         r.Battery2SrNo || '',
        'Battery 3':         r.Battery3SrNo || '',
        'Battery 4':         r.Battery4SrNo || '',
        'Canopy':            r.CanopySrNo || '',
        'KRM':               r.KRMSrNo || '',
        'Control Panel 1':   r.ControlPanel1SrNo || '',
        'Control Panel 2':   r.ControlPanel2SrNo || '',
        'Stage 3':           r.Stage3,
        'TR Status':         r.TRStatus,
        'PDIR Status':       r.PDIRStatus,
        'Remark':            r.Remark || '',
        'Assembly Line':     r.AssemblyLine || '',
        'Financial Year':    r.FinancialYear || '',
        'Company Code':      r.CompanyCode || ''
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Jobcard 2 Report');

      const safe = (s: string) => (s || '').replace(/[\\/:*?"<>|]/g, '-');
      const filename = `Jobcard2_Report_${safe(this.reportFromDate)}_to_${safe(this.reportToDate)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Failed to generate Excel:', err);
      alert('Failed to generate Excel. Please try again.');
    } finally {
      this.isLoadingExcel = false;
    }
  }

  // ── Download QR Code PDF for one report row ───────────────────
  async downloadReportQrPdf(row: JobCard2ReportRow, index: number): Promise<void> {
    if (this.qrPdfRowIndex !== -1) return;
    if (row.JobCardAuthStatus !== 'Authorized') {
      alert(
        `Cannot download QR Code PDF.\n\n` +
        `JobCard 2 ${row.JobCard2Code} is currently "${row.JobCardAuthStatus}".\n` +
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

      // Components — JobCard 2 has the 7 standard plus KRM + 2 control panels.
      const items: { label: string; desc: string; serial: string }[] = [];
      const push = (label: string, desc: string | null | undefined, serial: string | null | undefined) => {
        const s = (serial ?? '').trim();
        if (s) items.push({ label, desc: (desc ?? '').trim(), serial: s });
      };
      push('Engine',          row.EngineDesc,         row.EngineSrNo);
      push('Alternator',      row.AlternatorDesc,     row.AlternatorSrNo);
      push('Battery 1',       row.Battery1Desc,       row.Battery1SrNo);
      push('Battery 2',       row.Battery2Desc,       row.Battery2SrNo);
      push('Battery 3',       row.Battery3Desc,       row.Battery3SrNo);
      push('Battery 4',       row.Battery4Desc,       row.Battery4SrNo);
      push('Canopy',          row.CanopyDesc,         row.CanopySrNo);
      push('KRM',             row.KRMDesc,            row.KRMSrNo);
      push('Control Panel 1', row.ControlPanel1Desc,  row.ControlPanel1SrNo);
      push('Control Panel 2', row.ControlPanel2Desc,  row.ControlPanel2SrNo);

      if (items.length === 0) {
        alert('No serial numbers available for this plan.');
        return;
      }

      const priority = row.PlanNo;
      const planDate = this.formatPlanDate(row.JobDate);

      const pdf   = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageW - margin * 2;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text('Jobcard 2 — Serial QR Codes', pageW / 2, margin + 6, { align: 'center' });

      const kv = (label: string, value: string, x: number, y: number, labelW = 22) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(label, x, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value || '-', x + labelW, y);
      };

      // Line 1 — JobCard 2 | JobCard 1 | JC2 Date
      let y = margin + 14;
      const colW = usableW / 3;
      kv('JC2:',     row.JobCard2Code || '-', margin,            y, 13);
      kv('JC1:',     row.JobCard1Code || '-', margin + colW,     y, 13);
      kv('JC2Date:', planDate,                margin + colW * 2, y, 18);

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
      kv('KVA:',      String(row.KVA ?? '-'),    margin,            y, 14);
      kv('Phase:',    row.Phase || '-',          margin + c4,       y, 16);
      kv('Model:',    row.Model || '-',          margin + c4 * 2,   y, 16);
      kv('Priority:', String(priority),          margin + c4 * 3,   y, 20);

      // Divider
      y += 4;
      pdf.setDrawColor(160);
      pdf.setLineWidth(0.4);
      pdf.line(margin, y, pageW - margin, y);

      // Component table — Component | Description | Serial No | QR | Remark
      const colComp   = 30;
      const colDesc   = 56;
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
      const rowH       = Math.min(28, Math.max(20, availH / items.length));
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
        const dStartY = rowY + (rowH - dLines.length * 3.5) / 2 + 3;
        pdf.text(dLines, xDesc + 2, dStartY);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        const sLines: string[] = pdf.splitTextToSize(item.serial, colSerial - 4);
        const sStartY = rowY + (rowH - sLines.length * 3.8) / 2 + 3;
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

      const safeJob = (row.JobCard2Code || 'JobCard2')
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

  private formatPlanDate(s: string | undefined): string {
    if (!s) return '-';
    const parts = s.split('/');
    if (parts.length !== 3) return s;
    const [dd, mm, yyyy] = parts;
    const d = new Date(+yyyy, +mm - 1, +dd);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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

  loadPanelTypes(): void {
    this.jobcard2Service.getCPDetails().subscribe({
      next: (res: any[]) => {
        this.panelTypeOptions = (res ?? []).map(opt => ({
          PanelTypeName: (opt.PanelTypeName || '').trim(),
          PanelTypeCode: (opt.PanelTypeCode || '').trim(),
        }));
      },
      error: (err: any) => {
        console.error('Error fetching panel types:', err);
      }
    });
  }

  onSearch(): void {
    this.isLoading = true;
    this.dataSource = [];
    this.clearMessages();

    this.jobcard2Service.getJobCard2Data(this.compCode, this.pcCode_act).subscribe({
      next: (res: any[]) => {
        this.dataSource = (res ?? []).map(row => ({ ...row, PanelType: row.PanelType || '0' }));
        this.isLoading = false;
        if (this.dataSource.length === 0) {
          this.warningMessage = 'No records found.';
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to fetch data. Please try again.';
        console.error('Error fetching data:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.dataSource.length === 0) {
      this.warningMessage = 'Please search for model details first.';
      return;
    }

    const selectedRows = this.dataSource
      .filter(row => Number(row.jobcard2Qty) > 0)
      .map(row => ({
        BOMCode: row.BOMCode ?? null,
        CPStk: row.CPStk != null ? Number(row.CPStk) : null,
        DGPanel: row.DGPanel ?? null,
        DGStk: row.DGStk != null ? Number(row.DGStk) : null,
        JobCard1Qty: row.JobCard1Qty != null ? Number(row.JobCard1Qty) : null,
        KVA: row.KVA != null ? Number(row.KVA) : null,
        Model: row.Model ?? null,
        PanelType: row.PanelType && row.PanelType !== '' ? row.PanelType : 'None',
        PartCode: row.PartCode ?? null,
        Phase: row.Phase != null ? String(row.Phase) : null,
        Stage3Qty: row.Stage3Qty != null ? Number(row.Stage3Qty) : null,
        Jobcard2Qty: String(row.jobcard2Qty),
      }));

    if (selectedRows.length === 0) {
      this.warningMessage = 'Please enter quantity for at least one model.';
      return;
    }

    const payload = {
      PCCode: this.pcCode_old,
      PCCode_Act: this.pcCode_act,
      Remark: this.remarkText,
      JobCard2Dts: selectedRows,
    };

    this.isSubmitting = true;
    this.clearMessages();

    this.jobcard2Service.submitJobcard2Details(payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        const msg = response.Message || '';
        const warningPrefixes = [
          'Insufficient Stock For Part',
          'Panel Not Selected For DG',
          'JobCard1(Without Panel) Not available For DG',
          'Engine SrNo Not available For DG',
          'Alternator SrNo Not available For DG',
          'Battery SrNo Not available For DG',
          'Canopy SrNo Not available For DG',
          'CP SrNo Not available For DG',
        ];
        if (warningPrefixes.some(p => msg.startsWith(p))) {
          this.warningMessage = msg;
        } else {
          this.successMessage = msg || 'JobCard submitted successfully.';
          this.remarkText = '';
          this.dataSource = [];
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error || 'Failed to submit data. Please try again.';
        console.error('Submit error:', err);
      }
    });
  }

  onPanelTypeChange(row: any): void {
    const selectedOption = this.panelTypeOptions.find(opt => opt.PanelTypeCode === row.PanelType);
    if (selectedOption && selectedOption.PanelTypeName.trim().toLowerCase() === 'none') {
      this.jobcard2Service.getCPStk(row.KVA, row.PartCode, 'None', this.compCode, this.pcCode_act).subscribe({
        next: (response: string) => {
          const cleaned = response.replace(/"/g, '').trim();
          const parts = cleaned.split('-->');
          if (parts.length === 2) {
            row.DGStk = parts[0].trim();
            row.CPStk = parts[1].trim();
          }
        },
        error: (err) => console.error('Error fetching CPStk:', err)
      });
    }
  }

  validateQty(row: any): void {
    const max = Number(row.Stage3Qty) || 0;
    let val = Number(row.jobcard2Qty) || 0;
    if (val < 0) val = 0;
    if (val > max) val = max;
    row.jobcard2Qty = val;
  }

  incrementQty(row: any): void {
    const max = Number(row.Stage3Qty) || 0;
    const current = Number(row.jobcard2Qty) || 0;
    if (current < max) {
      row.jobcard2Qty = current + 1;
    }
  }

  decrementQty(row: any): void {
    const current = Number(row.jobcard2Qty) || 0;
    if (current > 0) {
      row.jobcard2Qty = current - 1;
    }
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.warningMessage = '';
  }
}
