import { Component, OnInit } from '@angular/core';
import {
  JobcardMttrReportService,
  JobcardMttrRow,
  LineRight,
} from './jobcard-mttr_report-service.service';

@Component({
  selector: 'app-jobcard-mttr-report',
  templateUrl: './jobcard-mttr_report.component.html',
  styleUrl: './jobcard-mttr_report.component.scss',
  standalone: false,
})
export class JobcardMttrReportComponent implements OnInit {
  // ── Line dropdown (loaded from backend) ───────────────────────
  // Populated by DGAssemblly/GetLineRights keyed on positionRoleId from
  // localStorage — same pattern used across canopy-assembly-plan /
  // canopy-assembly-process / dg-stage-* forms.
  prmCode: string = '';
  lineRights: LineRight[] = [];
  selectedLineWisePC: string = '';
  isLoadingLines: boolean = false;

  // ── Filter strip state ────────────────────────────────────────
  // stageList order + labels match the legacy Angular v11 form so operators
  // trained on the old UI don't have to re-learn the picker.
  readonly stageList: string[] = [
    'JobCard1',
    'Stage1Start', 'Stage1End',
    'Stage2Start', 'Stage2End',
    'JobCard2',
    'Stage3Start', 'Stage3End',
    'TRStart', 'DGStart', 'DGEnd', 'TREnd',
    'PSStart', 'PSEnd',
    'Invoice',
  ];
  selectedSearchCode: string = 'JobCard1';

  fromDate: string = '';
  toDate:   string = '';

  // ── Results ───────────────────────────────────────────────────
  rows: JobcardMttrRow[] = [];
  columns: string[] = [];      // derived from the first result row
  isLoading: boolean = false;
  isLoadingExcel: boolean = false;
  errorMessage: string = '';

  constructor(private mttrService: JobcardMttrReportService) {}

  ngOnInit(): void {
    // Legacy defaults — From = yesterday, To = today (matching the .NET/Angular v11 code).
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    this.fromDate = this.toIsoDate(yesterday);
    this.toDate   = this.toIsoDate(today);

    this.prmCode = localStorage.getItem('positionRoleId')?.trim() ?? '';
    this.loadLineRights();
  }

  // Resolved LineRight for the currently selected LineWisePC.
  get selectedLineRight(): LineRight | undefined {
    return this.lineRights.find(l => l.LineWisePC === this.selectedLineWisePC);
  }

  // ── Line-rights load ──────────────────────────────────────────
  // Uses positionRoleId (NOT ProfitCenter) — same key PositionLineRights.PrmCode
  // stores; same convention as canopy-assembly-plan.
  private loadLineRights(): void {
    if (!this.prmCode) { this.lineRights = []; return; }
    this.isLoadingLines = true;
    this.mttrService.getLineRights(this.prmCode).subscribe({
      next: (rows) => {
        this.lineRights = Array.isArray(rows) ? rows : [];
        this.isLoadingLines = false;
        // Auto-select if the position is entitled to a single line — matches
        // the other canopy / DG forms so single-line users don't have to click.
        if (this.lineRights.length === 1) {
          this.selectedLineWisePC = this.lineRights[0].LineWisePC;
        }
      },
      error: (err) => {
        this.isLoadingLines = false;
        this.errorMessage =
          err?.error?.message ?? err?.message ?? 'Failed to load Line list.';
      },
    });
  }

  // ── Search ───────────────────────────────────────────────────
  onSearch(): void {
    this.errorMessage = '';

    if (!this.selectedLineWisePC) {
      this.errorMessage = 'Please select a Line.';
      return;
    }
    if (!this.selectedSearchCode) {
      this.errorMessage = 'Please pick a Search By option.';
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

    // CompanyCode = first two chars of LineWisePC. Line 01.106 → '01', 28.037 → '28'.
    // Kept here (not from localStorage) so the row set always matches the line the
    // operator actually picked.
    const companyCode = this.selectedLineWisePC.substring(0, 2);

    this.isLoading = true;
    this.rows = [];
    this.columns = [];

    this.mttrService
      .getMttrReport(
        companyCode,
        this.selectedLineWisePC,      // assemblyLine
        this.selectedSearchCode,
        this.fromDate,
        this.toDate,
      )
      .subscribe({
        next: (data) => {
          this.rows = Array.isArray(data) ? data : [];
          // Column order = key order of first row (SP-defined order).
          this.columns = this.rows.length > 0 ? Object.keys(this.rows[0]) : [];
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage =
            err?.error?.message ?? err?.message ?? 'Failed to load MTTR report.';
        },
      });
  }

  // ── Excel export ──────────────────────────────────────────────
  // Uses SheetJS loaded on-demand from CDN (same pattern as the canopy
  // process-checker report). We build the sheet directly from `rows` +
  // `columns` so whatever the SP returns is what the workbook contains,
  // in the SP's column order. SrNo is prepended for readability.
  async onExportExcel(): Promise<void> {
    if (this.isLoadingExcel) return;
    if (this.rows.length === 0) {
      this.errorMessage = 'No records to export. Please Search first.';
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

      // Preserve SP column order + prepend SrNo.
      const headers = ['SrNo', ...this.columns];
      const rows = this.rows.map((r, i) => {
        const out: Record<string, any> = { SrNo: i + 1 };
        for (const c of this.columns) out[c] = r[c] ?? '';
        return out;
      });

      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'MTTR Report');

      const safe = (s: string) => (s || '').replace(/[\\/:*?"<>|]/g, '-');
      const filename = `JobCardMTTR_${safe(this.selectedLineWisePC)}`
        + `_${safe(this.selectedSearchCode)}`
        + `_${safe(this.fromDate)}_to_${safe(this.toDate)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch {
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
        existing.addEventListener('load',  () => resolve());
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

  // ── Helpers ───────────────────────────────────────────────────
  private toIsoDate(d: Date): string {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  closeError(): void {
    this.errorMessage = '';
  }
}
