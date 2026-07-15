import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors } from '@angular/forms';
import {
  DgMachineWiseDownTimeService,
  DepartmentOption,
  DownTimeEntry,
  DownTimeRecord,
  SaveDownTimeBatchRequest,
  CompanyOption,
  DownTimeTrendRow,
} from './dg-machine-wise-down-time.service';

/**
 * Once an operator starts a machine row (any down-time minutes, OR a status,
 * OR a remark), BOTH Status and Remark are mandatory for that row.
 * A completely blank row is ignored.
 */
export function rowCompletenessValidator(group: AbstractControl): ValidationErrors | null {
  const num = (v: any) => { const n = Number(v); return isNaN(n) ? 0 : n; };

  const hasDownTime =
    num(group.get('shift1Min')?.value) > 0 ||
    num(group.get('shift2Min')?.value) > 0 ||
    num(group.get('lineShift1Min')?.value) > 0 ||
    num(group.get('lineShift2Min')?.value) > 0;

  const status = (group.get('status')?.value || '').trim();
  const remark = (group.get('remark')?.value || '').trim();

  if (!hasDownTime && !status && !remark) return null;   // blank row → no error

  const errors: ValidationErrors = {};
  if (!status) errors['statusRequired'] = true;
  if (!remark) errors['remarkRequired'] = true;
  return Object.keys(errors).length ? errors : null;
}

@Component({
  selector: 'app-dg-machine-wise-down-time',
  templateUrl: './dg-machine-wise-down-time.component.html',
  styleUrls: ['./dg-machine-wise-down-time.component.scss'],
  standalone: false,
  animations: [
    trigger('collapse', [
      state('open', style({ height: '*', opacity: 1, paddingTop: '*', paddingBottom: '*' })),
      state('closed', style({ height: '0', opacity: 0, paddingTop: '0', paddingBottom: '0', overflow: 'hidden' })),
      transition('open <=> closed', animate('280ms cubic-bezier(0.4, 0, 0.2, 1)')),
    ]),
  ],
})
export class DgMachineWiseDownTimeComponent implements OnInit, OnDestroy {
  form!: FormGroup;

  departments: DepartmentOption[] = [];

  isFormVisible = false;   // false = View (records) page shown first; true = Add (entry form)
  isEditMode = false;      // true when the form was opened via Edit

  // View / report grid
  reportRows: DownTimeRecord[] = [];
  reportSearched = false;

  loaded = false;          // machines loaded into the table?
  isSaving = false;
  isLoading = false;       // shows the loader overlay during load/save
  isExporting = false;     // disables export buttons while a file is generated
  infoNote = '';           // e.g. "department isn't split by line"
  successMessage = '';
  errorMessage = '';

  // ---- chart company picker (for a parent login like 33 that spans 01/03/28) ----
  viewCompanies: CompanyOption[] = [];  // companies the login may view charts for
  selectedCompany = '';                 // currently-picked company code; '' until loaded

  // ---- in-app analytics ----
  chartLoading = false;
  summaryDate = '';                     // single date -> day-wise Summary + Machine-wise chart
  recordsCollapsed = false;             // minimize the Records grid
  analyticsCollapsed = true;            // minimize the Summary & Charts panel (collapsed on first load)
  summaryRows: { station: string; min: number; hours: number; pct: number }[] = [];
  summaryTotalMin = 0;
  machineRows: { machine: string; min: number; status: string }[] = [];
  lineRows: { line: string; min: number }[] = [];   // line-wise: line down time per department / line
  dailyView: 'both' | 'chart' | 'grid' = 'both';    // daily machine-wise / line-wise: chart, grid, or both

  // ---- Machine / Department breakdown report (weekly · monthly · all) ----
  breakdownDim: 'machine' | 'department' = 'machine';      // group bars by machine or by department / line
  breakdownPeriod: 'weekly' | 'monthly' | 'all' | 'custom' = 'monthly';
  breakdownMetric: 'machine' | 'line' | 'both' = 'both';   // which down time to show: machine / line / both
  breakdownView: 'both' | 'chart' | 'grid' = 'both';       // show the chart, the records grid, or both
  breakdownFrom = '';                   // resolved date window for the breakdown
  breakdownTo = '';
  // aggregated rows carry BOTH metrics so the chart + grid can render either or both
  breakdownRows: { label: string; machineMin: number; lineMin: number; totalMin: number }[] = [];
  /** Per-date detail behind the aggregate: single rows, group headers, and date sub-rows (drives the grid). */
  breakdownDetailRows: { kind: 'single' | 'head' | 'sub'; label: string; date: string; days: number; reason: string; machineMin: number; lineMin: number; totalMin: number }[] = [];
  /** label -> its dated rows, for the chart tooltip ("12 Jun: 500 min ..."). */
  private breakdownDateMap = new Map<string, { date: string; reason: string; machineMin: number; lineMin: number; totalMin: number }[]>();
  private breakdownChart: any = null;
  private machineChart: any = null;     // Chart.js instances (destroyed on re-render)
  private lineChart: any = null;        // line-wise day chart

  // consistent metric colours, reused across the chart, the grid bars + the KPI chips
  private readonly MACHINE_COLOR = '#0f6c8d';   // machine down time -> teal
  private readonly LINE_COLOR = '#6359d9';      // line down time    -> indigo

  constructor(
    private fb: FormBuilder,
    private service: DgMachineWiseDownTimeService,
  ) { }

  ngOnInit(): void {
    const todayStr = new Date().toISOString().slice(0, 10);
    this.summaryDate = todayStr;
    this.resolveBreakdownRange();   // sets breakdownFrom / breakdownTo from the default period

    this.form = this.fb.group({
      date: [todayStr],
      departmentCode: [''],
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
        // fall back to the session company so charts still work without the picker
        this.viewCompanies = [];
        this.selectedCompany = this.service.companyCode;
      },
    });

