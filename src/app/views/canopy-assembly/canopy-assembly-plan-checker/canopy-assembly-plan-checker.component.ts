import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import {
  CanopyAssemblyPlanCheckerService,
  CanopyPlanCheckContext,
  CanopyPlanCheckDetailRow,
  CanopyPlanCheckHeader,
  CanopyPlanCheckPendingRow,
  CanopyPlanCheckReportRow,
  LineRight,
} from './canopy-assembly-plan-checker.service';

@Component({
  selector: 'app-canopy-assembly-plan-checker',
  standalone: false,
  templateUrl: './canopy-assembly-plan-checker.component.html',
  styleUrl: './canopy-assembly-plan-checker.component.scss',
})
export class CanopyAssemblyPlanCheckerComponent implements OnInit {
  // ── Context (from localStorage) ──────────────────────────────
  pcCode: string = '';
  pcName: string = '';
  companyCode: string = '';
  empCode: string = '';
  todayIso: string = '';

  // ── Line-rights dropdown ─────────────────────────────────────
  prmCode: string = '';
  lineRights: LineRight[] = [];
  selectedLineWisePC: string = '';

  // ── Pending list state ───────────────────────────────────────
  pending: CanopyPlanCheckPendingRow[] = [];
  isLoadingPending: boolean = false;

  // UI-only pagination
  currentPage: number = 1;
  pageSize: number = 25;
  pageSizeOptions: number[] = [25, 50, 100, 250, 500, 0];

  // ── Modal state ──────────────────────────────────────────────
  isModalOpen: boolean = false;
  isLoadingContext: boolean = false;
  selectedCP: string = '';
  ctxHeader: CanopyPlanCheckHeader | null = null;
  ctxDetails: CanopyPlanCheckDetailRow[] = [];
  modalRemark: string = '';

  // ── Save state ───────────────────────────────────────────────
  isSaving: boolean = false;

  // ── Confirm / error / success modals ─────────────────────────
  successMessage: string = '';
  errorMessage: string = '';
  confirmMessage: string = '';

  // ── Feature flag ─────────────────────────────────────────────
  // v1 ships Accept-only. Reject / Rework hidden behind this flag —
  // backend accepts the strings for future re-enablement.
  readonly showRejectRework: boolean = false;

  // ── Report state ─────────────────────────────────────────────
  reportFromDate: string = '';
  reportToDate:   string = '';
  reportList:     CanopyPlanCheckReportRow[] = [];
  isLoadingReport: boolean = false;
  isLoadingExcel:  boolean = false;
  reportError:     string = '';
  reportSearchText: string = '';

  constructor(private checkerService: CanopyAssemblyPlanCheckerService) {}

  ngOnInit(): void {
    const rawPc = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    this.pcCode      = rawPc === 'undefined' || rawPc === 'null' ? '' : rawPc;
    this.pcName      = localStorage.getItem('profitCenterName')?.trim() ?? '';
    this.companyCode = localStorage.getItem('companyId')?.trim() ?? '01';
    this.empCode     = localStorage.getItem('employeeCode')?.trim() ?? '';
    this.prmCode     = localStorage.getItem('positionRoleId')?.trim() ?? '';
    this.todayIso    = this.toIsoDate(new Date());
    this.initReportRange();
    this.loadLineRights();
  }

  // ── Line rights ──────────────────────────────────────────────
  get selectedLineRight(): LineRight | undefined {
    return this.lineRights.find(l => l.LineWisePC === this.selectedLineWisePC);
  }

  private loadLineRights(): void {
    if (!this.prmCode) { this.lineRights = []; return; }
    this.checkerService.getLineRights(this.prmCode).subscribe({
      next: (rows) => {
        this.lineRights = Array.isArray(rows) ? rows : [];
        if (this.lineRights.length === 1) {
          this.selectedLineWisePC = this.lineRights[0].LineWisePC;
          this.loadPending();
        }
      },
      error: () => { this.lineRights = []; },
    });
  }

  onLineChange(): void {
    this.pending = [];
    this.currentPage = 1;
    this.reportList = [];
    this.reportError = '';
    this.reportSearchText = '';
    if (!this.selectedLineWisePC) return;
    this.loadPending();
  }

