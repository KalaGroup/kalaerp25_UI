import { Component, OnInit } from '@angular/core';
import {
  CanopyAssemblyProcessCheckerService,
  CanopyCheckDecision,
  CanopyProcessCheckContext,
  CanopyProcessCheckHeader,
  CanopyProcessCheckKitLine,
  CanopyProcessCheckPendingRow,
  CanopyProcessCheckReportRow,
  CanopyProcessCheckSerialUnit,
  LineRight,
} from './canopy-assembly-process-checker.service';

// Extends the DTO unit with the per-row decision state the UI captures.
interface CheckUnitRow extends CanopyProcessCheckSerialUnit {
  Decision: CanopyCheckDecision;
  SixM:     string;
  RaiseESP: string;
  Remark:   string;
}

interface SixMOption { value: string; label: string; }

@Component({
  selector: 'app-canopy-assembly-process-checker',
  standalone: false,
  templateUrl: './canopy-assembly-process-checker.component.html',
  styleUrl: './canopy-assembly-process-checker.component.scss',
})
export class CanopyAssemblyProcessCheckerComponent implements OnInit {
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
  pending: CanopyProcessCheckPendingRow[] = [];
  isLoadingPending: boolean = false;

  // UI-only pagination — same idiom as dg-stage-i-checker.
  currentPage: number = 1;
  pageSize: number = 25;
  pageSizeOptions: number[] = [25, 50, 100, 250, 500, 0];

  // ── Modal state ──────────────────────────────────────────────
  isModalOpen: boolean = false;
  isLoadingContext: boolean = false;
  selectedPFB: string = '';
  ctxHeader: CanopyProcessCheckHeader | null = null;
  ctxKitLines: CanopyProcessCheckKitLine[] = [];
  ctxAssemblyKitLines: CanopyProcessCheckKitLine[] = [];
  unitRows: CheckUnitRow[] = [];

  // ── Feature flag ─────────────────────────────────────────────
  // v1 ships Accept-only. Reject / Rework flows exist in code (bulk buttons,
  // Decision dropdown, 6M dropdown, Raise ESP input, defect-panel scaffolding)
  // but the UI hides them behind this flag. Flip to `true` when the business
  // wants to enable the full checker workflow.
  readonly showRejectRework: boolean = false;

  // ── Save state ───────────────────────────────────────────────
  isSaving: boolean = false;

  // ── Modals (confirm / error / success) ───────────────────────
  successMessage: string = '';
  errorMessage: string = '';
  confirmMessage: string = '';

  // ── Date-range Report state ──────────────────────────────────
  reportFromDate: string = '';
  reportToDate: string = '';
  reportList: CanopyProcessCheckReportRow[] = [];
  isLoadingReport: boolean = false;
  reportError: string = '';
  reportSearchText: string = '';
  isLoadingExcel: boolean = false;

  // ── 6M options + decision options ────────────────────────────
  readonly sixMOptions: SixMOption[] = [
    { value: 'None',        label: 'None' },
    { value: 'Man',         label: 'Man' },
    { value: 'Machine',     label: 'Machine' },
    { value: 'Material',    label: 'Material' },
    { value: 'Method',      label: 'Method' },
    { value: 'Measurement', label: 'Measurement' },
    { value: 'Environment', label: 'Environment' },
  ];

  readonly decisionOptions: { value: CanopyCheckDecision; label: string }[] = [
    { value: 'Accept', label: 'Accept' },
    { value: 'Rework', label: 'Rework' },
    { value: 'Reject', label: 'Reject' },
  ];

  constructor(private checkerService: CanopyAssemblyProcessCheckerService) {}

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

  // ── Default report range: 1st of current month → today ────────
  private initReportRange(): void {
    const now   = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    this.reportFromDate = this.toIsoDate(first);
    this.reportToDate   = this.toIsoDate(now);
  }

