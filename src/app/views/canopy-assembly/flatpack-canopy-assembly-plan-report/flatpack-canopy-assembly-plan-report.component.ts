import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  FlatpackCanopyAssemblyPlanReportService,
  FlatpackCanopyPlanRow,
  LineRight,
} from './flatpack-canopy-assembly-plan-report.service';

@Component({
  selector: 'app-flatpack-canopy-assembly-plan-report',
  standalone: false,
  templateUrl: './flatpack-canopy-assembly-plan-report.component.html',
  styleUrl: './flatpack-canopy-assembly-plan-report.component.scss',
})
export class FlatpackCanopyAssemblyPlanReportComponent implements OnInit {
  // ── Filter strip ──────────────────────────────────────────────
  fromDate: string = '';
  toDate: string = '';

  // ── Context (read-only, derived from localStorage) ────────────
  pcCode: string = '';
  pcName: string = '';

  // ── Line list (hardcoded, matches the Process page) ──────────
  // Three flat-pack lines, all sharing ParentDgPC 01.093. No backend fetch.
  readonly lineRights: LineRight[] = [
    { LineWisePC: '01.124', LineDesc: 'Unit 1 Line A Flat Packing', ParentDgPC: '01.093' },
    { LineWisePC: '01.125', LineDesc: 'Unit 1 Line B Flat Packing', ParentDgPC: '01.093' },
    { LineWisePC: '01.126', LineDesc: 'Unit 1 Line C Flat Packing', ParentDgPC: '01.093' },
  ];
  selectedLineWisePC: string = '';

  // ── Results table data ───────────────────────────────────────
  rows: FlatpackCanopyPlanRow[] = [];
  isLoading: boolean = false;
  loadError: string = '';

  // ── Pagination ───────────────────────────────────────────────
  currentPage: number = 1;
  pageSize: number = 25;
  pageSizeOptions: number[] = [25, 50, 100, 250, 500, 0]; // 0 == "All"

  // ── Status modals ────────────────────────────────────────────
  errorMessage: string = '';

  // Column labels for the grid — order matches the legacy Obout grid.
  readonly reportColumns: string[] = [
    'SrNo', 'PFBCode', 'Date', 'KVA', 'Phase', 'Model',
    'Canopy', 'FlatPackCanopy', 'ProfitCenter', 'BOMCode',
    'ProcessQty', 'Rate', 'Amount',
  ];

  constructor(
    private flatpackService: FlatpackCanopyAssemblyPlanReportService,
    private router: Router,
  ) {}

  // ── Add New ───────────────────────────────────────────────────
  // Replaces the legacy Obout-grid "Add New" popup that opened
  // FlatPackCanopyAssemblyProcess.aspx — now routed inline.
  onAddNew(): void {
    this.router.navigate(['/canopy-assembly/flatpack-canopy-assembly-process']);
  }

  ngOnInit(): void {
    // Legacy default: From = today − 6 days, To = today.
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 6);
    this.fromDate = this.toIsoDate(from);
    this.toDate = this.toIsoDate(today);

    // Profit Center info comes from the same localStorage keys used elsewhere.
    const rawPc = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    this.pcCode = rawPc === 'undefined' || rawPc === 'null' ? '' : rawPc;
    this.pcName = localStorage.getItem('profitCenterName')?.trim() ?? '';
  }

  get selectedLineRight(): LineRight | undefined {
    return this.lineRights.find(l => l.LineWisePC === this.selectedLineWisePC);
  }

  // ── Search ───────────────────────────────────────────────────
  onSearch(): void {
    if (!this.selectedLineWisePC) {
      this.errorMessage = 'Please select Line!';
      return;
    }
    if (!this.fromDate || !this.toDate) {
      this.errorMessage = 'Please choose both From Date and To Date.';
      return;
    }
    if (this.fromDate > this.toDate) {
      this.errorMessage = 'From Date cannot be after To Date.';
      return;
    }

    const pcForReport = this.selectedLineWisePC;

    this.isLoading = true;
    this.loadError = '';
    this.rows = [];
    this.currentPage = 1;

    this.flatpackService
      .getFlatPackCanopyPlanReport(pcForReport, this.fromDate, this.toDate)
      .subscribe({
        next: (data) => {
          this.rows = Array.isArray(data) ? data : [];
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.loadError =
            err?.error?.message || err?.message || 'Failed to load report.';
          this.errorMessage = this.loadError;
        },
      });
  }

  // ── Excel export — same idea as legacy Obout client-side export. ──
  onExportExcel(): void {
    if (this.filteredRows.length === 0) return;

    const header = this.reportColumns;
    const data = this.filteredRows.map((r, i) => [
      i + 1,
      r.PFBCode ?? '',
      r.PrcDt ?? '',
      r.KVA ?? '',
      r.Phase ?? '',
      r.Model ?? '',
      r.CanopyPartCode ?? '',
      r.NestingPartCode ?? '',
      r.ProfitCenter ?? '',
      r.BOMCode ?? '',
      r.ProcessQty ?? '',
      r.Rate ?? '',
      r.Amount ?? '',
    ]);

    const csv = [header, ...data]
      .map(row =>
        row.map(cell => {
          const s = String(cell ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(','),
      )
      .join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FlatPackCanopyPlanReport_${this.fromDate}_to_${this.toDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Pagination ───────────────────────────────────────────────
  get filteredRows(): FlatpackCanopyPlanRow[] {
    return this.rows;
  }

  get pagedRows(): FlatpackCanopyPlanRow[] {
    if (this.pageSize === 0) return this.filteredRows;
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    if (this.pageSize === 0) return 1;
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
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

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  rowDisplayIndex(rowInPage: number): number {
    if (this.pageSize === 0) return rowInPage + 1;
    return (this.currentPage - 1) * this.pageSize + rowInPage + 1;
  }

  get recordRangeLabel(): string {
    const total = this.filteredRows.length;
    if (total === 0) return '0 of 0';
    if (this.pageSize === 0) return `1–${total} of ${total}`;
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `${start}–${end} of ${total}`;
  }

  get totalAmount(): number {
    return this.filteredRows.reduce(
      (sum, r) => sum + (Number(r.Amount) || 0),
      0,
    );
  }

  closeErrorModal(): void {
    this.errorMessage = '';
  }

  // Local helper — yyyy-MM-dd for <input type="date">
  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