  // ── Pending list ─────────────────────────────────────────────
  loadPending(): void {
    if (!this.selectedLineWisePC) return;
    this.isLoadingPending = true;
    this.checkerService.getPendingList(this.selectedLineWisePC).subscribe({
      next: (rows) => {
        this.pending = rows ?? [];
        this.isLoadingPending = false;
        this.currentPage = 1;
      },
      error: (err) => {
        this.isLoadingPending = false;
        this.errorMessage = this.extractErr(err, 'Failed to load pending plan list.');
      },
    });
  }

  // ── Pagination getters ───────────────────────────────────────
  get pagedPending(): CanopyPlanCheckPendingRow[] {
    if (this.pageSize === 0) return this.pending;
    const start = (this.currentPage - 1) * this.pageSize;
    return this.pending.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    if (this.pageSize === 0) return 1;
    return Math.max(1, Math.ceil(this.pending.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(this.currentPage - 3, total - 6));
    return Array.from({ length: 7 }, (_, i) => start + i);
  }

  goToPage(n: number): void {
    if (n < 1 || n > this.totalPages) return;
    this.currentPage = n;
  }

  onPageSizeChange(): void { this.currentPage = 1; }

  rowDisplayIndex(rowInPage: number): number {
    if (this.pageSize === 0) return rowInPage + 1;
    return (this.currentPage - 1) * this.pageSize + rowInPage + 1;
  }

  get recordRangeLabel(): string {
    const total = this.pending.length;
    if (total === 0) return '0 of 0';
    if (this.pageSize === 0) return `1-${total} of ${total}`;
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `${start}-${end} of ${total}`;
  }

  // ── Modal open / close ───────────────────────────────────────
  onRowClick(row: CanopyPlanCheckPendingRow): void {
    this.selectedCP = row.CPCode;
    this.openModal();
  }

  private openModal(): void {
    this.isModalOpen = true;
    this.isLoadingContext = true;
    this.ctxHeader = null;
    this.ctxDetails = [];
    this.modalRemark = '';

    this.checkerService.getContext(this.selectedCP).subscribe({
      next: (ctx: CanopyPlanCheckContext | null) => {
        this.isLoadingContext = false;
        if (!ctx) {
          this.errorMessage = 'Could not load plan detail.';
          this.closeModal();
          return;
        }
        this.ctxHeader = ctx.Header;
        this.ctxDetails = ctx.Details ?? [];
      },
      error: (err) => {
        this.isLoadingContext = false;
        this.errorMessage = this.extractErr(err, 'Failed to load plan detail.');
        this.closeModal();
      },
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedCP = '';
    this.ctxHeader = null;
    this.ctxDetails = [];
    this.modalRemark = '';
  }

  // ── Header helpers ───────────────────────────────────────────
  // PlanStatus now carries CanopyPlan.Checker1 as a string bit:
  //   '1' = Authorized (checker approved)
  //   '0' or empty = Pending
  isPendingPlan(status: string): boolean {
    return (status || '').trim() !== '1';
  }

  // ── Save ─────────────────────────────────────────────────────
  onAcceptClick(): void {
    if (!this.ctxHeader) return;
    if (!this.isPendingPlan(this.ctxHeader.PlanStatus)) {
      this.errorMessage = 'This plan is already authorized. No action needed.';
      return;
    }
    this.confirmMessage = `Accept plan ${this.ctxHeader.CPCode}?`;
  }

  onConfirmAccept(): void {
    this.confirmMessage = '';
    this.doSave('Accept');
  }

  onCancelConfirm(): void {
    this.confirmMessage = '';
  }

  private doSave(decision: 'Accept' | 'Rework' | 'Reject'): void {
    if (!this.ctxHeader) return;
    this.isSaving = true;
    this.checkerService.save({
      EmpCode:     this.empCode,
      PCCode:      this.selectedLineWisePC,
      ParentDgPC:  this.selectedLineRight?.ParentDgPC ?? '',
      CompanyCode: this.companyCode || '01',
      CPCode:      this.ctxHeader.CPCode,
      Decision:    decision,
      Remark:      this.modalRemark || '',
    }).subscribe({
      next: (resp) => {
        this.isSaving = false;
        this.successMessage = resp?.Message
          || `Plan ${this.ctxHeader?.CPCode} — ${decision} recorded.`;
        this.closeModal();
        this.loadPending();
        // Refresh report if any rows are loaded
        if (this.reportList.length > 0) this.loadReport();
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = this.extractErr(err, 'Save failed.');
      },
    });
  }

  closeError(): void { this.errorMessage = ''; }
  closeSuccess(): void { this.successMessage = ''; }

  // ── Report ───────────────────────────────────────────────────
  // Default report range: 1st of current month → today.
  initReportRange(): void {
    const now   = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    this.reportFromDate = formatDate(first, 'yyyy-MM-dd', 'en-US');
    this.reportToDate   = formatDate(now,   'yyyy-MM-dd', 'en-US');
  }

  loadReport(): void {
    this.reportError = '';
    if (!this.selectedLineWisePC) {
      this.reportError = 'Please select a line first.';
      return;
    }
    if (!this.reportFromDate || !this.reportToDate) {
      this.reportError = 'Please select From and To dates.';
      return;
    }
    if (this.reportFromDate > this.reportToDate) {
      this.reportError = 'From Date cannot be after To Date.';
      return;
    }

    this.isLoadingReport = true;
    this.checkerService.getReport(
      this.selectedLineWisePC,
      this.reportFromDate,
      this.reportToDate,
    ).subscribe({
      next: (rows) => {
        this.reportList = rows ?? [];
        this.isLoadingReport = false;
      },
      error: (err) => {
        this.isLoadingReport = false;
        this.reportError = this.extractErr(err, 'Failed to load report.');
      },
    });
  }

  get filteredReportList(): CanopyPlanCheckReportRow[] {
    const q = (this.reportSearchText || '').trim().toLowerCase();
    if (!q) return this.reportList;
    return this.reportList.filter(r =>
      (r.CPCode      || '').toLowerCase().includes(q) ||
      (r.PlanPCCode  || '').toLowerCase().includes(q) ||
      (r.MakerCode   || '').toLowerCase().includes(q) ||
      (r.PlanType    || '').toLowerCase().includes(q) ||
      (r.KVAs        || '').toLowerCase().includes(q) ||
      (r.PartCodes   || '').toLowerCase().includes(q) ||
      (r.Status      || '').toLowerCase().includes(q)
    );
  }

  async downloadReportExcel(): Promise<void> {
    if (this.isLoadingExcel) return;
    const source = this.filteredReportList.length > 0
      ? this.filteredReportList : this.reportList;
    if (source.length === 0) {
      this.reportError = 'No records to export. Please load the report first.';
      return;
    }

    this.isLoadingExcel = true;
    try {
      if (!(window as any).XLSX) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      }
      const XLSX = (window as any).XLSX;
      if (!XLSX) {
        this.reportError = 'Excel library failed to load. Check your connection and try again.';
        return;
      }

      const rows = source.map((r, i) => ({
        'SrNo':          i + 1,
        'CP Code':       r.CPCode,
        'Date':          r.Dt,
        'From Date':     r.FromDt,
        'To Date':       r.ToDt,
        'Plan PC':       r.PlanPCCode,
        'Plan Type':     r.PlanType,
        'KVA':           r.KVAs,
        'Part Code':     r.PartCodes,
        'Plan Status':   r.PlanStatus,
        'Status':        r.Status,
        'Maker':         r.MakerCode,
        'Company':       r.CompanyCode,
        'Detail Rows':   r.DetailRowCount,
        'Plan Qty':      r.TotalPlanQty,
        'WIP Qty':       r.TotalWIPQty,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Canopy Plan Check');

      const safe = (s: string) => (s || '').replace(/[\\/:*?"<>|]/g, '-');
      const filename = `CanopyPlanCheck_${safe(this.selectedLineWisePC)}_${safe(this.reportFromDate)}_to_${safe(this.reportToDate)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Failed to generate Excel:', err);
      this.reportError = 'Failed to generate Excel. Please try again.';
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

  // ── Helpers ──────────────────────────────────────────────────
  trackByIndex = (i: number) => i;

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
}
