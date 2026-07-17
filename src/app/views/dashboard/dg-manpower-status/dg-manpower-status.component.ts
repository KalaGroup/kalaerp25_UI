import { Component, OnInit, OnDestroy } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors } from '@angular/forms';
import {
  DgManpowerStatusService,
  DepartmentOption,
  ManpowerEntry,
  ManpowerRecord,
  SaveManpowerBatchRequest,
  shiftLabel,
  CompanyOption,
  ShortageTrendRow,
} from './dg-manpower-status.service';

/** One department row in the Summary table: Required/Available/Shortage per skill, a Total group, and Absent. */
interface SummaryRow {
  dept: string;
  reqS: number; avS: number; shS: number;   // skilled
  reqM: number; avM: number; shM: number;   // semi-skilled
  reqU: number; avU: number; shU: number;   // un-skilled
  reqT: number; avT: number; shT: number;   // total
  absent: number;
}
type SummaryTotals = Omit<SummaryRow, 'dept'>;

/**
 * If an operator enters any Available figure (skilled / semi / unskilled) for a
 * station row, a Remark becomes mandatory for that row. A row with no Available
 * entered is left untouched and needs nothing.
 */
export function availRemarkValidator(group: AbstractControl): ValidationErrors | null {
  const filled = (c: string) => {
    const v = group.get(c)?.value;
    return v !== null && v !== '' && v !== undefined;
  };

  const hasAvail =
    filled('availSkilled') || filled('availSemi') || filled('availUnskilled');

  const remark = (group.get('remark')?.value || '').trim();

  if (hasAvail && !remark) return { remarkRequired: true };
  return null;
}

@Component({
  selector: 'app-dg-manpower-status',
  templateUrl: './dg-manpower-status.component.html',
  styleUrls: ['./dg-manpower-status.component.scss'],
  standalone: false,
})
export class DgManpowerStatusComponent implements OnInit, OnDestroy {
  form!: FormGroup;

  departments: DepartmentOption[] = [];
  shifts = [
    { code: 'F', name: 'Ist Shift' },
    { code: 'S', name: 'IInd Shift' },
  ];

  isFormVisible = false;   // false = View (records) page; true = Add (entry form)
  isEditMode = false;

  reportRows: ManpowerRecord[] = [];
  reportSearched = false;

  loaded = false;
  isSaving = false;
  isLoading = false;
  isExporting = false;
  successMessage = '';
  errorMessage = '';

  shiftLabel = shiftLabel;   // expose to template

  // ---- in-app analytics (Summary by department + Station chart + Station/Dept breakdown) ----
  chartLoading = false;
  recordsCollapsed = false;          // minimize the Records grid + filters
  analyticsCollapsed = true;         // minimize the Summary & Charts panel (collapsed on first load)

  // Summary by department (mirrors the "Summary U1" sheet): per-skill Required / Available / Shortage,
  // a Total group, and Absent at the end. Built from the loaded records (reportRows).
  // Summary date + shift — drive the Summary table + Station-wise chart independently of the Records filter.
  summaryDate = '';
  summaryShift = 'F';

  summaryRows: SummaryRow[] = [];
  summaryTotals: SummaryTotals = this.blankTotals();
  stationRows: { station: string; short: number }[] = [];   // station-wise shortage for the chart
  private stationChart: any = null;
  private chartLib?: any;               // our Chart.js v4 (the app ships v2 globally)
  dailyView: 'both' | 'chart' | 'grid' = 'both';            // daily station-wise: chart, grid, or both

  // breakdown report (weekly · monthly · all + custom range)
  breakdownDim: 'station' | 'department' = 'station';       // group bars by station or by department
  breakdownPeriod: 'weekly' | 'monthly' | 'all' | 'custom' = 'monthly';
  breakdownView: 'both' | 'chart' | 'grid' = 'both';        // show the chart, the records grid, or both
  breakdownFrom = '';
  breakdownTo = '';
  // aggregated bars carry shortage + absent so the chart + grid can both show meaningful data
  breakdownRows: { label: string; short: number; absent: number }[] = [];
  /** Per-date detail behind the aggregate: single rows, group headers, and date sub-rows (drives the grid). */
  breakdownDetailRows: { kind: 'single' | 'head' | 'sub'; label: string; date: string; days: number; short: number; absent: number }[] = [];
  /** label -> its dated rows, for the chart tooltip ("12 Jun: 5 short ..."). */
  private breakdownDateMap = new Map<string, { date: string; short: number; absent: number }[]>();
  private breakdownChart: any = null;

  // ---- chart company picker (for a parent login like 33 that spans 01/03/28) ----
  viewCompanies: CompanyOption[] = [];  // companies the login may view charts for
  selectedCompany = '';                 // currently-picked company code; '' until loaded

  constructor(
    private fb: FormBuilder,
    private service: DgManpowerStatusService,
  ) { }

  ngOnInit(): void {
    const todayStr = new Date().toISOString().slice(0, 10);
    this.summaryDate = todayStr;          // analytics summary defaults to today; the user can change it
    this.form = this.fb.group({
      date: [todayStr],
      shift: ['F'],
      pcId: [''],
      entries: this.fb.array([]),
    });

    this.service.getDepartments().subscribe({
      next: (res) => (this.departments = res || []),
      error: () => (this.errorMessage = 'Could not load departments.'),
    });

    // Companies for the chart picker (parent login -> children; else just self).
    this.service.getViewCompanies().subscribe({
      next: (res) => {
        this.viewCompanies = res || [];
        this.selectedCompany = this.viewCompanies.length ? this.viewCompanies[0].companyCode : this.service.companyCode;
      },
      error: () => {
        this.viewCompanies = [];
        this.selectedCompany = this.service.companyCode;
      },
    });

    this.resolveBreakdownRange();   // sets breakdownFrom / breakdownTo from the default period
    this.searchReport();
  }

  ngOnDestroy(): void {
    if (this.breakdownChart) { this.breakdownChart.destroy(); this.breakdownChart = null; }
    if (this.stationChart) { this.stationChart.destroy(); this.stationChart = null; }
  }

  /* ---------- View / Add toggle ---------- */

  showForm(): void {
    this.isFormVisible = true;
    this.isEditMode = false;
    this.lockFilters(false);
    this.entries.clear();
    this.loaded = false;
    this.form.patchValue({ pcId: '', shift: this.f['shift'].value || 'F' });
    this.clearMessages();
  }

  showList(): void {
    this.isFormVisible = false;
    this.isEditMode = false;
    this.lockFilters(false);
    this.clearMessages();
    this.searchReport();
  }

  /** Open the Add form in edit mode for the batch this row belongs to (date + shift + dept). */
  editRecord(r: ManpowerRecord): void {
    this.isFormVisible = true;
    this.isEditMode = true;
    this.clearMessages();
    this.form.patchValue({
      date: r.date,
      shift: r.shift,
      pcId: r.pcId,
    });
    this.lockFilters(true);
    this.loadStations();
  }

