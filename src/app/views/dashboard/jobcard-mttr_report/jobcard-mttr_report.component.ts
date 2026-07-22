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
  // ── Line dropdown (hardcoded) ─────────────────────────────────
  // Six DG-Assembly lines shared across the three plants (01 / 03 / 28).
  // CompanyCode passed to the API is the first two chars of LineWisePC —
  // ParentDgPC is kept in the model in case a future backend needs it.
  readonly lineRights: LineRight[] = [
    { LineWisePC: '01.106', LineDesc: 'Unit I Line A DG Assembly',    ParentDgPC: '01.104' },
    { LineWisePC: '03.092', LineDesc: 'Unit 4 Line B DG Assembly',    ParentDgPC: '03.051' },
    { LineWisePC: '03.123', LineDesc: 'Unit 4 Line C DG Assembly',    ParentDgPC: '03.051' },
    { LineWisePC: '28.037', LineDesc: 'Bengalore Line A DG Assembly', ParentDgPC: '28.001' },
    { LineWisePC: '28.040', LineDesc: 'Bengalore Line B DG Assembly', ParentDgPC: '28.001' },
    { LineWisePC: '28.117', LineDesc: 'Bengalore Line C DG Assembly', ParentDgPC: '28.001' },
  ];
  selectedLineWisePC: string = '';

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
  errorMessage: string = '';

  constructor(private mttrService: JobcardMttrReportService) {}

  ngOnInit(): void {
    // Legacy defaults — From = yesterday, To = today (matching the .NET/Angular v11 code).
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    this.fromDate = this.toIsoDate(yesterday);
    this.toDate   = this.toIsoDate(today);
  }

  // Resolved LineRight for the currently selected LineWisePC.
  get selectedLineRight(): LineRight | undefined {
    return this.lineRights.find(l => l.LineWisePC === this.selectedLineWisePC);
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