    // Land on the View page and load any existing records.
    this.searchReport();
  }

  ngOnDestroy(): void {
    if (this.breakdownChart) { this.breakdownChart.destroy(); this.breakdownChart = null; }
    if (this.machineChart) { this.machineChart.destroy(); this.machineChart = null; }
    if (this.lineChart) { this.lineChart.destroy(); this.lineChart = null; }
  }

  /* ---------- View / Add toggle ---------- */

  showForm(): void {
    // fresh "Add" — blank entry form
    this.isFormVisible = true;
    this.isEditMode = false;
    this.lockFilters(false);
    this.entries.clear();
    this.infoNote = '';
    this.form.patchValue({ departmentCode: '' });
    this.clearMessages();
  }

  showList(): void {
    this.isFormVisible = false;
    this.isEditMode = false;
    this.lockFilters(false);
    this.clearMessages();
    this.searchReport();
  }

  /** Open the Add form in edit mode for the batch this row belongs to (date + dept + line). */
  editRecord(r: DownTimeRecord): void {
    this.isFormVisible = true;
    this.isEditMode = true;
    this.clearMessages();
    this.form.patchValue({
      date: r.date,
      departmentCode: r.departmentCode,
    });
    this.lockFilters(true);      // don't let the key fields change mid-edit
    this.loadMachines();         // loads machines + pre-fills saved values
  }

  /** Delete one machine record from the grid. */
  deleteRecord(r: DownTimeRecord): void {
    const ok = confirm(`Delete down time for "${r.machineName}" on ${r.date}?`);
    if (!ok) return;
    this.isLoading = true;
    this.service.deleteDownTimeRecord(r.mcode, r.srNo).subscribe({
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

  /** Disable/enable the date/department/line controls (used during edit). */
  private lockFilters(lock: boolean): void {
    const opts = { emitEvent: false };
    ['date', 'departmentCode'].forEach((c) => {
      const ctrl = this.form.get(c);
      if (!ctrl) return;
      lock ? ctrl.disable(opts) : ctrl.enable(opts);
    });
  }

  /** Load saved records for the View grid, using the same date/department/line filters. */
  searchReport(): void {
    this.clearMessages();
    this.fetchRecords();
  }

  /** Load the View grid for the current date/department/line filters. Does NOT clear messages. */
  private fetchRecords(): void {
    this.isLoading = true;
    const date = this.f['date'].value;
    const dept = this.f['departmentCode'].value;
    this.service.getDownTimeRecords(date, dept).subscribe({
      next: (rows) => {
        this.reportRows = rows || [];
        this.reportSearched = true;
        this.isLoading = false;
        if (!this.isFormVisible) this.loadAnalytics();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Could not load records.';
      },
    });
  }

  /** Accessor for the rows FormArray. */
  get entries(): FormArray {
    return this.form.get('entries') as FormArray;
  }

  get f() {
    return this.form.controls;
  }

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
  private forSelectedCompany(rows: DownTimeTrendRow[]): DownTimeTrendRow[] {
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
  get filteredRecords(): DownTimeRecord[] {
    if (!this.showCompanyPicker || !this.selectedCompany) return this.reportRows;
    return this.reportRows.filter((r) => (r.departmentCode || '').slice(0, 2) === this.selectedCompany);
  }

  /** Departments offered in the Records filter — narrowed to the picked company. */
  get filteredDepartments(): DepartmentOption[] {
    if (!this.showCompanyPicker || !this.selectedCompany) return this.departments;
    return this.departments.filter((d) => (d.departmentCode || '').slice(0, 2) === this.selectedCompany);
  }

  /** Company changed from the Records toolbar — re-filter the grid (and charts if the panel is open). */
  onRecordsCompanyChange(): void {
    const dept = this.form.get('departmentCode')?.value as string;
    // drop a department filter that doesn't belong to the newly-picked company
    if (dept && dept.slice(0, 2) !== this.selectedCompany) {
      this.form.get('departmentCode')?.setValue('');
    }
    this.onCompanyChange();   // keeps the charts in step when the analytics panel is open
  }

  /** Load every machine of the chosen department/line into editable rows. */
  loadMachines(): void {
    this.clearMessages();
    const departmentCode = this.f['departmentCode'].value;

    if (!departmentCode) {
      this.errorMessage = 'Please select a department first.';
      return;
    }

    this.isLoading = true;
    this.service.getMachines(departmentCode).subscribe({
      next: (machines) => {
        this.isLoading = false;
        this.entries.clear();
        (machines || []).forEach((m) => {
          this.entries.push(
            this.fb.group(
              {
                machineCode: [m.machineCode],
                machineName: [m.machineName],
                shift1Min: [null],
                shift2Min: [null],
                lineShift1Min: [null],
                lineShift2Min: [null],
                status: [''],
                remark: [''],
              },
              { validators: rowCompletenessValidator },
            ),
          );
        });

        this.loaded = true;

        // Pre-load anything already saved for this date (edit mode).
        const date = this.f['date'].value;
        this.service.getDownTimeByDate(date, departmentCode).subscribe({
          next: (existing) => this.applyExisting(existing),
        });
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Could not load machines.';
      },
    });
  }

  private applyExisting(existing: DownTimeEntry[]): void {
    if (!existing || existing.length === 0) return;
    this.entries.controls.forEach((row) => {
      const match = existing.find((e) => e.machineCode === row.get('machineCode')!.value);
      if (match) {
        row.patchValue({
          shift1Min: match.shift1Min,
          shift2Min: match.shift2Min,
          lineShift1Min: match.lineShift1Min,
          lineShift2Min: match.lineShift2Min,
          status: match.status,
          remark: match.remark,
        });
      }
    });
  }

  /** Total Down Time = 1st + 2nd shift (line down time excluded, as per your form). */
  rowTotal(row: any): number {
    return this.num(row.get('shift1Min')!.value) + this.num(row.get('shift2Min')!.value);
  }

  /** Total Line Down Time = line 1st + line 2nd shift. */
  rowLineTotal(row: any): number {
    return this.num(row.get('lineShift1Min')!.value) + this.num(row.get('lineShift2Min')!.value);
  }

  get grandTotal(): number {
    return this.entries.controls.reduce((s, r) => s + this.rowTotal(r), 0);
  }

  get grandShift1(): number {
    return this.entries.controls.reduce((s, r) => s + this.num(r.get('shift1Min')!.value), 0);
  }

  get grandShift2(): number {
    return this.entries.controls.reduce((s, r) => s + this.num(r.get('shift2Min')!.value), 0);
  }

  get grandLineShift1(): number {
    return this.entries.controls.reduce((s, r) => s + this.num(r.get('lineShift1Min')!.value), 0);
  }

  get grandLineShift2(): number {
    return this.entries.controls.reduce((s, r) => s + this.num(r.get('lineShift2Min')!.value), 0);
  }

  get grandLineTotal(): number {
    return this.entries.controls.reduce((s, r) => s + this.rowLineTotal(r), 0);
  }

  /** Abort the current submit attempt, freeing the re-entrancy guard. */
  private failSubmit(message: string): void {
    this.errorMessage = message;
    this.isSaving = false;
  }

  /** Save the whole department in one go. Blank cells are stored as 0. */
  submit(): void {
    if (this.isSaving) return;          // re-entrancy guard — blocks rapid double-clicks
    this.isSaving = true;
    this.clearMessages();

    if (!this.f['date'].value) { this.failSubmit('Please select the date.'); return; }
    if (this.entries.length === 0) { this.failSubmit('Load machines before saving.'); return; }

    const raw = this.form.getRawValue();   // includes disabled (locked) controls
    const deptCode = raw.departmentCode;
    const dept = this.departments.find((d) => d.departmentCode === deptCode);

    // A row is "touched" if it has any down time, a status, or a remark.
    // Fully-blank machines (untouched) are not saved.
    const isFilled = (r: any) =>
      this.num(r.get('shift1Min')!.value) > 0 ||
      this.num(r.get('shift2Min')!.value) > 0 ||
      this.num(r.get('lineShift1Min')!.value) > 0 ||
      this.num(r.get('lineShift2Min')!.value) > 0 ||
      !!(r.get('status')!.value || '').trim() ||
      !!(r.get('remark')!.value || '').trim();

    const filled = this.entries.controls.filter(isFilled);
    if (filled.length === 0) {
      this.errorMessage = 'Enter down time (or a status / remark) for at least one machine.';
      return;
    }

    // Every started row must carry BOTH Status and Remark.
    const incomplete = this.incompleteRows();
    if (incomplete.length) {
      let msg: string;
      if (incomplete.length === 1) {
        const r = incomplete[0];
        const need = [r.needStatus && 'Status', r.needRemark && 'Reason'].filter(Boolean).join(' & ');
        msg = `Please add ${need} for "${r.name}".`;
      } else {
        msg = `Status & Remark are required for every machine you entered — ${incomplete.length} rows are still incomplete.`;
      }
      this.failSubmit(msg);
      return;
    }

    const payload: SaveDownTimeBatchRequest = {
      date: raw.date,
      companyCode: this.service.companyCode,
      createdBy: this.service.sessionUser,
      deptCode: deptCode,
      deptName: dept ? dept.departmentName : deptCode,
      entries: filled.map((r) => ({
        machineCode: r.get('machineCode')!.value,
        machineName: r.get('machineName')!.value,
        shift1Min: this.num(r.get('shift1Min')!.value),
        shift2Min: this.num(r.get('shift2Min')!.value),
        totalMin: this.rowTotal(r),
        lineShift1Min: this.num(r.get('lineShift1Min')!.value),
        lineShift2Min: this.num(r.get('lineShift2Min')!.value),
        lineTotalMin: this.rowLineTotal(r),
        status: (r.get('status')!.value || '').trim(),
        remark: (r.get('remark')!.value || '').trim(),
      })),
    };

    //this.isSaving = true;
    this.isLoading = true;
    this.service.saveDownTimeBatch(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.isEditMode = false;
        this.lockFilters(false);
        this.successMessage = `Saved ${payload.entries.length} machine(s) for ${payload.date}.`;
        // Show the View grid with the just-saved rows; keep the success message visible.
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

  /** Clear button: reset the whole form and the loaded table. */
  clear(): void {
    this.clearMessages();
    this.infoNote = '';
    this.loaded = false;
    this.isEditMode = false;
    this.lockFilters(false);
    this.entries.clear();
    this.form.patchValue({ departmentCode: '' });
  }

  /* ===================== EXPORTS (PDF / Excel) ===================== */

  /** Group the current grid rows by department, with per-department subtotals (data sheet). */
  private buildExportGroups(): {
    dept: string;
    rows: DownTimeRecord[];
    sub: { s1: number; s2: number; tot: number; ls1: number; ls2: number; lt: number };
  }[] {
    const groups: any[] = [];
    const index = new Map<string, number>();
    for (const r of this.filteredRecords) {
      const key = r.departmentName || r.departmentCode || '\u2014';
      if (!index.has(key)) {
        index.set(key, groups.length);
        groups.push({ dept: key, rows: [], sub: { s1: 0, s2: 0, tot: 0, ls1: 0, ls2: 0, lt: 0 } });
      }
      const g = groups[index.get(key)!];
      g.rows.push(r);
      g.sub.s1 += r.shift1Min || 0;
      g.sub.s2 += r.shift2Min || 0;
      g.sub.tot += r.totalMin || 0;
      g.sub.ls1 += r.lineShift1Min || 0;
      g.sub.ls2 += r.lineShift2Min || 0;
      g.sub.lt += r.lineTotalMin || 0;
    }
    return groups;
  }

  /** Station summary (Department -> machine downtime minutes), plus Hours, for the Summary sheet. */
  private buildStationSummary(): { station: string; min: number; hours: number }[] {
    const map = new Map<string, number>();
    for (const r of this.filteredRecords) {
      const key = r.departmentName || r.departmentCode || '\u2014';
      map.set(key, (map.get(key) || 0) + (r.totalMin || 0));
    }
    return Array.from(map.entries())
      .map(([station, min]) => ({ station, min, hours: Math.round((min / 60) * 100) / 100 }))
      .sort((a, b) => b.min - a.min);
  }

  /** Per-machine downtime + status for the Machine-wise sheet (sorted high to low). */
  private buildMachineList(): { machine: string; min: number; status: string }[] {
    return this.filteredRecords
      .map((r) => ({ machine: r.machineName || r.machineCode, min: r.totalMin || 0, status: r.status || '' }))
      .filter((m) => m.min > 0)
      .sort((a, b) => b.min - a.min);
  }

  private exportDateLabel(): string {
    const d = this.f['date'].value;
    return d ? `Date: ${d}` : 'Date: All';
  }

  private exportFileName(ext: string): string {
    const safe = (s: string) => (s || '').replace(/[\\/:*?"<>|]/g, '-');
    const d = this.f['date'].value || 'all';
    return `Machine_Wise_Down_Time_${safe(d)}.${ext}`;
  }

  private statusColor(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'open') return '#e24b4a';      // under maintenance -> red
    if (s === 'closed') return '#1d9e75';    // repaired -> green
    return '#9c9a92';                        // unspecified -> grey
  }

  /** Scales for a vertical bar chart, value axis forced to start at 0 — works on Chart.js v2/v3/v4. */
  private barScales(valueLabel: string, rotateX: boolean): any {
    const Chart = (window as any).Chart;
    const major = Chart && Chart.version ? parseInt(String(Chart.version), 10) : 4;
    const xTicks = rotateX ? { maxRotation: 60, minRotation: 0, autoSkip: false } : {};
    if (major === 2) {
      return {
        xAxes: [{ ticks: xTicks }],
        yAxes: [{ ticks: { beginAtZero: true, min: 0 }, scaleLabel: { display: true, labelString: valueLabel } }],
      };
    }
    return {
      x: { ticks: xTicks },
      y: { beginAtZero: true, min: 0, title: { display: true, text: valueLabel } },
    };
  }

  /** Ensure Chart.js is loaded (used for chart images in Excel + the in-app trend charts). */
  private async ensureChartJs(): Promise<any> {
    if (!(window as any).Chart) {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js');
    }
    return (window as any).Chart;
  }

  /** Render a bar chart off-screen and return a PNG data URL (for embedding into Excel). */
  private async renderBarChartPng(
    labels: string[], data: number[], colors: string | string[], title: string,
    width = 760, height = 380,
  ): Promise<string> {
    const Chart = await this.ensureChartJs();
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    // Attach off-screen: some Chart.js builds touch the canvas's parent during setup
    // (addResizeListener), which throws on a detached canvas ("insertBefore" of null).
    canvas.style.position = 'fixed';
    canvas.style.left = '-10000px';
    canvas.style.top = '0';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    const chart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: title, data, backgroundColor: colors, borderWidth: 0 }] },
      options: {
        animation: false, responsive: false,
        plugins: { legend: { display: false }, title: { display: true, text: title, font: { size: 14 } } },
        scales: this.barScales('Minutes', true),
      },
    });
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const url = canvas.toDataURL('image/png');
    chart.destroy();
    canvas.remove();               // clean up the off-screen canvas
    return url;
  }

  /** Excel export: Data + Summary (Station/Min/Hours + chart) + Machine-wise (chart colored by status). */
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

      const TEAL = 'FF0F6C8D', TEAL_D = 'FF0D5E7A', GREY = 'FFE6E6E6', BLUE = 'FFD2E1F0';
      const thin = { style: 'thin', color: { argb: 'FFB0B0B0' } };
      const allBorders = { top: thin, left: thin, bottom: thin, right: thin };
      const center = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;

      const wb = new ExcelJS.Workbook();

      /* ---------------- Sheet 1: Data ---------------- */
      const ws = wb.addWorksheet('Machine Down Time');
      ws.columns = [
        { width: 6 }, { width: 24 }, { width: 22 },
        { width: 11 }, { width: 11 }, { width: 12 },
        { width: 11 }, { width: 11 }, { width: 12 },
        { width: 16 }, { width: 30 },
      ];
      ws.mergeCells('A1:K1');
      const t1 = ws.getCell('A1');
      t1.value = {
        richText: [
          { text: this.chartCompanyName + '\n', font: { bold: true, size: 15, color: { argb: 'FFFFFFFF' } } },
          { text: `Machine Wise Down Time U1        ${this.exportDateLabel()}`, font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } } },
        ],
      };
      t1.alignment = center;
      t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
      ws.getRow(1).height = 42;

      // two-row header
      ws.mergeCells('A2:A3'); ws.mergeCells('B2:B3'); ws.mergeCells('C2:C3');
      ws.mergeCells('D2:F2'); ws.mergeCells('G2:I2'); ws.mergeCells('J2:J3'); ws.mergeCells('K2:K3');
      ws.getCell('A2').value = 'Sr.no';
      ws.getCell('B2').value = 'Department';
      ws.getCell('C2').value = 'Machine';
      ws.getCell('D2').value = 'Machine Down Time (min)';
      ws.getCell('G2').value = 'Line Down Time (min)';
      ws.getCell('J2').value = 'Status';
      ws.getCell('K2').value = 'Reason';
      ws.getCell('D3').value = '1st shift';
      ws.getCell('E3').value = '2nd shift';
      ws.getCell('F3').value = 'Total Down Time';
      ws.getCell('G3').value = '1st shift';
      ws.getCell('H3').value = '2nd shift';
      ws.getCell('I3').value = 'Total Line Down Time';
      for (const ref of ['A2', 'B2', 'C2', 'D2', 'G2', 'J2', 'K2', 'D3', 'E3', 'F3', 'G3', 'H3', 'I3']) {
        const c = ws.getCell(ref);
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ['D2', 'D3', 'E3', 'F3', 'G2', 'G3', 'H3', 'I3'].includes(ref) ? TEAL_D : TEAL } };
        c.alignment = center; c.border = allBorders;
      }
      ws.getRow(3).height = 26;

      let sr = 1, rowNum = 4;
      const subRows: number[] = [];
      const G = { s1: 0, s2: 0, tot: 0, ls1: 0, ls2: 0, lt: 0 };
      for (const g of this.buildExportGroups()) {
        for (const r of g.rows) {
          ws.getRow(rowNum).values = [sr++, r.departmentName, r.machineName,
          r.shift1Min, r.shift2Min, r.totalMin,
          r.lineShift1Min, r.lineShift2Min, r.lineTotalMin,
          r.status || '', r.remark || ''];
          rowNum++;
        }
        ws.getRow(rowNum).values = ['Sub Total', '', '', g.sub.s1, g.sub.s2, g.sub.tot, g.sub.ls1, g.sub.ls2, g.sub.lt, '', ''];
        subRows.push(rowNum); rowNum++;
        G.s1 += g.sub.s1; G.s2 += g.sub.s2; G.tot += g.sub.tot; G.ls1 += g.sub.ls1; G.ls2 += g.sub.ls2; G.lt += g.sub.lt;
      }
      ws.getRow(rowNum).values = ['Grand Total', '', '', G.s1, G.s2, G.tot, G.ls1, G.ls2, G.lt, '', ''];
      const grandRow = rowNum, lastRow = rowNum;
      for (let r = 4; r <= lastRow; r++) {
        for (let c = 1; c <= 11; c++) {
          const cell = ws.getRow(r).getCell(c);
          cell.border = allBorders;
          const numeric = c === 1 || (c >= 4 && c <= 9);
          cell.alignment = { horizontal: numeric ? 'center' : 'left', vertical: 'middle', wrapText: c === 11 };
          if (subRows.includes(r)) { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } }; }
          else if (r === grandRow) { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } }; }
        }
      }

      /* ---------------- Sheet 2: Summary ---------------- */
      const summary = this.buildStationSummary();
      const totalMin = summary.reduce((s, x) => s + x.min, 0);
      const wss = wb.addWorksheet('Summary and Chart');
      wss.columns = [{ width: 26 }, { width: 16 }, { width: 12 }];
      wss.getCell('A1').value = 'Summary';
      wss.getCell('A1').font = { bold: true, size: 13 };
      ['Station', 'Downtime (Min.)', 'Hours'].forEach((h, i) => {
        const c = wss.getCell(2, i + 1);
        c.value = h; c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
        c.alignment = center; c.border = allBorders;
      });
      let sRow = 3;
      for (const x of summary) {
        wss.getCell(sRow, 1).value = x.station;
        wss.getCell(sRow, 2).value = x.min;
        wss.getCell(sRow, 3).value = x.hours;
        for (let c = 1; c <= 3; c++) {
          const cell = wss.getCell(sRow, c);
          cell.border = allBorders;
          cell.alignment = { horizontal: c === 1 ? 'left' : 'center', vertical: 'middle' };
        }
        sRow++;
      }
      wss.getCell(sRow, 1).value = 'Total';
      wss.getCell(sRow, 2).value = totalMin;
      wss.getCell(sRow, 3).value = Math.round((totalMin / 60) * 100) / 100;
      for (let c = 1; c <= 3; c++) {
        const cell = wss.getCell(sRow, c);
        cell.font = { bold: true }; cell.border = allBorders;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
        cell.alignment = { horizontal: c === 1 ? 'left' : 'center', vertical: 'middle' };
      }
      try {
        const png = await this.renderBarChartPng(summary.map((x) => x.station), summary.map((x) => x.min), '#0f6c8d', 'Down time by station (min)');
        const id = wb.addImage({ base64: png, extension: 'png' });
        wss.addImage(id, { tl: { col: 4, row: 1 }, ext: { width: 760, height: 380 } });
      } catch { /* chart optional */ }

      /* ---------------- Sheet 3: Machine wise chart ---------------- */
      const machines = this.buildMachineList();
      const wsm = wb.addWorksheet('Machine wise chart');
      wsm.columns = [{ width: 30 }, { width: 14 }, { width: 22 }];
      ['Machine Name', 'Down time (min)', 'Status'].forEach((h, i) => {
        const c = wsm.getCell(1, i + 1);
        c.value = h; c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
        c.alignment = center; c.border = allBorders;
      });
      machines.forEach((m, i) => {
        const row = i + 2;
        wsm.getCell(row, 1).value = m.machine;
        wsm.getCell(row, 2).value = m.min;
        wsm.getCell(row, 3).value = m.status ? (m.status === 'Open' ? 'Open (Under Maintenance)' : 'Closed (Repaired)') : '';
        for (let c = 1; c <= 3; c++) {
          const cell = wsm.getCell(row, c);
          cell.border = allBorders;
          cell.alignment = { horizontal: c === 2 ? 'center' : 'left', vertical: 'middle' };
        }
        const sc = wsm.getCell(row, 3);
        if (m.status === 'Open') sc.font = { color: { argb: 'FFA32D2D' }, bold: true };
        else if (m.status === 'Closed') sc.font = { color: { argb: 'FF0F6E56' }, bold: true };
      });
      try {
        const colors = machines.map((m) => this.statusColor(m.status));
        const png = await this.renderBarChartPng(machines.map((m) => m.machine), machines.map((m) => m.min), colors, 'Machine wise down time  (red = Open / green = Closed)');
        const id = wb.addImage({ base64: png, extension: 'png' });
        wsm.addImage(id, { tl: { col: 4, row: 1 }, ext: { width: 820, height: 400 } });
      } catch { /* chart optional */ }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** PDF export — grouped, two-row grouped header (Machine DT / Line DT) + Status, sub + grand totals. */
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
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(15, 108, 141);
      doc.text(this.chartCompanyName, pageW / 2, 12, { align: 'center' });
      doc.setFontSize(11); doc.setTextColor(40, 40, 40);
      doc.text('Machine Wise Down Time U1', pageW / 2, 19, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 60, 60);
      doc.text(this.exportDateLabel(), pageW - 14, 12, { align: 'right' });

      const head = [
        [
          { content: 'Sr.no', rowSpan: 2 }, { content: 'Department', rowSpan: 2 }, { content: 'Machine', rowSpan: 2 },
          { content: 'Machine Down Time (min)', colSpan: 3 },
          { content: 'Line Down Time (min)', colSpan: 3 },
          { content: 'Status', rowSpan: 2 }, { content: 'Reason', rowSpan: 2 },
        ],
        ['1st', '2nd', 'Total', '1st', '2nd', 'Total'],
      ];

      const groups = this.buildExportGroups();
      const body: any[] = [];
      let sr = 1;
      const G = { s1: 0, s2: 0, tot: 0, ls1: 0, ls2: 0, lt: 0 };
      const sub = (v: any) => ({ content: v, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } });
      const gt = (v: any) => ({ content: v, styles: { fontStyle: 'bold', fillColor: [210, 225, 240] } });
      const statusText = (s: string) => (s === 'Open' ? 'Open' : s === 'Closed' ? 'Closed' : '');

      for (const g of groups) {
        for (const r of g.rows) {
          body.push([sr++, r.departmentName, r.machineName,
          r.shift1Min, r.shift2Min, r.totalMin,
          r.lineShift1Min, r.lineShift2Min, r.lineTotalMin,
          statusText(r.status), r.remark || '']);
        }
        body.push([sub('Sub Total'), sub(''), sub(''), sub(g.sub.s1), sub(g.sub.s2), sub(g.sub.tot), sub(g.sub.ls1), sub(g.sub.ls2), sub(g.sub.lt), sub(''), sub('')]);
        G.s1 += g.sub.s1; G.s2 += g.sub.s2; G.tot += g.sub.tot; G.ls1 += g.sub.ls1; G.ls2 += g.sub.ls2; G.lt += g.sub.lt;
      }
      body.push([gt('Grand Total'), gt(''), gt(''), gt(G.s1), gt(G.s2), gt(G.tot), gt(G.ls1), gt(G.ls2), gt(G.lt), gt(''), gt('')]);

      (doc as any).autoTable({
        head, body, startY: 24, theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.3, valign: 'middle', halign: 'center' },
        headStyles: { fillColor: [15, 108, 141], textColor: 255, halign: 'center' },
        columnStyles: { 1: { halign: 'left', cellWidth: 32 }, 2: { halign: 'left', cellWidth: 42 }, 10: { halign: 'left' } },
      });

      doc.save(this.exportFileName('pdf'));
    } catch (e) {
      console.error('PDF export failed:', e);
      this.errorMessage = 'Failed to generate PDF. Please try again.';
    } finally {
      this.isExporting = false;
    }
  }

  /**
   * Export ONE chart to PDF by capturing its live <canvas>, so the PDF matches
   * the screen exactly (grouped bars, colours, value labels). Requires the card
   * to be showing a chart (not grid-only). `heading` is the page title.
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

      // fit the captured image to the page width, preserving aspect ratio
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
   *   Chart + Grid -> chart on top, ranked grid below
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

      // header: company + "Down time breakdown · <period>"
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(15, 108, 141);
      doc.text(pdfSafe(this.chartCompanyName), pageW / 2, 14, { align: 'center' });
      doc.setFontSize(11); doc.setTextColor(40, 40, 40);
      doc.text(pdfSafe('Down time breakdown  ·  ' + this.breakdownPeriodLabel), pageW / 2, 21, { align: 'center' });

      let startY = 26;

      // chart image — included for Chart and Chart+Grid views
      if (this.breakdownView !== 'grid') {
        const src = document.getElementById('breakdownChartCanvas') as HTMLCanvasElement | null;
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

      // ranked grid table — included for Grid and Chart+Grid views (per-date rows)
      if (this.breakdownView !== 'chart') {
        const dimLabel = this.breakdownDim === 'machine' ? 'Machine' : 'Department / Line';
        const head = [['#', dimLabel, 'Date', 'Reason', 'Machine DT (min)', 'Line DT (min)', 'Total (min)', 'Share']];
        const kinds: string[] = [];
        const body: any[] = this.breakdownDetailRows.map((r) => {
          kinds.push(r.kind);
          return [
            r.kind !== 'sub' ? this.breakdownRankOf(r.label) : '',
            r.kind !== 'sub' ? pdfSafe(r.label) : '',
            r.kind === 'head' ? '' : this.niceDate(r.date),
            r.kind === 'head' ? '' : pdfSafe(r.reason || ''),
            r.machineMin, r.lineMin, r.totalMin,
            this.breakdownShare(r).toFixed(1) + '%',
          ];
        });
        kinds.push('total');
        body.push(['', 'Total', '', '', this.breakdownMachineTotal, this.breakdownLineTotal, this.breakdownCombinedTotal, '100%']);

        (doc as any).autoTable({
          head, body, startY, theme: 'grid',
          styles: { fontSize: 8, cellPadding: 1.6, valign: 'middle' },
          headStyles: { fillColor: [15, 108, 141], textColor: 255, halign: 'center' },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'left' }, 2: { halign: 'center', cellWidth: 24 },
            3: { halign: 'left', cellWidth: 52 },
            4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
          },
          didParseCell: (d: any) => {
            const k = kinds[d.row.index];
            if (k === 'total') { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [235, 242, 246]; }
            else if (k === 'head' || k === 'single') { d.cell.styles.fontStyle = 'bold'; if (k === 'head') d.cell.styles.fillColor = [240, 246, 249]; }
            else { d.cell.styles.textColor = [90, 105, 115]; }
          },
        });
      }

      doc.save('Down_time_breakdown.pdf');
    } catch (e) {
      console.error('Breakdown PDF export failed:', e);
      this.errorMessage = 'Failed to generate the breakdown PDF. Please try again.';
    } finally {
      this.isExporting = false;
    }
  }

  /* ===================== IN-APP ANALYTICS (Summary + Breakdown + Machine-wise) ===================== */

  toggleRecords(): void { this.recordsCollapsed = !this.recordsCollapsed; }

  toggleAnalytics(): void {
    this.analyticsCollapsed = !this.analyticsCollapsed;
    if (!this.analyticsCollapsed) setTimeout(() => this.loadAnalytics(), 0);
  }

  applySummaryDate(): void {
    if (!this.summaryDate) return;
    this.loadSummary();
  }

  /** Daily machine-wise / line-wise: switch between chart, grid, or both. Redraw charts when shown. */
  setDailyView(view: 'both' | 'chart' | 'grid'): void {
    this.dailyView = view;
    if (view !== 'grid') {
      // the canvases re-enter the DOM on the next tick — render after Angular updates the view
      setTimeout(() => { this.renderMachineChart(); this.renderLineChart(); }, 0);
    }
  }

  get machineDailyTotal(): number { return this.machineRows.reduce((s, r) => s + (r.min || 0), 0); }
  get lineDailyTotal(): number { return this.lineRows.reduce((s, r) => s + (r.min || 0), 0); }
  machineDailyShare(min: number): number { const t = this.machineDailyTotal; return t > 0 ? (min / t) * 100 : 0; }
  lineDailyShare(min: number): number { const t = this.lineDailyTotal; return t > 0 ? (min / t) * 100 : 0; }

  private fmtDate(d: Date): string { return d.toISOString().slice(0, 10); }

  private static MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /** Pretty date for headings: '2026-06-23' -> '23 Jun 2026'. */
  niceDate(s: string): string {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d} ${DgMachineWiseDownTimeComponent.MONTHS[+m - 1]} ${y}`;
  }

  /** Hard refresh: destroy every chart instance and reload the panel (for the odd blank chart). */
  refreshCharts(): void {
    if (this.breakdownChart) { this.breakdownChart.destroy(); this.breakdownChart = null; }
    if (this.machineChart)   { this.machineChart.destroy();   this.machineChart = null; }
    if (this.lineChart)      { this.lineChart.destroy();      this.lineChart = null; }
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    if (this.analyticsCollapsed) return;
    this.loadSummary();
    this.loadBreakdown();
  }

  /** Day-wise: Summary by department + Machine-wise chart for the single selected date. */
  loadSummary(): void {
    if (!this.summaryDate) return;
    this.chartLoading = true;
    this.service.getDownTimeTrend(this.summaryDate, this.summaryDate).subscribe({
      next: (rawRows) => {
        this.chartLoading = false;
        const rows = this.forSelectedCompany(rawRows);

        const sMap = new Map<string, number>();
        for (const r of rows) {
          const key = r.departmentName || '—';
          sMap.set(key, (sMap.get(key) || 0) + (r.totalMin || 0));
        }
        const built = Array.from(sMap.entries())
          .map(([station, min]) => ({ station, min, hours: Math.round((min / 60) * 100) / 100, pct: 0 }))
          .sort((a, b) => b.min - a.min);
        this.summaryTotalMin = built.reduce((s, x) => s + x.min, 0);
        for (const r of built) {
          r.pct = this.summaryTotalMin ? Math.round((r.min / this.summaryTotalMin) * 1000) / 10 : 0;
        }
        this.summaryRows = built;

        const mMap = new Map<string, { min: number; status: string }>();
        for (const r of rows) {
          const key = r.machineName || '—';
          const cur = mMap.get(key) || { min: 0, status: '' };
          cur.min += r.totalMin || 0;
          if (r.status) cur.status = r.status;
          mMap.set(key, cur);
        }
        this.machineRows = Array.from(mMap.entries())
          .map(([machine, v]) => ({ machine, min: v.min, status: v.status }))
          .filter((m) => m.min > 0)
          .sort((a, b) => b.min - a.min);

        // line-wise: total LINE down time per department / line for the same date
        const lMap = new Map<string, number>();
        for (const r of rows) {
          const key = r.departmentName || '—';
          lMap.set(key, (lMap.get(key) || 0) + (r.lineTotalMin || 0));
        }
        this.lineRows = Array.from(lMap.entries())
          .map(([line, min]) => ({ line, min }))
          .filter((m) => m.min > 0)
          .sort((a, b) => b.min - a.min);

        setTimeout(() => { this.renderMachineChart(); this.renderLineChart(); }, 0);
      },
      error: () => { this.chartLoading = false; },
    });
  }

  /* ---------- Machine / Department breakdown report (weekly · monthly · all) ---------- */

  /** Periods offered for the current dimension. Machine omits "All" to keep the bar count readable. */
  get breakdownPeriods(): ('weekly' | 'monthly' | 'all')[] {
    return this.breakdownDim === 'machine' ? ['weekly', 'monthly'] : ['weekly', 'monthly', 'all'];
  }

  /** Switch between a per-machine and a per-department/line breakdown. */
  setBreakdownDim(dim: 'machine' | 'department'): void {
    this.breakdownDim = dim;
    if (dim === 'machine' && this.breakdownPeriod === 'all') {
      this.breakdownPeriod = 'monthly';        // Machine view has no "All" option
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

  /** User picked a custom From / To range for the breakdown report. */
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

  /** Load + aggregate down time by machine or by department/line for the resolved window. */
  loadBreakdown(): void {
    if (!this.breakdownFrom || !this.breakdownTo) this.resolveBreakdownRange();
    this.chartLoading = true;
    this.service.getDownTimeTrend(this.breakdownFrom, this.breakdownTo).subscribe({
      next: (rawRows) => {
        this.chartLoading = false;
        const rows = this.forSelectedCompany(rawRows);
        const map = new Map<string, { machineMin: number; lineMin: number }>();
        const dateMap = new Map<string, Map<string, { machineMin: number; lineMin: number; reasons: Set<string> }>>();
        for (const r of rows) {
          const key = (this.breakdownDim === 'machine' ? r.machineName : r.departmentName) || '—';
          const cur = map.get(key) || { machineMin: 0, lineMin: 0 };
          cur.machineMin += r.totalMin || 0;       // machine down time
          cur.lineMin += r.lineTotalMin || 0;      // line down time
          map.set(key, cur);

          // per-date detail for the same key (one entry per key+date)
          let byDate = dateMap.get(key);
          if (!byDate) { byDate = new Map(); dateMap.set(key, byDate); }
          const d = byDate.get(r.date) || { machineMin: 0, lineMin: 0, reasons: new Set<string>() };
          d.machineMin += r.totalMin || 0;
          d.lineMin += r.lineTotalMin || 0;
          if ((r.remark || '').trim()) d.reasons.add(r.remark.trim());   // reason(s) for this date
          byDate.set(r.date, d);
        }
        this.breakdownRows = Array.from(map.entries())
          .map(([label, v]) => ({ label, machineMin: v.machineMin, lineMin: v.lineMin, totalMin: v.machineMin + v.lineMin }))
          .filter((x) => x.machineMin > 0 || x.lineMin > 0)
          .sort((a, b) => this.metricValue(b) - this.metricValue(a));
        this.rebuildBreakdownDetail(dateMap);
        setTimeout(() => this.renderBreakdownChart(), 0);
      },
      error: () => { this.chartLoading = false; },
    });
  }

  /** The value a row is ranked / charted by, per the active metric. */
  private metricValue(r: { machineMin: number; lineMin: number; totalMin: number }): number {
    return this.breakdownMetric === 'line' ? r.lineMin
      : this.breakdownMetric === 'both' ? r.totalMin
        : r.machineMin;
  }

  /**
   * Flatten the per-date map into tidy grid rows:
   *   - machines with ONE dated entry -> a single combined row
   *   - machines with several dates   -> a bold header row (totals) + light date sub-rows
   *   - zero-minute entries (remark-only) are dropped
   * Machines stay in ranked order; dates ascend inside each machine.
   */
  private rebuildBreakdownDetail(dateMap?: Map<string, Map<string, { machineMin: number; lineMin: number; reasons: Set<string> }>>): void {
    if (dateMap) {
      this.breakdownDateMap = new Map(
        Array.from(dateMap.entries()).map(([label, byDate]) => [
          label,
          Array.from(byDate.entries())
            .map(([date, v]) => ({ date, reason: Array.from(v.reasons).join(' | '), machineMin: v.machineMin, lineMin: v.lineMin, totalMin: v.machineMin + v.lineMin }))
            .filter((d) => d.totalMin > 0)                       // remark-only rows add noise
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
        detail.push({ kind: 'single', label: agg.label, date: d.date, days: 1, reason: d.reason, machineMin: d.machineMin, lineMin: d.lineMin, totalMin: d.totalMin });
      } else {
        detail.push({ kind: 'head', label: agg.label, date: '', days: dates.length, reason: '', machineMin: agg.machineMin, lineMin: agg.lineMin, totalMin: agg.totalMin });
        for (const d of dates) {
          detail.push({ kind: 'sub', label: agg.label, date: d.date, days: 0, reason: d.reason, machineMin: d.machineMin, lineMin: d.lineMin, totalMin: d.totalMin });
        }
      }
    }
    this.breakdownDetailRows = detail;
  }

  /** 1-based rank of a label in the aggregated (sorted) breakdown rows. */
  breakdownRankOf(label: string): number {
    return this.breakdownRows.findIndex((r) => r.label === label) + 1;
  }

  /** Breakdown (dated) grid -> Excel: same rows as on screen, with Reason. */
  async exportBreakdownExcel(): Promise<void> {
    if (this.isExporting) return;
    if (!this.breakdownDetailRows.length) { this.errorMessage = 'No breakdown data to export.'; return; }
    this.isExporting = true;
    try {
      if (!(window as any).ExcelJS) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
      }
      const ExcelJS = (window as any).ExcelJS;
      if (!ExcelJS) { this.errorMessage = 'Excel library failed to load.'; return; }

      const TEAL = 'FF0F6C8D';
      const thin = { style: 'thin', color: { argb: 'FFB0B0B0' } };
      const allBorders = { top: thin, left: thin, bottom: thin, right: thin };
      const dimLabel = this.breakdownDim === 'machine' ? 'Machine' : 'Department / Line';

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Downtime breakdown');
      ws.columns = [
        { width: 5 }, { width: 30 }, { width: 13 }, { width: 42 },
        { width: 15 }, { width: 13 }, { width: 12 }, { width: 9 },
      ];

      ws.mergeCells('A1:H1');
      const t1 = ws.getCell('A1');
      t1.value = {
        richText: [
          { text: this.chartCompanyName + '\n', font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } } },
          { text: `Machine-wise downtime report        ${this.breakdownPeriodLabel}`, font: { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } } },
        ],
      };
      t1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;
      t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
      ws.getRow(1).height = 36;

      const headers = ['#', dimLabel, 'Date', 'Reason', 'Machine DT (min)', 'Line DT (min)', 'Total (min)', 'Share'];
      headers.forEach((h, i) => {
        const c = ws.getCell(2, i + 1);
        c.value = h;
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;
        c.border = allBorders;
      });

      let rowNum = 3;
      const writeRow = (vals: any[], kind: 'single' | 'head' | 'sub' | 'total') => {
        ws.getRow(rowNum).values = vals;
        for (let c = 1; c <= 8; c++) {
          const cell = ws.getRow(rowNum).getCell(c);
          cell.border = allBorders;
          cell.alignment = {
            horizontal: c === 1 || c === 3 ? 'center' : c >= 5 ? 'right' : 'left',
            vertical: 'middle', wrapText: c === 4,
          };
          if (kind === 'total') { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF2F6' } }; }
          else if (kind === 'head') { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F6F9' } }; }
          else if (kind === 'single') { cell.font = { bold: true }; }
          else { cell.font = { color: { argb: 'FF5A6973' }, size: 10 }; }
        }
        rowNum++;
      };

      for (const r of this.breakdownDetailRows) {
        writeRow([
          r.kind !== 'sub' ? this.breakdownRankOf(r.label) : '',
          r.kind !== 'sub' ? r.label : '',
          r.kind === 'head' ? '' : this.niceDate(r.date),
          r.kind === 'head' ? '' : (r.reason || ''),
          r.machineMin, r.lineMin, r.totalMin,
          this.breakdownShare(r).toFixed(1) + '%',
        ], r.kind);
      }
      writeRow(['', 'Total', '', '', this.breakdownMachineTotal, this.breakdownLineTotal, this.breakdownCombinedTotal, '100%'], 'total');

      const buf = await wb.xlsx.writeBuffer();
      this.downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Down_time_breakdown.xlsx');
    } catch (e) {
      console.error('Breakdown Excel export failed:', e);
      this.errorMessage = 'Failed to generate the breakdown Excel. Please try again.';
    } finally {
      this.isExporting = false;
    }
  }

  /** Switch the charted metric: machine down time / line down time / both. */
  setBreakdownMetric(metric: 'machine' | 'line' | 'both'): void {
    this.breakdownMetric = metric;
    this.breakdownRows = [...this.breakdownRows].sort((a, b) => this.metricValue(b) - this.metricValue(a));
    this.rebuildBreakdownDetail();                              // keep the dated grid in the new ranked order
    setTimeout(() => this.renderBreakdownChart(), 0);
  }

  /** Switch between showing the chart, the records grid, or both. */
  setBreakdownView(view: 'both' | 'chart' | 'grid'): void {
    this.breakdownView = view;
    if (view !== 'grid') setTimeout(() => this.renderBreakdownChart(), 0);   // (re)draw once the canvas is back
  }

  /** Caption for the chart / grid, e.g. "Machine + Line down time". */
  get breakdownMetricLabel(): string {
    return this.breakdownMetric === 'line' ? 'Line down time'
      : this.breakdownMetric === 'both' ? 'Machine + Line down time'
        : 'Machine down time';
  }

  /** Column totals for the records grid + KPI chips. */
  get breakdownMachineTotal(): number { return this.breakdownRows.reduce((s, r) => s + r.machineMin, 0); }
  get breakdownLineTotal(): number { return this.breakdownRows.reduce((s, r) => s + r.lineMin, 0); }
  get breakdownCombinedTotal(): number { return this.breakdownRows.reduce((s, r) => s + r.totalMin, 0); }

  /** Total of the currently-selected metric (denominator for the share bars). */
  get breakdownActiveTotal(): number {
    return this.breakdownMetric === 'line' ? this.breakdownLineTotal
      : this.breakdownMetric === 'both' ? this.breakdownCombinedTotal
        : this.breakdownMachineTotal;
  }

  /** Share (0-100) of a row for the active metric. */
  breakdownShare(r: { machineMin: number; lineMin: number; totalMin: number }): number {
    const tot = this.breakdownActiveTotal;
    return tot ? Math.round((this.metricValue(r) / tot) * 1000) / 10 : 0;
  }

  /** How many bars the chart caps at for the current dimension. */
  get breakdownChartCap(): number { return this.breakdownDim === 'machine' ? 15 : 20; }

  /** Bar chart of down time grouped by machine or department/line — machine / line / both, value on each bar. */
  private async renderBreakdownChart(): Promise<void> {
    if (this.breakdownView === 'grid') return;         // chart is hidden in grid-only view
    const Chart = await this.ensureChartJs();
    const canvas = document.getElementById('breakdownChartCanvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    const top = this.breakdownRows.slice(0, this.breakdownChartCap);      // keep labels readable
    const labels = top.map((m) => m.label);

    const machineDs = { label: 'Machine down time', data: top.map((m) => m.machineMin), backgroundColor: this.MACHINE_COLOR, borderWidth: 0, borderRadius: 4, maxBarThickness: 64 };
    const lineDs = { label: 'Line down time', data: top.map((m) => m.lineMin), backgroundColor: this.LINE_COLOR, borderWidth: 0, borderRadius: 4, maxBarThickness: 64 };

    const datasets = this.breakdownMetric === 'machine' ? [machineDs]
      : this.breakdownMetric === 'line' ? [lineDs]
        : [machineDs, lineDs];

    // Smooth path: if the chart already exists AND is still bound to the live
    // canvas, animate the data in place. (Switching to Grid removes the canvas
    // via *ngIf — the old chart then points at a dead canvas and must be rebuilt.)
    if (this.breakdownChart) {
      if (this.breakdownChart.canvas === canvas && canvas.isConnected) {
        this.breakdownChart.data.labels = labels;
        this.breakdownChart.data.datasets = datasets;
        this.breakdownChart.update();
        return;
      }
      this.breakdownChart.destroy();
      this.breakdownChart = null;
    }

    this.breakdownChart = new Chart(canvas.getContext('2d')!, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 22 } },                  // headroom for the value labels
        plugins: {
          legend: { display: false },                      // custom HTML legend in the card head
          tooltip: {
            callbacks: {
              // read the current dimension so the tooltip stays correct after in-place updates
              title: (items: any) => `${this.breakdownDim === 'machine' ? 'Machine' : 'Department / Line'}: ${items[0].label}`,
              label: (c: any) => `${c.dataset.label}: ${c.parsed.y} min`,
              // per-date detail: which dates this machine/line was down, and for how long
              afterBody: (items: any) => {
                const dates = this.breakdownDateMap.get(items[0].label) || [];
                if (!dates.length) return [];
                const lines = dates.slice(0, 8).map((d) =>
                  `  ${this.niceDate(d.date)}: ${this.metricValue(d)} min`);
                if (dates.length > 8) lines.push(`  +${dates.length - 8} more date(s)`);
                return ['', 'Dates:', ...lines];
              },
            }
          },
        },
        scales: this.barScales('Down time (min)', true),
      },
      plugins: [this.valueLabelPlugin()],
    });
  }

  /** Inline Chart.js plugin: draws each bar's value (minutes) just outside the bar. */
  private valueLabelPlugin(): any {
    return {
      id: 'valueLabels',
      afterDatasetsDraw: (chart: any) => {
        const ctx = chart.ctx;
        const horizontal = chart.options?.indexAxis === 'y';
        ctx.save();
        ctx.font = '600 11px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#243b4a';
        chart.data.datasets.forEach((ds: any, di: number) => {
          const meta = chart.getDatasetMeta(di);
          meta.data.forEach((el: any, i: number) => {
            const v = ds.data[i];
            if (v == null || v === 0) return;
            if (horizontal) {
              ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
              ctx.fillText(`${v}`, el.x + 6, el.y);
            } else {
              ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
              ctx.fillText(`${v}`, el.x, el.y - 4);
            }
          });
        });
        ctx.restore();
      },
    };
  }

  /** Machine-wise vertical bar chart for the selected day — red = Open, green = Closed, starts at 0. */
  private async renderMachineChart(): Promise<void> {
    const Chart = await this.ensureChartJs();
    const canvas = document.getElementById('machineChartCanvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    if (this.machineChart) { this.machineChart.destroy(); this.machineChart = null; }
    const top = this.machineRows.slice(0, 15);   // keep labels readable
    this.machineChart = new Chart(canvas.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: top.map((m) => m.machine),
        datasets: [{
          label: 'Down time (min)',
          data: top.map((m) => m.min),
          backgroundColor: top.map((m) => this.statusColor(m.status)),
          borderWidth: 0, borderRadius: 3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 22 } },               // headroom for the value labels
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c: any) => {
                const m = top[c.dataIndex];
                const st = m.status === 'Open' ? 'Open' : m.status === 'Closed' ? 'Closed' : '—';
                return `${c.parsed.y} min  (${st})`;
              }
            }
          },
        },
        scales: this.barScales('Down time (min)', true),
      },
      plugins: [this.valueLabelPlugin()],               // show the minutes on top of each bar
    });
  }

  /** Line-wise day chart: total LINE down time per department / line for the selected date. */
  private async renderLineChart(): Promise<void> {
    const Chart = await this.ensureChartJs();
    const canvas = document.getElementById('lineChartCanvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    if (this.lineChart) { this.lineChart.destroy(); this.lineChart = null; }
    const top = this.lineRows.slice(0, 15);   // keep labels readable
    this.lineChart = new Chart(canvas.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: top.map((m) => m.line),
        datasets: [{
          label: 'Line down time (min)',
          data: top.map((m) => m.min),
          backgroundColor: this.LINE_COLOR,
          borderWidth: 0, borderRadius: 4, maxBarThickness: 80,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 22 } },               // headroom for the value labels
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (it: any) => `Line: ${it[0].label}`,
              label: (c: any) => `${c.parsed.y} min`,
            }
          },
        },
        scales: this.barScales('Line down time (min)', true),
      },
      plugins: [this.valueLabelPlugin()],               // show the minutes on top of each bar
    });
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

  /** Used by the template to highlight the missing field. */
  rowNeedsStatus(row: AbstractControl): boolean { return row.hasError('statusRequired'); }
  rowNeedsRemark(row: AbstractControl): boolean { return row.hasError('remarkRequired'); }

  /** Rows that were started but are missing Status / Remark. */
  private incompleteRows(): { name: string; needStatus: boolean; needRemark: boolean }[] {
    return this.entries.controls
      .filter((r) => r.hasError('statusRequired') || r.hasError('remarkRequired'))
      .map((r) => ({
        name: r.get('machineName')?.value || 'machine',
        needStatus: r.hasError('statusRequired'),
        needRemark: r.hasError('remarkRequired'),
      }));
  }
}