  // Filter the report list by free-text search — matches PFB, Product,
  // Plan, BOM, Maker code, Machine.
  get filteredReportList(): CanopyProcessCheckReportRow[] {
    const q = (this.reportSearchText || '').trim().toLowerCase();
    if (!q) return this.reportList;
    return this.reportList.filter(r =>
      (r.PFBCode      || '').toLowerCase().includes(q) ||
      (r.ProductDesc  || '').toLowerCase().includes(q) ||
      (r.ProductCode  || '').toLowerCase().includes(q) ||
      (r.PlanCode     || '').toLowerCase().includes(q) ||
      (r.BOMCode      || '').toLowerCase().includes(q) ||
      (r.MakerCode    || '').toLowerCase().includes(q) ||
      (r.MachineCode  || '').toLowerCase().includes(q) ||
      (r.Model        || '').toLowerCase().includes(q));
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
      this.selectedLineWisePC, this.reportFromDate, this.reportToDate,
    ).subscribe({
      next: (rows) => {
        this.reportList = rows ?? [];
        this.isLoadingReport = false;
      },
      error: (err) => {
        this.isLoadingReport = false;
        this.reportList = [];
        this.reportError = this.extractErr(err, 'Failed to load report.');
      },
    });
  }

  // ── Excel export (matches jobcard1-checker format) ────────────
  async downloadReportExcel(): Promise<void> {
    if (this.isLoadingExcel) return;
    if (this.reportList.length === 0) {
      this.errorMessage = 'No records to export. Please load the report first.';
      return;
    }
    this.isLoadingExcel = true;
    try {
      if (!(window as any).XLSX) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      }
      const XLSX = (window as any).XLSX;
      if (!XLSX) {
        this.errorMessage = 'Excel library failed to load. Please check your connection and try again.';
        return;
      }
      const source = this.filteredReportList.length > 0 ? this.filteredReportList : this.reportList;
      const rows = source.map((r, i) => ({
        'SrNo':          i + 1,
        'PFB Code':      r.PFBCode,
        'Date':          r.Dt,
        'Plan Code':     r.PlanCode,
        'BOM Code':      r.BOMCode,
        'Canopy Type':   r.MachineCode,
        'Product Code':  r.ProductCode,
        'Canopy':        r.ProductDesc,
        'KVA':           r.KVA,
        'Model':         r.Model,
        'Batch Qty':     r.BatchQty,
        'Prc Qty':       r.PrcQty,
        'Maker':         r.MakerCode,
        'Total Units':   r.TotalUnitCount,
        'Accepted':      r.AcceptedCount,
        'Rework':        r.ReworkCount,
        'Rejected':      r.RejectedCount,
        'Pending':       r.PendingUnitCount,
        'Status':        r.Status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Canopy Process Check');
      const safe = (s: string) => (s || '').replace(/[\\/:*?"<>|]/g, '-');
      const filename = `CanopyProcessCheck_${safe(this.selectedLineWisePC)}_${safe(this.reportFromDate)}_to_${safe(this.reportToDate)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      this.errorMessage = 'Failed to generate Excel. Please try again.';
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
        this.errorMessage = this.extractErr(err, 'Failed to load pending list.');
      },
    });
  }

  // ── Line-wide throughput counters (drives the section-title summary) ──
  get pendingCount(): number {
    return this.pending.filter(r => (r.Status || '').toLowerCase() === 'pending').length;
  }
  get authorizedCount(): number {
    return this.pending.filter(r => (r.Status || '').toLowerCase() === 'authorized').length;
  }

  // ── Pagination getters ───────────────────────────────────────
  get pagedPending(): CanopyProcessCheckPendingRow[] {
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
  onRowClick(row: CanopyProcessCheckPendingRow): void {
    this.selectedPFB = row.PFBCode;
    this.openModal();
  }

  private openModal(): void {
    this.isModalOpen = true;
    this.isLoadingContext = true;
    this.ctxHeader = null;
    this.ctxKitLines = [];
    this.ctxAssemblyKitLines = [];
    this.unitRows = [];

    this.checkerService.getContext(this.selectedPFB).subscribe({
      next: (ctx: CanopyProcessCheckContext | null) => {
        this.isLoadingContext = false;
        if (!ctx) {
          this.errorMessage = 'Could not load process detail.';
          this.closeModal();
          return;
        }
        this.ctxHeader = ctx.Header;
        this.ctxKitLines = ctx.KitLines ?? [];
        this.ctxAssemblyKitLines = ctx.AssemblyKitLines ?? [];
        // Only rows still pending (QPCStatus='P') get the check controls;
        // already-decided rows show as read-only.
        this.unitRows = (ctx.Units ?? []).map(u => ({
          ...u,
          Decision: 'Accept' as CanopyCheckDecision,
          SixM:     'None',
          RaiseESP: '',
          Remark:   '',
        }));
      },
      error: (err) => {
        this.isLoadingContext = false;
        this.errorMessage = this.extractErr(err, 'Failed to load process detail.');
        this.closeModal();
      },
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedPFB = '';
    this.ctxHeader = null;
    this.ctxKitLines = [];
    this.ctxAssemblyKitLines = [];
    this.unitRows = [];
  }

  // ── Per-row helpers ──────────────────────────────────────────
  // "Pending" = QPCStatus has NOT been explicitly decided yet.
  // Maker inserts 'OK' by default; checker sets 'D' / 'RW' / 'R'.
  // Anything else (OK, P, blank/null) counts as pending.
  isPending(u: CheckUnitRow): boolean {
    const s = (u.QPCStatus || '').trim().toUpperCase();
    return s !== 'D' && s !== 'RW' && s !== 'R';
  }

  onDecisionChange(u: CheckUnitRow): void {
    // If user drops back to Accept, clear the 6M/RaiseESP fields — they only
    // apply to Rework/Reject.
    if (u.Decision === 'Accept') {
      u.SixM = 'None';
      u.RaiseESP = '';
    }
  }

  on6MChange(u: CheckUnitRow): void {
    if (u.SixM === 'None' || !u.SixM) {
      u.RaiseESP = '';
    }
  }

  // Bulk actions
  setAllDecision(d: CanopyCheckDecision): void {
    for (const u of this.unitRows) {
      if (!this.isPending(u)) continue;
      u.Decision = d;
      if (d === 'Accept') { u.SixM = 'None'; u.RaiseESP = ''; }
    }
  }

  // ── Save ─────────────────────────────────────────────────────
  get pendingRowsCount(): number {
    return this.unitRows.filter(u => this.isPending(u)).length;
  }

  get decisionSummary(): { accept: number; rework: number; reject: number } {
    const s = { accept: 0, rework: 0, reject: 0 };
    for (const u of this.unitRows) {
      if (!this.isPending(u)) continue;
      if (u.Decision === 'Accept') s.accept++;
      else if (u.Decision === 'Rework') s.rework++;
      else if (u.Decision === 'Reject') s.reject++;
    }
    return s;
  }

  onSaveClick(): void {
    if (!this.ctxHeader) return;
    if (this.pendingRowsCount === 0) {
      this.errorMessage = 'No pending units to save.';
      return;
    }
    // Validate: every Rework unit must have 6M != None; every 6M != None unit
    // must have a Raise ESP employee filled.
    for (const u of this.unitRows) {
      if (!this.isPending(u)) continue;
      if (u.Decision === 'Rework' && (!u.SixM || u.SixM === 'None')) {
        this.errorMessage = `Rework unit ${u.SerialNo} — please pick a 6M category.`;
        return;
      }
      if (u.SixM && u.SixM !== 'None' && !u.RaiseESP.trim()) {
        this.errorMessage = `Unit ${u.SerialNo} has 6M = ${u.SixM} — Raise ESP (Employee) is required.`;
        return;
      }
    }
    const s = this.decisionSummary;
    this.confirmMessage = this.showRejectRework
      ? `Save check for ${this.ctxHeader.PFBCode}?\n\n` +
        `Accept: ${s.accept}  |  Rework: ${s.rework}  |  Reject: ${s.reject}`
      : `Accept ${s.accept} unit${s.accept === 1 ? '' : 's'} for ${this.ctxHeader.PFBCode}?`;
  }

  onConfirmSave(): void {
    this.confirmMessage = '';
    this.doSave();
  }

  onCancelConfirm(): void {
    this.confirmMessage = '';
  }

  private doSave(): void {
    if (!this.ctxHeader) return;
    this.isSaving = true;

    const decisions = this.unitRows
      .filter(u => this.isPending(u))
      .map(u => ({
        SerialNo: u.SerialNo,
        Decision: u.Decision,
        SixM:     u.SixM || 'None',
        RaiseESP: u.RaiseESP,
        Remark:   u.Remark,
      }));

    this.checkerService.save({
      EmpCode:     this.empCode,
      PCCode:      this.selectedLineWisePC,
      ParentDgPC:  this.selectedLineRight?.ParentDgPC ?? '',
      CompanyCode: this.companyCode || '01',
      PFBCode:     this.ctxHeader.PFBCode,
      ProductCode: this.ctxHeader.ProductCode,
      PlanCode:    this.ctxHeader.PlanCode || '',
      BatchQty:    Number(this.ctxHeader.BatchQty || 0),
      Decisions:   decisions,
    }).subscribe({
      next: (resp) => {
        this.isSaving = false;
        this.successMessage = resp?.Message
          || `Check saved for ${this.ctxHeader?.PFBCode}.`;
        this.closeModal();
        this.loadPending();
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = this.extractErr(err, 'Save failed.');
      },
    });
  }

  closeError(): void { this.errorMessage = ''; }
  closeSuccess(): void { this.successMessage = ''; }

  // ── Helpers ──────────────────────────────────────────────────
  trackByIndex = (i: number) => i;
  trackBySerial = (_i: number, u: CheckUnitRow) => u.SerialNo;

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