  /** Delete one station record from the grid. */
  deleteRecord(r: ManpowerRecord): void {
    const ok = confirm(`Delete manpower for "${r.workStationName}" on ${r.date} (${this.shiftLabel(r.shift)})?`);
    if (!ok) return;
    this.isLoading = true;
    this.service.deleteManpowerRecord(r.mcode, r.srNo).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Record deleted.';
        this.searchReport();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Could not delete the record.';
      },
    });
  }

  private lockFilters(lock: boolean): void {
    const opts = { emitEvent: false };
    ['date', 'shift', 'pcId'].forEach((c) => {
      const ctrl = this.form.get(c);
      if (!ctrl) return;
      lock ? ctrl.disable(opts) : ctrl.enable(opts);
    });
  }

  searchReport(): void {
    this.clearMessages();
    this.fetchRecords();
  }

  private fetchRecords(): void {
    this.isLoading = true;
    const date = this.f['date'].value;
    const shift = this.f['shift'].value;
    const pcId = this.num(this.f['pcId'].value) || null;
    this.service.getManpowerRecords(date, shift, pcId).subscribe({
      next: (rows) => {
        this.reportRows = rows || [];
        this.reportSearched = true;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Could not load records.';
      },
    });
  }

  get entries(): FormArray {
    return this.form.get('entries') as FormArray;
  }

  get f() {
    return this.form.controls;
  }

  /** Load every station of the chosen department into editable rows (sanctioned pre-filled, read-only). */
  loadStations(): void {
    this.clearMessages();
    const pcId = this.num(this.f['pcId'].value);
    const date = this.f['date'].value;
    const shift = this.f['shift'].value;

    if (!date || !shift || !pcId) {
      this.errorMessage = 'Please select date, shift and department first.';
      return;
    }

    this.isLoading = true;
    this.service.getStations(pcId).subscribe({
      next: (stations) => {
        this.isLoading = false;
        this.entries.clear();
        (stations || []).forEach((s) => {
          this.entries.push(
            this.fb.group({
              wkCode: [s.wkCode],
              workStationName: [s.workStationName],
              sancSkilled: [s.sancSkilled],
              sancSemi: [s.sancSemi],
              sancUnskilled: [s.sancUnskilled],
              availSkilled: [null],
              availSemi: [null],
              availUnskilled: [null],
              absent: [null],
              remark: [''],
            },
              { validators: availRemarkValidator },
            ),
          );
        });
        this.loaded = true;

        // Pre-load anything already saved for this date+shift+dept (carries the frozen sanctioned).
        this.service.getManpowerByDate(date, shift, pcId).subscribe({
          next: (existing) => this.applyExisting(existing),
        });
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Could not load stations.';
      },
    });
  }

  /** Used by the template to highlight the missing remark. */
  rowNeedsRemark(row: AbstractControl): boolean { return row.hasError('remarkRequired'); }

  /** Rows where Available was entered but Remark is still blank. */
  private rowsMissingRemark(): string[] {
    return this.entries.controls
      .filter((r) => r.hasError('remarkRequired'))
      .map((r) => r.get('workStationName')?.value || 'station');
  }

  /** Overlay saved values: available + remark, AND the frozen sanctioned snapshot. */
  private applyExisting(existing: ManpowerEntry[]): void {
    if (!existing || existing.length === 0) return;
    this.entries.controls.forEach((row) => {
      const match = existing.find((e) => e.wkCode === row.get('wkCode')!.value);
      if (match) {
        row.patchValue({
          sancSkilled: match.sancSkilled,       // frozen snapshot wins over live master
          sancSemi: match.sancSemi,
          sancUnskilled: match.sancUnskilled,
          availSkilled: match.availSkilled,
          availSemi: match.availSemi,
          availUnskilled: match.availUnskilled,
          absent: match.absent,
          remark: match.remark,
        });
      }
    });
  }

  /* ---------- per-row shortage (Sanctioned - Available) ---------- */
  shortSkilled(row: any): number { return this.num(row.get('sancSkilled')!.value) - this.num(row.get('availSkilled')!.value); }
  shortSemi(row: any): number { return this.num(row.get('sancSemi')!.value) - this.num(row.get('availSemi')!.value); }
  shortUnskilled(row: any): number { return this.num(row.get('sancUnskilled')!.value) - this.num(row.get('availUnskilled')!.value); }

  /* ---------- grand totals across the loaded rows ---------- */
  private sum(ctrl: string): number {
    return this.entries.controls.reduce((s, r) => s + this.num(r.get(ctrl)!.value), 0);
  }
  get gSancSkilled() { return this.sum('sancSkilled'); }
  get gSancSemi() { return this.sum('sancSemi'); }
  get gSancUnskilled() { return this.sum('sancUnskilled'); }
  get gAvailSkilled() { return this.sum('availSkilled'); }
  get gAvailSemi() { return this.sum('availSemi'); }
  get gAvailUnskilled() { return this.sum('availUnskilled'); }
  get gShortSkilled() { return this.gSancSkilled - this.gAvailSkilled; }
  get gShortSemi() { return this.gSancSemi - this.gAvailSemi; }
  get gShortUnskilled() { return this.gSancUnskilled - this.gAvailUnskilled; }
  get gAbsent() { return this.sum('absent'); }

  /** Per-row total shortage across the three skills. */
  rowShortTotal(row: any): number { return this.shortSkilled(row) + this.shortSemi(row) + this.shortUnskilled(row); }

  /** Save the whole department in one go. Blank available cells are stored as 0. */
  submit(): void {
    this.clearMessages();
    if (!this.f['date'].value) {
      this.errorMessage = 'Please select the date.';
      return;
    }
    if (this.entries.length === 0) {
      this.errorMessage = 'Load stations before saving.';
      return;
    }

    // Any station with Available entered must carry a Remark.
    const missing = this.rowsMissingRemark();
    if (missing.length) {
      this.errorMessage = missing.length === 1
        ? `Please add a remark for "${missing[0]}".`
        : `Remark is required for every station where you entered availability — ${missing.length} rows still need one.`;
      return;
    }

    const raw = this.form.getRawValue();   // includes disabled (locked) controls
    const pcId = this.num(raw.pcId);
    const dept = this.departments.find((d) => d.pcId === pcId);

    const payload: SaveManpowerBatchRequest = {
      date: raw.date,
      shift: raw.shift || 'F',
      companyCode: this.service.companyCode,
      createdBy: this.service.sessionUser,
      pcId: pcId,
      pcCode: dept ? dept.pcCode : '',
      entries: this.entries.controls.map((r) => ({
        wkCode: r.get('wkCode')!.value,
        workStationName: r.get('workStationName')!.value,
        sancSkilled: this.num(r.get('sancSkilled')!.value),
        sancSemi: this.num(r.get('sancSemi')!.value),
        sancUnskilled: this.num(r.get('sancUnskilled')!.value),
        availSkilled: this.num(r.get('availSkilled')!.value),
        availSemi: this.num(r.get('availSemi')!.value),
        availUnskilled: this.num(r.get('availUnskilled')!.value),
        absent: this.num(r.get('absent')!.value),
        remark: (r.get('remark')!.value || '').trim(),
      })),
    };

    this.isSaving = true;
    this.isLoading = true;
    this.service.saveManpowerBatch(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.isEditMode = false;
        this.lockFilters(false);
        this.successMessage = `Saved ${payload.entries.length} station(s) for ${payload.date} (${this.shiftLabel(payload.shift)}).`;
        this.isFormVisible = false;
        this.fetchRecords();
      },
      error: () => {
        this.isSaving = false;
        this.isLoading = false;
        this.errorMessage = 'Failed to save. Please try again.';
      },
    });
  }

  clear(): void {
    this.clearMessages();
    this.loaded = false;
    this.isEditMode = false;
    this.lockFilters(false);
    this.entries.clear();
    this.form.patchValue({ pcId: '' });
  }

  /* ===================== EXPORTS (PDF / Excel) ===================== */

  /* ===================== EXPORTS (PDF / Excel) =====================
     Format mirrors the shared manning sheet:
     Profit Center -> Shift -> Station, three skill columns under
     Sanctioned / Available / Shortage, a Sub Total per Profit Center,
     then a Grand Total. Profit Center and Shift are merged down their spans. */

  private shiftRank(code: string): number {
    return code === 'F' ? 0 : code === 'S' ? 1 : 2;
  }

  /** Group rows by Profit Center, ordered PC -> Shift(F,S) -> Station, with per-PC subtotals. */
  private buildExportModel(): {
    pc: string;
    rows: {
      shift: string; station: string;
      ss: number; sm: number; su: number;
      av_s: number; av_m: number; av_u: number;
      xs: number; xm: number; xu: number; absent: number; remark: string;
    }[];
    sub: { ss: number; sm: number; su: number; as: number; am: number; au: number; xs: number; xm: number; xu: number; absent: number };
  }[] {
    const sorted = [...this.filteredRecords].sort((a, b) =>
      (a.pcName || '').localeCompare(b.pcName || '') ||
      this.shiftRank(a.shift) - this.shiftRank(b.shift) ||
      (a.workStationName || '').localeCompare(b.workStationName || ''),
    );

    const groups: any[] = [];
    for (const r of sorted) {
      const key = r.pcName || '\u2014';
      let g = groups[groups.length - 1];
      if (!g || g.pc !== key) {
        g = { pc: key, rows: [], sub: { ss: 0, sm: 0, su: 0, as: 0, am: 0, au: 0, xs: 0, xm: 0, xu: 0, absent: 0 } };
        groups.push(g);
      }
      g.rows.push({
        shift: this.shiftLabel(r.shift),
        station: r.workStationName,
        ss: r.sancSkilled, sm: r.sancSemi, su: r.sancUnskilled,
        av_s: r.availSkilled, av_m: r.availSemi, av_u: r.availUnskilled,
        xs: r.shortSkilled, xm: r.shortSemi, xu: r.shortUnskilled, absent: r.absent || 0,
        remark: r.remark || '',
      });
      g.sub.ss += r.sancSkilled || 0; g.sub.sm += r.sancSemi || 0; g.sub.su += r.sancUnskilled || 0;
      g.sub.as += r.availSkilled || 0; g.sub.am += r.availSemi || 0; g.sub.au += r.availUnskilled || 0;
      g.sub.xs += r.shortSkilled || 0; g.sub.xm += r.shortSemi || 0; g.sub.xu += r.shortUnskilled || 0;
      g.sub.absent += r.absent || 0;
    }
    return groups;
  }

  /** Runs of identical shift within a group (for vertical merge of the Shift column). */
  private shiftRuns(rows: { shift: string }[]): { start: number; len: number; shift: string }[] {
    const runs: { start: number; len: number; shift: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const last = runs[runs.length - 1];
      if (last && rows[i].shift === last.shift) last.len++;
      else runs.push({ start: i, len: 1, shift: rows[i].shift });
    }
    return runs;
  }

  private exportTitleLabel(): string {
    const d = this.f['date'].value;
    const s = this.f['shift'].value;
    const parts: string[] = [];
    if (d) parts.push(`Date: ${d}`);
    parts.push(`Shift: ${s ? this.shiftLabel(s) : 'All'}`);
    return parts.join('        ');
  }

  private exportFileName(ext: string): string {
    const safe = (s: string) => (s || '').replace(/[\\/:*?"<>|]/g, '-');
    const d = this.f['date'].value || 'all';
    const s = this.f['shift'].value ? this.shiftLabel(this.f['shift'].value) : 'AllShifts';
    return `Manpower_Status_${safe(d)}_${safe(s)}.${ext}`;
  }

  /** Excel export (ExcelJS) — manning-sheet layout with merged PC/Shift and per-PC subtotals. */
  async exportExcel(): Promise<void> {
    if (this.isExporting || this.filteredRecords.length === 0) return;
    this.isExporting = true;
    try {
      if (!(window as any).ExcelJS) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
      }
      const ExcelJS = (window as any).ExcelJS;
      if (!ExcelJS) {
        this.errorMessage = 'Excel library failed to load. Check your connection and retry.';
        return;
      }

      const TEAL = 'FF0F6C8D', TEAL_D = 'FF0D5E7A', TEAL_L = 'FF12798F';
      const GREY = 'FFE6E6E6', BLUE = 'FFD2E1F0', GREEN = 'FF1E7A3B';
      const thin = { style: 'thin', color: { argb: 'FFB0B0B0' } };
      const allBorders = { top: thin, left: thin, bottom: thin, right: thin };
      const center = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Manpower Status');
      ws.columns = [
        { width: 22 }, { width: 8 }, { width: 26 },
        { width: 10 }, { width: 12 }, { width: 11 },
        { width: 10 }, { width: 12 }, { width: 11 },
        { width: 10 }, { width: 12 }, { width: 11 },
        { width: 26 },
      ];

      // Title + subtitle
      ws.mergeCells(1, 1, 1, 13);
      const t1 = ws.getCell(1, 1);
      t1.value = {
        richText: [
          { text: this.chartCompanyName + '\n', font: { bold: true, size: 15, color: { argb: 'FFFFFFFF' } } },
          { text: 'Unit-1  \u2014  Groupwise Manpower Status', font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } } },
        ],
      };
      t1.alignment = center;
      t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
      ws.getRow(1).height = 40;

      ws.mergeCells(2, 1, 2, 13);
      const t2 = ws.getCell(2, 1);
      t2.value = this.exportTitleLabel();
      t2.font = { bold: true, size: 11, color: { argb: 'FF333333' } };
      t2.alignment = { horizontal: 'center', vertical: 'middle' };

      // Header rows 3-4
      const HR1 = 3, HR2 = 4;
      ws.mergeCells(HR1, 1, HR2, 1); ws.getCell(HR1, 1).value = 'Profit Center';
      ws.mergeCells(HR1, 2, HR2, 2); ws.getCell(HR1, 2).value = 'Shift';
      ws.mergeCells(HR1, 3, HR2, 3); ws.getCell(HR1, 3).value = 'Station';
      ws.mergeCells(HR1, 4, HR1, 6); ws.getCell(HR1, 4).value = 'Sanctioned';
      ws.mergeCells(HR1, 7, HR1, 9); ws.getCell(HR1, 7).value = 'Available';
      ws.mergeCells(HR1, 10, HR1, 12); ws.getCell(HR1, 10).value = 'Shortage';
      ws.mergeCells(HR1, 13, HR2, 13); ws.getCell(HR1, 13).value = 'Remarks';
      const skill = ['Skilled', 'Semi-Skilled', 'Unskilled'];
      [4, 7, 10].forEach((c0) => skill.forEach((s, i) => (ws.getCell(HR2, c0 + i).value = s)));
      for (let c = 1; c <= 13; c++) {
        for (const r of [HR1, HR2]) {
          const cell = ws.getCell(r, c);
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
          cell.alignment = center;
          cell.border = allBorders;
          const fill = c >= 4 && c <= 6 ? TEAL_D : c >= 7 && c <= 9 ? TEAL_L : c >= 10 && c <= 12 ? TEAL_D : TEAL;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
        }
      }
      ws.getRow(HR1).height = 18; ws.getRow(HR2).height = 26;

      // Body
      let row = HR2 + 1;
      const groups = this.buildExportModel();
      const G = { ss: 0, sm: 0, su: 0, as: 0, am: 0, au: 0, xs: 0, xm: 0, xu: 0 };

      const numFmt = (cell: any, val: number, isShort: boolean) => {
        cell.value = val;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = allBorders;
        if (isShort && val < 0) cell.font = { color: { argb: GREEN }, bold: true };
      };

      for (const g of groups) {
        const pcStart = row;
        for (const r of g.rows) {
          ws.getCell(row, 3).value = r.station;
          ws.getCell(row, 3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          ws.getCell(row, 3).border = allBorders;
          const nums = [r.ss, r.sm, r.su, r.av_s, r.av_m, r.av_u, r.xs, r.xm, r.xu];
          nums.forEach((v, i) => numFmt(ws.getCell(row, 4 + i), v, i >= 6));
          const rem = ws.getCell(row, 13);
          rem.value = r.remark;
          rem.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          rem.border = allBorders;
          row++;
        }
        // shift merges
        for (const run of this.shiftRuns(g.rows)) {
          const rs = pcStart + run.start;
          if (run.len > 1) ws.mergeCells(rs, 2, rs + run.len - 1, 2);
          const sc = ws.getCell(rs, 2);
          sc.value = run.shift;
          sc.alignment = center;
          sc.border = allBorders;
        }
        // sub total row
        const subRow = row;
        ws.mergeCells(subRow, 2, subRow, 3);
        const sl = ws.getCell(subRow, 2);
        sl.value = 'Sub Total';
        sl.font = { bold: true };
        sl.alignment = { horizontal: 'center', vertical: 'middle' };
        const subNums = [g.sub.ss, g.sub.sm, g.sub.su, g.sub.as, g.sub.am, g.sub.au, g.sub.xs, g.sub.xm, g.sub.xu];
        subNums.forEach((v, i) => {
          const cell = ws.getCell(subRow, 4 + i);
          cell.value = v; cell.font = { bold: true };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = allBorders;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } };
          if (i >= 6 && v < 0) cell.font = { bold: true, color: { argb: GREEN } };
        });
        ws.getCell(subRow, 13).border = allBorders;
        ws.getCell(subRow, 13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } };
        sl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } };
        sl.border = allBorders;
        row++;

        // PC name merged down the whole block incl subtotal
        ws.mergeCells(pcStart, 1, subRow, 1);
        const pcCell = ws.getCell(pcStart, 1);
        pcCell.value = g.pc;
        pcCell.font = { bold: true };
        pcCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        pcCell.border = allBorders;

        G.ss += g.sub.ss; G.sm += g.sub.sm; G.su += g.sub.su;
        G.as += g.sub.as; G.am += g.sub.am; G.au += g.sub.au;
        G.xs += g.sub.xs; G.xm += g.sub.xm; G.xu += g.sub.xu;
      }

      // Grand total
      const gRow = row;
      ws.mergeCells(gRow, 1, gRow, 3);
      const gl = ws.getCell(gRow, 1);
      gl.value = 'Grand Total';
      gl.font = { bold: true }; gl.alignment = { horizontal: 'center', vertical: 'middle' };
      const gNums = [G.ss, G.sm, G.su, G.as, G.am, G.au, G.xs, G.xm, G.xu];
      gNums.forEach((v, i) => {
        const cell = ws.getCell(gRow, 4 + i);
        cell.value = v; cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = allBorders;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
        if (i >= 6 && v < 0) cell.font = { bold: true, color: { argb: GREEN } };
      });
      ws.getCell(gRow, 13).border = allBorders;
      ws.getCell(gRow, 13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
      gl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
      gl.border = allBorders;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      this.downloadBlob(blob, this.exportFileName('xlsx'));
    } catch (e) {
      console.error('Excel export failed:', e);
      this.errorMessage = 'Failed to generate Excel. Please try again.';
    } finally {
      this.isExporting = false;
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** PDF export — manning-sheet layout (PC/Shift merged via rowSpan), per-PC subtotals + grand total. */
  async exportPdf(): Promise<void> {
    if (this.isExporting || this.filteredRecords.length === 0) return;
    this.isExporting = true;
    try {
      if (!(window as any).jspdf) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }
      const jsPDF = (window as any).jspdf?.jsPDF;
      if (!jsPDF) {
        this.errorMessage = 'PDF library failed to load. Check your connection and retry.';
        return;
      }
      if (!jsPDF.API || !jsPDF.API.autoTable) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
      }

      const doc = new jsPDF('l', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 108, 141);
      doc.text(this.chartCompanyName, pageW / 2, 12, { align: 'center' });
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text('Unit-1  \u2014  Groupwise Manpower Status', pageW / 2, 19, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(this.exportTitleLabel(), pageW / 2, 25, { align: 'center' });

      const head = [
        [
          { content: 'Profit Center', rowSpan: 2 },
          { content: 'Shift', rowSpan: 2 },
          { content: 'Station', rowSpan: 2 },
          { content: 'Sanctioned', colSpan: 3 },
          { content: 'Available', colSpan: 3 },
          { content: 'Shortage', colSpan: 3 },
          { content: 'Remarks', rowSpan: 2 },
        ],
        ['Skilled', 'Semi-Skilled', 'Unskilled', 'Skilled', 'Semi-Skilled', 'Unskilled', 'Skilled', 'Semi-Skilled', 'Unskilled'],
      ];

      const GREEN: [number, number, number] = [30, 122, 59];
      const num = (v: number, short = false) =>
        short && v < 0 ? { content: String(v), styles: { textColor: GREEN, fontStyle: 'bold' } } : v;
      const subCell = (v: any) => ({ content: v, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } });
      const subNum = (v: number, short = false) =>
        ({ content: String(v), styles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: (short && v < 0 ? GREEN : [0, 0, 0]) } });
      const gtCell = (v: any) => ({ content: v, styles: { fontStyle: 'bold', fillColor: [210, 225, 240] } });
      const gtNum = (v: number, short = false) =>
        ({ content: String(v), styles: { fontStyle: 'bold', fillColor: [210, 225, 240], textColor: (short && v < 0 ? GREEN : [0, 0, 0]) } });

      const body: any[] = [];
      const groups = this.buildExportModel();
      const G = { ss: 0, sm: 0, su: 0, as: 0, am: 0, au: 0, xs: 0, xm: 0, xu: 0 };

      for (const g of groups) {
        const runs = this.shiftRuns(g.rows);
        const runStart = new Map<number, { len: number; shift: string }>();
        runs.forEach((rn) => runStart.set(rn.start, { len: rn.len, shift: rn.shift }));

        g.rows.forEach((r, idx) => {
          const cells: any[] = [];
          if (idx === 0) cells.push({ content: g.pc, rowSpan: g.rows.length + 1, styles: { fontStyle: 'bold', valign: 'middle', halign: 'left' } });
          if (runStart.has(idx)) cells.push({ content: runStart.get(idx)!.shift, rowSpan: runStart.get(idx)!.len, styles: { valign: 'middle' } });
          cells.push({ content: r.station, styles: { halign: 'left' } });
          cells.push(num(r.ss), num(r.sm), num(r.su), num(r.av_s), num(r.av_m), num(r.av_u),
            num(r.xs, true), num(r.xm, true), num(r.xu, true), { content: r.remark || '', styles: { halign: 'left' } });
          body.push(cells);
        });

        body.push([
          subCell('Sub Total'),  // colSpan 2 over Shift+Station
          subNum(g.sub.ss), subNum(g.sub.sm), subNum(g.sub.su),
          subNum(g.sub.as), subNum(g.sub.am), subNum(g.sub.au),
          subNum(g.sub.xs, true), subNum(g.sub.xm, true), subNum(g.sub.xu, true),
          subCell(''),
        ]);
        // make the Sub Total label span Shift+Station
        body[body.length - 1][0] = { content: 'Sub Total', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [230, 230, 230], halign: 'center' } };

        G.ss += g.sub.ss; G.sm += g.sub.sm; G.su += g.sub.su;
        G.as += g.sub.as; G.am += g.sub.am; G.au += g.sub.au;
        G.xs += g.sub.xs; G.xm += g.sub.xm; G.xu += g.sub.xu;
      }

      body.push([
        { content: 'Grand Total', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [210, 225, 240], halign: 'center' } },
        gtNum(G.ss), gtNum(G.sm), gtNum(G.su), gtNum(G.as), gtNum(G.am), gtNum(G.au),
        gtNum(G.xs, true), gtNum(G.xm, true), gtNum(G.xu, true), gtCell(''),
      ]);

      (doc as any).autoTable({
        head,
        body,
        startY: 29,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.3, valign: 'middle', halign: 'center', lineColor: [176, 176, 176], lineWidth: 0.1 },
        headStyles: { fillColor: [15, 108, 141], textColor: 255, halign: 'center', fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 34, halign: 'left' },
          1: { cellWidth: 14 },
          2: { cellWidth: 38, halign: 'left' },
          12: { halign: 'left' },
        },
      });

      doc.save(this.exportFileName('pdf'));
    } catch (e) {
      console.error('PDF export failed:', e);
      this.errorMessage = 'Failed to generate PDF. Please try again.';
    } finally {
      this.isExporting = false;
    }
  }


  /* ===================== IN-APP ANALYTICS (Station / Department shortage breakdown) ===================== */

  /** Company name (from the logged-in session) shown in chart / report headings. */
  get companyName(): string {
    return this.service.companyName;
  }

  /** Show the picker only when the login spans more than one company (e.g. 33). */
  get showCompanyPicker(): boolean {
    return this.viewCompanies.length > 1;
  }

  /** Name of the picked company, for the chart headers (falls back to the login company name). */
  get chartCompanyName(): string {
    const c = this.viewCompanies.find((x) => x.companyCode === this.selectedCompany);
    return c ? c.companyName : this.service.companyName;
  }

  /** Keep only the picked company's rows (no-op for a single-company login). */
  private forSelectedCompany(rows: ShortageTrendRow[]): ShortageTrendRow[] {
    if (!this.selectedCompany) return rows;
    return rows.filter((r) => (r.companyCode || '') === this.selectedCompany);
  }

  /** User picked a different company from the chart picker — reload every chart. */
  onCompanyChange(): void {
    if (this.analyticsCollapsed) return;
    this.loadSummary();
    this.loadBreakdown();
  }

  /** Records shown in the grid — narrowed to the picked company (no-op for a single-company login). */
  get filteredRecords(): ManpowerRecord[] {
    if (!this.showCompanyPicker || !this.selectedCompany) return this.reportRows;
    return this.reportRows.filter((r) => (r.companyCode || '') === this.selectedCompany);
  }

  /** Departments offered in the Records filter — narrowed to the picked company (via PCCode prefix). */
  get filteredDepartments(): DepartmentOption[] {
    if (!this.showCompanyPicker || !this.selectedCompany) return this.departments;
    return this.departments.filter((d) => (d.pcCode || '').slice(0, 2) === this.selectedCompany);
  }

  /** Company changed from the Records toolbar — re-filter the grid (and charts if the panel is open). */
  onRecordsCompanyChange(): void {
    const pcId = this.form.get('pcId')?.value;
    if (pcId) {
      const dept = this.departments.find((d) => String(d.pcId) === String(pcId));
      // drop a department filter that doesn't belong to the newly-picked company
      if (dept && (dept.pcCode || '').slice(0, 2) !== this.selectedCompany) {
        this.form.get('pcId')?.setValue('');
      }
    }
    this.onCompanyChange();   // keeps the charts in step when the analytics panel is open
  }

  /**
   * Export ONE chart to PDF by capturing its live <canvas>, so the PDF matches
   * the screen exactly. Requires the card to be showing a chart (not grid-only).
   */
  async exportChartPdf(canvasId: string, heading: string): Promise<void> {
    if (this.isExporting) return;
    const src = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!src || !src.width) { this.errorMessage = 'Switch this card to a Chart view first, then export.'; return; }
    this.isExporting = true;
    try {
      if (!(window as any).jspdf) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }
      const jsPDF = (window as any).jspdf?.jsPDF;
      if (!jsPDF) { this.errorMessage = 'PDF library failed to load. Check your connection and retry.'; return; }

      // Chart.js canvases are transparent — paint white behind so the PDF prints cleanly.
      const tmp = document.createElement('canvas');
      tmp.width = src.width; tmp.height = src.height;
      const tctx = tmp.getContext('2d')!;
      tctx.fillStyle = '#ffffff'; tctx.fillRect(0, 0, tmp.width, tmp.height);
      tctx.drawImage(src, 0, 0);
      const png = tmp.toDataURL('image/png');

      const pdfSafe = (s: string) => (s || '').replace(/\u2192/g, ' to ').replace(/[^\x00-\xFF]/g, '');
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(15, 108, 141);
      doc.text(pdfSafe(this.chartCompanyName), pageW / 2, 16, { align: 'center' });
      doc.setFontSize(11); doc.setTextColor(40, 40, 40);
      doc.text(pdfSafe(heading), pageW / 2, 24, { align: 'center' });

      const imgW = pageW - 28;
      let imgH = imgW * (src.height / src.width);
      const maxH = pageH - 36;
      if (imgH > maxH) imgH = maxH;
      doc.addImage(png, 'PNG', 14, 30, imgW, imgH);

      const fname = (pdfSafe(heading).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_').slice(0, 60)) || 'chart';
      doc.save(`${fname}.pdf`);
    } catch (e) {
      console.error('Chart PDF export failed:', e);
      this.errorMessage = 'Failed to generate the chart PDF. Please try again.';
    } finally {
      this.isExporting = false;
    }
  }

  /**
   * Breakdown PDF — matches the on-screen View selection:
   *   Chart + Grid -> chart on top, dated grid below
   *   Chart        -> chart only
   *   Grid         -> grid only
   * Always for the picked company and the selected period.
   */
  async exportBreakdownPdf(): Promise<void> {
    if (this.isExporting) return;
    if (!this.breakdownRows.length) { this.errorMessage = 'No breakdown data to export.'; return; }
    this.isExporting = true;
    try {
      if (!(window as any).jspdf) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }
      const jsPDF = (window as any).jspdf?.jsPDF;
      if (!jsPDF) { this.errorMessage = 'PDF library failed to load. Check your connection and retry.'; return; }
      if (!jsPDF.API || !jsPDF.API.autoTable) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
      }

      const pdfSafe = (s: string) => (s || '').replace(/\u2192/g, ' to ').replace(/[^\x00-\xFF]/g, '');
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();

      // header: company + "Shortage breakdown · <period>"
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(15, 108, 141);
      doc.text(pdfSafe(this.chartCompanyName), pageW / 2, 14, { align: 'center' });
      doc.setFontSize(11); doc.setTextColor(40, 40, 40);
      doc.text(pdfSafe('Shortage breakdown  ·  ' + this.breakdownPeriodLabel), pageW / 2, 21, { align: 'center' });

      let startY = 26;

      // chart image — included for Chart and Chart+Grid views
      if (this.breakdownView !== 'grid') {
        const src = document.getElementById('shortageBreakdownCanvas') as HTMLCanvasElement | null;
        if (src && src.width) {
          const tmp = document.createElement('canvas');
          tmp.width = src.width; tmp.height = src.height;
          const tctx = tmp.getContext('2d')!;
          tctx.fillStyle = '#ffffff'; tctx.fillRect(0, 0, tmp.width, tmp.height);
          tctx.drawImage(src, 0, 0);
          const png = tmp.toDataURL('image/png');
          const imgW = pageW - 28;
          const imgH = Math.min(imgW * (src.height / src.width), this.breakdownView === 'chart' ? 150 : 95);
          doc.addImage(png, 'PNG', 14, startY, imgW, imgH);
          startY += imgH + 6;
        }
      }

      // dated grid table — included for Grid and Chart+Grid views
      if (this.breakdownView !== 'chart') {
        const dimLabel = this.breakdownDim === 'station' ? 'Station' : 'Department';
        const head = [['#', dimLabel, 'Date', 'Shortage (Nos.)', 'Absent', 'Share']];
        const kinds: string[] = [];
        const body: any[] = this.breakdownDetailRows.map((r) => {
          kinds.push(r.kind);
          return [
            r.kind !== 'sub' ? this.breakdownRankOf(r.label) : '',
            r.kind !== 'sub' ? pdfSafe(r.label) : '',
            r.kind === 'head' ? `${r.days} days` : this.niceDate(r.date),
            r.short, r.absent,
            this.breakdownShare(r).toFixed(1) + '%',
          ];
        });
        kinds.push('total');
        body.push(['', 'Total', '', this.breakdownShortTotal, this.breakdownAbsentTotal, '100%']);

        (doc as any).autoTable({
          head, body, startY, theme: 'grid',
          styles: { fontSize: 8, cellPadding: 1.6, valign: 'middle' },
          headStyles: { fillColor: [15, 108, 141], textColor: 255, halign: 'center' },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'left' }, 2: { halign: 'center', cellWidth: 26 },
            3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
          },
          didParseCell: (d: any) => {
            const k = kinds[d.row.index];
            if (k === 'total') { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [235, 242, 246]; }
            else if (k === 'head' || k === 'single') { d.cell.styles.fontStyle = 'bold'; if (k === 'head') d.cell.styles.fillColor = [240, 246, 249]; }
            else { d.cell.styles.textColor = [90, 105, 115]; }
          },
        });
      }

      doc.save('Shortage_breakdown.pdf');
    } catch (e) {
      console.error('Breakdown PDF export failed:', e);
      this.errorMessage = 'Failed to generate the breakdown PDF. Please try again.';
    } finally {
      this.isExporting = false;
    }
  }

  toggleRecords(): void { this.recordsCollapsed = !this.recordsCollapsed; }

  toggleAnalytics(): void {
    this.analyticsCollapsed = !this.analyticsCollapsed;
    if (!this.analyticsCollapsed) {
      setTimeout(() => this.loadAnalytics(), 0);
    } else {
      if (this.breakdownChart) { this.breakdownChart.destroy(); this.breakdownChart = null; }
      if (this.stationChart) { this.stationChart.destroy(); this.stationChart = null; }
    }
  }

  /** Load the analytics panel: build the Summary table + Station chart (for the Summary date), and the range breakdown. */
  loadAnalytics(): void {
    if (this.analyticsCollapsed) return;
    // open on the same date/shift the Records grid is showing; the user can then change it here.
    this.summaryDate = this.f['date'].value || this.summaryDate;
    this.summaryShift = this.f['shift'].value || this.summaryShift || 'F';
    this.loadSummary();
    this.loadBreakdown();
  }

  /** Re-fetch records for the chosen Summary date + shift and rebuild the Summary table + Station chart. */
  applySummaryDate(): void {
    if (!this.summaryDate) return;
    this.loadSummary();
  }

  /** Daily station-wise shortage: switch between chart, grid, or both. Redraw chart when shown. */
  setDailyView(view: 'both' | 'chart' | 'grid'): void {
    this.dailyView = view;
    if (view !== 'grid') {
      // the canvas re-enters the DOM on the next tick — render after Angular updates the view
      setTimeout(() => { this.renderStationChart(); }, 0);
    }
  }

  get stationDailyTotal(): number { return this.stationRows.reduce((s, r) => s + (r.short || 0), 0); }
  stationDailyShare(short: number): number { const t = this.stationDailyTotal; return t > 0 ? (short / t) * 100 : 0; }

  /** Fetch records for the Summary date + shift (all departments) and build the Summary table + Station chart. */
  loadSummary(): void {
    if (!this.summaryDate) this.summaryDate = this.f['date'].value;
    if (!this.summaryShift) this.summaryShift = 'F';
    this.chartLoading = true;
    this.service.getManpowerRecords(this.summaryDate, this.summaryShift, null).subscribe({
      next: (rows) => {
        this.chartLoading = false;
        this.buildSummaryFrom(rows || []);
      },
      error: () => { this.chartLoading = false; },
    });
  }

  private blankTotals(): SummaryTotals {
    return { reqS: 0, avS: 0, shS: 0, reqM: 0, avM: 0, shM: 0, reqU: 0, avU: 0, shU: 0, reqT: 0, avT: 0, shT: 0, absent: 0 };
  }

  /**
   * Summary by department, built from a given record set: per-skill Required / Available / Shortage,
   * a Total group, and Absent at the end. Also prepares station-wise totals for the chart.
   */
  buildSummaryFrom(allRecords: ManpowerRecord[]): void {
    // keep only the picked company's rows (no-op for a single-company login)
    const records = this.selectedCompany
      ? allRecords.filter((r) => (r.companyCode || '') === this.selectedCompany)
      : allRecords;
    const dMap = new Map<string, SummaryRow>();
    const sMap = new Map<string, number>();
    for (const r of records) {
      const dk = r.pcName || '—';
      let g = dMap.get(dk);
      if (!g) { g = { dept: dk, reqS: 0, avS: 0, shS: 0, reqM: 0, avM: 0, shM: 0, reqU: 0, avU: 0, shU: 0, reqT: 0, avT: 0, shT: 0, absent: 0 }; dMap.set(dk, g); }
      g.reqS += r.sancSkilled || 0; g.avS += r.availSkilled || 0; g.shS += r.shortSkilled || 0;
      g.reqM += r.sancSemi || 0; g.avM += r.availSemi || 0; g.shM += r.shortSemi || 0;
      g.reqU += r.sancUnskilled || 0; g.avU += r.availUnskilled || 0; g.shU += r.shortUnskilled || 0;
      g.absent += r.absent || 0;

      const sk = r.workStationName || '—';
      const rowShort = (r.shortSkilled || 0) + (r.shortSemi || 0) + (r.shortUnskilled || 0);
      sMap.set(sk, (sMap.get(sk) || 0) + rowShort);
    }

    const rows = Array.from(dMap.values());
    for (const g of rows) {
      g.reqT = g.reqS + g.reqM + g.reqU;
      g.avT = g.avS + g.avM + g.avU;
      g.shT = g.shS + g.shM + g.shU;
    }
    rows.sort((a, b) => b.shT - a.shT);
    this.summaryRows = rows;

    const t = this.blankTotals();
    for (const g of rows) {
      t.reqS += g.reqS; t.avS += g.avS; t.shS += g.shS;
      t.reqM += g.reqM; t.avM += g.avM; t.shM += g.shM;
      t.reqU += g.reqU; t.avU += g.avU; t.shU += g.shU;
      t.reqT += g.reqT; t.avT += g.avT; t.shT += g.shT;
      t.absent += g.absent;
    }
    this.summaryTotals = t;

    this.stationRows = Array.from(sMap.entries())
      .map(([station, short]) => ({ station, short }))
      .filter((m) => m.short > 0)          // chart shows stations that actually have a shortage
      .sort((a, b) => b.short - a.short);

    setTimeout(() => this.renderStationChart(), 0);
  }

  /** Station-wise shortage bar chart for the loaded records, value drawn on each bar. */
  private async renderStationChart(): Promise<void> {
    const Chart = await this.ensureChartJs();
    const canvas = document.getElementById('shortageStationCanvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    if (this.stationChart) { this.stationChart.destroy(); this.stationChart = null; }
    const top = this.stationRows.slice(0, 15);
    this.stationChart = new Chart(canvas.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: top.map((m) => m.station),
        datasets: [{ label: 'Shortage (Nos.)', data: top.map((m) => m.short), backgroundColor: '#0f6c8d', borderWidth: 0, borderRadius: 3 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 22 } },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { title: (it: any) => `Station: ${it[0].label}`, label: (c: any) => `${c.parsed.y} short` } },
        },
        scales: {
          x: { ticks: { maxRotation: 55, minRotation: 0, autoSkip: false }, grid: { display: false } },
          y: { beginAtZero: true, min: 0, title: { display: true, text: 'Shortage (Nos.)' } },
        },
      },
      plugins: [this.valueLabelPlugin()],
    });
  }

  /* ---------- Station / Department shortage breakdown report ---------- */
  get breakdownPeriods(): ('weekly' | 'monthly' | 'all')[] {
    return this.breakdownDim === 'station' ? ['weekly', 'monthly'] : ['weekly', 'monthly', 'all'];
  }

  /** Switch between a per-station and a per-department breakdown. */
  setBreakdownDim(dim: 'station' | 'department'): void {
    this.breakdownDim = dim;
    if (dim === 'station' && this.breakdownPeriod === 'all') {
      this.breakdownPeriod = 'monthly';        // Station view has no "All" option
      this.resolveBreakdownRange();
    }
    this.loadBreakdown();
  }

  /** Switch the time window (this week / this month / all time). */
  setBreakdownPeriod(period: 'weekly' | 'monthly' | 'all'): void {
    this.breakdownPeriod = period;
    this.resolveBreakdownRange();
    this.loadBreakdown();
  }

  /** User picked a custom From / To range for the shortage report. */
  applyBreakdownDates(): void {
    if (!this.breakdownFrom || !this.breakdownTo) return;
    if (this.breakdownFrom > this.breakdownTo) {            // keep From <= To
      const t = this.breakdownFrom; this.breakdownFrom = this.breakdownTo; this.breakdownTo = t;
    }
    this.breakdownPeriod = 'custom';                        // de-selects the preset buttons
    this.loadBreakdown();
  }

  /** Turn the selected period into a concrete from/to window. */
  private resolveBreakdownRange(): void {
    if (this.breakdownPeriod === 'custom') return;          // custom keeps the user's chosen dates
    const today = new Date();
    this.breakdownTo = this.fmtDate(today);
    if (this.breakdownPeriod === 'weekly') {
      const d = new Date(today); d.setDate(d.getDate() - 6);    // last 7 days
      this.breakdownFrom = this.fmtDate(d);
    } else if (this.breakdownPeriod === 'monthly') {
      const d = new Date(today); d.setDate(d.getDate() - 29);   // last 30 days
      this.breakdownFrom = this.fmtDate(d);
    } else {
      this.breakdownFrom = '2000-01-01';                        // all time
    }
  }

  /** Heading label for the current window. */
  get breakdownPeriodLabel(): string {
    if (this.breakdownPeriod === 'all') return 'All time';
    return `${this.niceDate(this.breakdownFrom)} → ${this.niceDate(this.breakdownTo)}`;
  }

  /** Show the chart, the records grid, or both. */
  setBreakdownView(view: 'both' | 'chart' | 'grid'): void {
    this.breakdownView = view;
    if (view !== 'grid') setTimeout(() => this.renderBreakdownChart(), 0);   // (re)draw once the canvas is back
  }

  /** How many bars the chart caps at for the current dimension. */
  get breakdownChartCap(): number { return this.breakdownDim === 'station' ? 15 : 20; }

  /** Column totals for the records grid + KPI chips. */
  get breakdownShortTotal(): number { return this.breakdownRows.reduce((s, r) => s + r.short, 0); }
  get breakdownAbsentTotal(): number { return this.breakdownRows.reduce((s, r) => s + r.absent, 0); }

  /** Share (0-100) of a row's shortage against the total shortage. */
  breakdownShare(r: { short: number }): number {
    const tot = this.breakdownShortTotal;
    return tot ? Math.round((r.short / tot) * 1000) / 10 : 0;
  }

  /** 1-based rank of a label in the aggregated (sorted) breakdown rows. */
  breakdownRankOf(label: string): number {
    return this.breakdownRows.findIndex((r) => r.label === label) + 1;
  }

  /**
   * Flatten the per-date map into tidy grid rows:
   *   - stations with ONE dated entry -> a single combined row
   *   - stations with several dates   -> a bold header row (totals) + light date sub-rows
   *   - zero-shortage entries are dropped
   * Stations stay in ranked order; dates ascend inside each station.
   */
  private rebuildBreakdownDetail(dateMap?: Map<string, Map<string, { short: number; absent: number }>>): void {
    if (dateMap) {
      this.breakdownDateMap = new Map(
        Array.from(dateMap.entries()).map(([label, byDate]) => [
          label,
          Array.from(byDate.entries())
            .map(([date, v]) => ({ date, short: v.short, absent: v.absent }))
            .filter((d) => d.short > 0)                          // zero-shortage days add noise
            .sort((a, b) => a.date.localeCompare(b.date)),
        ]),
      );
    }
    const detail: typeof this.breakdownDetailRows = [];
    for (const agg of this.breakdownRows) {                      // ranked order
      const dates = this.breakdownDateMap.get(agg.label) || [];
      if (dates.length === 0) continue;
      if (dates.length === 1) {
        const d = dates[0];
        detail.push({ kind: 'single', label: agg.label, date: d.date, days: 1, short: d.short, absent: d.absent });
      } else {
        detail.push({ kind: 'head', label: agg.label, date: '', days: dates.length, short: agg.short, absent: agg.absent });
        for (const d of dates) {
          detail.push({ kind: 'sub', label: agg.label, date: d.date, days: 0, short: d.short, absent: d.absent });
        }
      }
    }
    this.breakdownDetailRows = detail;
  }

  /** Load + aggregate shortage by station or by department for the resolved window. */
  loadBreakdown(): void {
    if (!this.breakdownFrom || !this.breakdownTo) this.resolveBreakdownRange();
    this.chartLoading = true;
    this.service.getShortageTrend(this.breakdownFrom, this.breakdownTo).subscribe({
      next: (rawRows) => {
        this.chartLoading = false;
        const rows = this.forSelectedCompany(rawRows);
        const map = new Map<string, { short: number; absent: number }>();
        const dateMap = new Map<string, Map<string, { short: number; absent: number }>>();
        for (const r of rows) {
          const key = (this.breakdownDim === 'station' ? r.workStationName : r.pcName) || '—';
          const cur = map.get(key) || { short: 0, absent: 0 };
          cur.short += r.shortTotal || 0;
          cur.absent += r.absent || 0;
          map.set(key, cur);

          // per-date detail for the same key (one entry per key+date)
          let byDate = dateMap.get(key);
          if (!byDate) { byDate = new Map(); dateMap.set(key, byDate); }
          const d = byDate.get(r.date) || { short: 0, absent: 0 };
          d.short += r.shortTotal || 0;
          d.absent += r.absent || 0;
          byDate.set(r.date, d);
        }
        this.breakdownRows = Array.from(map.entries())
          .map(([label, v]) => ({ label, short: v.short, absent: v.absent }))
          .filter((x) => x.short > 0)                          // only show where there's a net shortage
          .sort((a, b) => b.short - a.short);
        this.rebuildBreakdownDetail(dateMap);
        setTimeout(() => this.renderBreakdownChart(), 0);
      },
      error: () => { this.chartLoading = false; },
    });
  }

  /** Bar chart of shortage grouped by station or department, with the value drawn on each bar. */
  private async renderBreakdownChart(): Promise<void> {
    if (this.breakdownView === 'grid') return;        // chart hidden in grid-only view
    const Chart = await this.ensureChartJs();
    const canvas = document.getElementById('shortageBreakdownCanvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    const cap = this.breakdownDim === 'station' ? 15 : 20;     // keep labels readable
    const top = this.breakdownRows.slice(0, cap);
    const color = this.breakdownDim === 'station' ? '#0f6c8d' : '#5a55c9';
    const labels = top.map((m) => m.label);
    const dataset = { label: 'Shortage (Nos.)', data: top.map((m) => m.short), backgroundColor: color, borderWidth: 0, borderRadius: 3 };

    // Smooth path: animate the data in place if the chart exists AND is still
    // bound to the live canvas. (Grid view removes the canvas via *ngIf — the
    // old chart then points at a dead canvas and must be rebuilt.)
    if (this.breakdownChart) {
      if (this.breakdownChart.canvas === canvas && canvas.isConnected) {
        this.breakdownChart.data.labels = labels;
        this.breakdownChart.data.datasets = [dataset];
        this.breakdownChart.update();
        return;
      }
      this.breakdownChart.destroy();
      this.breakdownChart = null;
    }

    this.breakdownChart = new Chart(canvas.getContext('2d')!, {
      type: 'bar',
      data: { labels, datasets: [dataset] },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 22 } },                       // headroom for the value labels
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              // read the current dimension so the tooltip stays correct after in-place updates
              title: (items: any) => `${this.breakdownDim === 'station' ? 'Station' : 'Department'}: ${items[0].label}`,
              label: (c: any) => `${c.parsed.y} short`,
              // per-date detail: which dates this station was short, and by how much
              afterBody: (items: any) => {
                const dates = this.breakdownDateMap.get(items[0].label) || [];
                if (!dates.length) return [];
                const lines = dates.slice(0, 8).map((d) => `  ${this.niceDate(d.date)}: ${d.short} short`);
                if (dates.length > 8) lines.push(`  +${dates.length - 8} more date(s)`);
                return ['', 'Dates:', ...lines];
              },
            }
          },
        },
        scales: {
          x: { ticks: { maxRotation: 55, minRotation: 0, autoSkip: false }, grid: { display: false } },
          y: { beginAtZero: true, min: 0, title: { display: true, text: 'Shortage (Nos.)' } },
        },
      },
      plugins: [this.valueLabelPlugin()],
    });
  }

  /** Inline Chart.js plugin: draws each bar's value just outside the bar. */
  private valueLabelPlugin(): any {
    return {
      id: 'valueLabels',
      afterDatasetsDraw: (chart: any) => {
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = '600 11px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#243b4a';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        chart.data.datasets.forEach((ds: any, di: number) => {
          const meta = chart.getDatasetMeta(di);
          meta.data.forEach((el: any, i: number) => {
            const v = ds.data[i];
            if (v == null || v === 0) return;
            ctx.fillText(`${v}`, el.x, el.y - 4);
          });
        });
        ctx.restore();
      },
    };
  }

  /** Ensure Chart.js is loaded (reuses the same CDN-loader the exports use). */
  /** Our own Chart.js v4.
   *  The app already exposes Chart.js **v2** globally (ng2-charts/CoreUI). Rendering with it
   *  silently ignores every v3/v4 option we set — that's why axes auto-scaled (starting at 15
   *  instead of 0), legends showed, tooltips were default and value labels never drew.
   *  So: load v4 for this page, keep it privately, and hand the global back to the app. */
  private async ensureChartJs(): Promise<any> {
    if (this.chartLib) return this.chartLib;
    const w = window as any;
    if (w.__ChartV4) return (this.chartLib = w.__ChartV4);

    const existing = w.Chart;
    const existingMajor = existing?.version ? parseInt(String(existing.version), 10) : (existing ? 2 : 0);
    if (existingMajor >= 3) { w.__ChartV4 = existing; return (this.chartLib = existing); }

    try {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js');
      const v4 = w.Chart;
      if (v4 && v4 !== existing) {
        w.__ChartV4 = v4;
        if (existing) w.Chart = existing;      // the rest of the app keeps its own Chart.js
        return (this.chartLib = v4);
      }
    } catch {
      /* CDN blocked — fall back to whatever the app has (charts still draw) */
    }
    return (this.chartLib = existing);
  }

  private fmtDate(d: Date): string { return d.toISOString().slice(0, 10); }

  private static MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /** Pretty date for headings: '2026-06-23' -> '23 Jun 2026'. */
  niceDate(s: string): string {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d} ${DgManpowerStatusComponent.MONTHS[+m - 1]} ${y}`;
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
      script.onload = () => { (script as any).dataset.loaded = '1'; resolve(); };
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private num(v: any): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }
}