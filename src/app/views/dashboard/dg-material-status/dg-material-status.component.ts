import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  DgMaterialStatusService,
  MaterialDept,
  KvaOption,
  MaterialRecord,
  SaveMaterialBatchRequest,
  MaterialTrendRow,
  CompanyOption,
  PartOption,
  EmployeeOption,
  EspEmployee,
  MaterialRowUpdatePayload,
} from './dg-material-status.service';

@Component({
  selector: 'app-dg-material-status',
  templateUrl: './dg-material-status.component.html',
  styleUrls: ['./dg-material-status.component.scss'],
  standalone: false,
  animations: [
    trigger('collapse', [
      state('open', style({ height: '*', opacity: 1, paddingTop: '*', paddingBottom: '*' })),
      state('closed', style({ height: '0', opacity: 0, paddingTop: '0', paddingBottom: '0', overflow: 'hidden' })),
      transition('open <=> closed', animate('260ms cubic-bezier(0.4, 0, 0.2, 1)')),
    ]),
  ],
})
export class DgMaterialStatusComponent implements OnInit, OnDestroy, AfterViewInit {
  form!: FormGroup;

  isFormVisible = false;   // false = View (records) page first; true = Add (entry form)
  isEditMode = false;

  departments: MaterialDept[] = [];
  kvaOptions: KvaOption[] = [];

  /** "Type of material" options — hardcoded (from the Excel sub-headers). */
  materialTypes: string[] = ['Raw', 'Consumable', 'Spares', 'Tools'];
  statusOptions: string[] = ['Open'];                     // feeding is always Open (auto-Closed via ESP feedback)
  issueTypes: string[] = ['Wrong', 'Damaged', 'Shortage'];
  shortageOptions: number[] = Array.from({ length: 100 }, (_, i) => i + 1);   // 1..100
  employees: EmployeeOption[] = [];
  /** Single-row edit: identity of the line being edited (null = adding). */
  editingRef: { mcode: string; srNo: number } | null = null;
  private partsByKva = new Map<string, PartOption[]>();   // KVA -> parts (Raw dropdown cache)

  // chart/records company picker (parent login like 33 spans 01/03/28)
  viewCompanies: CompanyOption[] = [];
  selectedCompany = '';

  reportRows: MaterialRecord[] = [];
  recordsCollapsed = false;

  isLoading = false;
  isExporting = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private service: DgMaterialStatusService,
  ) { }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.form = this.fb.group({
      date: [today, Validators.required],      // day-wise (filter + entry header)
      deptCode: [''],                           // ProfitCenter (with line)
      rows: this.fb.array([this.newRow()]),
    });

    this.loadDepartments();
    this.loadKva();

    // employees for the person-to-communicate dropdown
    this.service.getEmployees().subscribe({
      next: (res) => (this.employees = res || []),
      error: () => (this.employees = []),
    });

    // companies for the picker (parent login -> children; else just self)
    this.service.getViewCompanies().subscribe({
      next: (res) => {
        this.viewCompanies = res || [];
        this.selectedCompany = this.viewCompanies.length ? this.viewCompanies[0].companyCode : this.service.companyCode;
        this.chartCompany = this.selectedCompany;
        this.onChartCompanyChange();   // re-filter the charts once the picker resolves
      },
      error: () => { this.viewCompanies = []; this.selectedCompany = this.service.companyCode; },
    });

    this.resolveBreakdownRange();
    this.searchReport();          // View page shown first (analytics loads on expand)
  }

  /* ---------------- form rows ---------------- */
  get rows(): FormArray {
    return this.form.get('rows') as FormArray;
  }

  private newRow(): FormGroup {
    return this.fb.group({
      deptCode: ['', Validators.required],                   // department per ROW
      plan: ['', Validators.required],                       // KVA
      planQuantity: [null, [Validators.required, Validators.min(0)]],
      materialType: ['Raw', Validators.required],            // hardcoded dropdown
      partCode: [''],                                        // Raw: selected Part.PartCode
      partName: [''],                                        // Raw: name snapshot; else free text / blank
      shortageQty: [0],                                      // 0 = none; 1..100
      issueType: [''],                                        // Wrong / Damaged / Shortage
      status: ['Open', Validators.required],                 // Open / Closed / InProcess
      remark: [''],
      person: [''],                                          // person to communicate (employee)
    });
  }

  addRow(): void {
    if (this.rows.invalid) {
      this.rows.markAllAsTouched();
      this.errorMessage = 'Complete the current row(s) before adding another.';
      return;
    }
    this.clearMessages();
    this.rows.push(this.newRow());
  }

  removeRow(i: number): void {
    if (this.rows.length > 1) {
      this.rows.removeAt(i);
    } else {
      this.rows.at(0).reset({ deptCode: '', plan: '', planQuantity: null, materialType: 'Raw', partCode: '', partName: '', shortageQty: 0, issueType: '', status: 'Open', remark: '', person: '' });
    }
  }

  /* ---------------- Raw part dropdown + company picker ---------------- */

  /** Edit mode: update the single line in place, then return to records. */
  private saveSingleEdit(): void {
    const g = this.rows.at(0);
    if (g.invalid) { g.markAllAsTouched(); this.errorMessage = 'Fill the required fields.'; return; }
    const v = g.getRawValue();
    const p: MaterialRowUpdatePayload = {
      mcode: this.editingRef!.mcode, srNo: this.editingRef!.srNo,
      plan: v.plan, planQuantity: Number(v.planQuantity), materialType: v.materialType,
      partCode: v.materialType === 'Raw'
        ? (this.partsFor(v.plan).find((x) => x.partName === v.partName)?.partCode || v.partCode || '')
        : '',
      partName: v.partName || '',
      shortageQty: Number(v.shortageQty) || 0,
      issueType: v.issueType || '',
      status: v.status || 'Open',
      remark: v.remark || '', person: v.person || '',
    };
    this.isLoading = true;
    this.service.updateRow(p).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Record updated.';
        this.editingRef = null;
        this.isFormVisible = false;
        this.isEditMode = false;
        this.lockHeader(false);
        this.searchReport();
      },
      error: (err) => { this.isLoading = false; console.error(err); this.errorMessage = 'Update failed. Please try again.'; },
    });
  }

  /* ---------------- searchable dropdown (KVA / Part / Responsible person) ---------------- */
  ddRow = -1;
  ddField: 'plan' | 'partName' | 'person' | '' = '';
  ddPos = { left: 0, top: 0, width: 0 };
  private ddCap = 100;                                   // max options rendered at once
  private ddCache = { key: '', list: [] as string[], total: 0 };

  /** Open the panel under the focused input (fixed-positioned, so table scroll can't clip it). */
  sddShow(i: number, field: 'plan' | 'partName' | 'person', ev: Event): void {
    const el = ev.target as HTMLElement;
    const r = el.getBoundingClientRect();
    this.ddPos = { left: r.left, top: r.bottom + 2, width: Math.max(r.width, field === 'plan' ? 140 : 320) };
    this.ddRow = i;
    this.ddField = field;
    if (field === 'partName') this.ensureParts(this.rows.at(i).get('plan')?.value);
  }

  sddClose(): void {
    setTimeout(() => { this.ddRow = -1; this.ddField = ''; }, 150);
  }

  /** Filter once per real change (not on every change-detection pass). */
  private sddCompute(i: number): void {
    if (i < 0 || !this.ddField) { this.ddCache = { key: '', list: [], total: 0 }; return; }
    const g = this.rows.at(i);
    const q = ((g.get(this.ddField)?.value) || '').toString().trim().toLowerCase();
    let src: string[] = [];
    if (this.ddField === 'plan') src = this.kvaOptions.map((k) => String(k.kva));
    else if (this.ddField === 'partName') src = this.partsFor(g.get('plan')?.value).map((p) => p.partName);
    else src = this.employees.map((e) => e.empName);
    const key = `${i}|${this.ddField}|${q}|${src.length}`;
    if (this.ddCache.key === key) return;
    const f = q ? src.filter((v) => v.toLowerCase().includes(q)) : src;
    this.ddCache = { key, list: f.slice(0, this.ddCap), total: f.length };
  }

  /** Options for the open panel, filtered by what's typed in the input. */
  sddList(i: number): string[] {
    this.sddCompute(i);
    return this.ddCache.list;
  }

  /** How many matched in total (the panel renders at most ddCap of them). */
  sddTotal(i: number): number {
    this.sddCompute(i);
    return this.ddCache.total;
  }

  sddPick(i: number, val: string): void {
    const g = this.rows.at(i);
    const field = this.ddField;
    g.get(field)?.setValue(val);
    this.ddRow = -1; this.ddField = '';
    if (field === 'plan') this.onRowPlanChange(i);
  }

  /** Compact label for the part dropdown options (full name is still saved). */
  partLabel(name: string): string {
    const n = name || '';
    return n.length > 48 ? n.slice(0, 45) + '…' : n;
  }

  /** Cached parts for a Plan (KVA) — the row's Raw part dropdown reads this. */
  partsFor(plan: any): PartOption[] {
    return this.partsByKva.get(String(plan ?? '')) || [];
  }

  /** Fetch parts for a KVA once and cache them. */
  private ensureParts(kva: any): void {
    const k = String(kva ?? '').trim();
    if (!k || this.partsByKva.has(k)) return;
    this.partsByKva.set(k, []);   // placeholder so we don't double-fetch
    this.service.getPartsByKva(k).subscribe({
      next: (res) => this.partsByKva.set(k, res || []),
      error: () => this.partsByKva.set(k, []),
    });
  }

  /** Row's Plan (KVA) changed — load its parts if the row is Raw, and clear a stale part. */
  onRowPlanChange(i: number): void {
    const g = this.rows.at(i);
    g.get('partCode')?.setValue('');
    g.get('partName')?.setValue('');
    if (g.get('materialType')?.value === 'Raw') this.ensureParts(g.get('plan')?.value);
  }

  /** Row's Type changed — Raw needs the part list; switching away keeps free text. */
  onRowTypeChange(i: number): void {
    const g = this.rows.at(i);
    g.get('partCode')?.setValue('');
    g.get('partName')?.setValue('');
    if (g.get('materialType')?.value === 'Raw') this.ensureParts(g.get('plan')?.value);
  }

  /** Show the picker only when the login spans more than one company (e.g. 33). */
  get showCompanyPicker(): boolean {
    return this.viewCompanies.length > 1;
  }

  /** Name of the picked company (falls back to the login company name). */
  get chartCompanyName(): string {
    const c = this.viewCompanies.find((x) => x.companyCode === this.selectedCompany);
    return c ? c.companyName : this.service.companyName;
  }

  /** Records shown in the grid — narrowed to the picked company. */
  get filteredRecords(): MaterialRecord[] {
    if (!this.showCompanyPicker || !this.selectedCompany) return this.reportRows;
    return this.reportRows.filter((r) => (r.companyCode || (r.deptCode || '').slice(0, 2)) === this.selectedCompany);
  }

  /** Departments offered in the filters — narrowed to the picked company (PCCode prefix). */
  get filteredDepartments(): MaterialDept[] {
    if (!this.showCompanyPicker || !this.selectedCompany) return this.departments;
    return this.departments.filter((d) => (d.deptCode || '').slice(0, 2) === this.selectedCompany);
  }

  /** Company changed from the Records toolbar — drop a mismatched department filter. */
  onRecordsCompanyChange(): void {
    const dept = this.form.get('deptCode')?.value as string;
    if (dept && dept.slice(0, 2) !== this.selectedCompany) {
      this.form.get('deptCode')?.setValue('');
    }
    // per-row departments too: drop any that belong to a different company
    this.rows.controls.forEach((g) => {
      const d = (g.get('deptCode')?.value || '') as string;
      if (d && d.slice(0, 2) !== this.selectedCompany) g.get('deptCode')?.setValue('');
    });
  }

  /* ================= ESP (raise a Corporate Requisition for a shortage) ================= */
  espOpen = false;
  espSending = false;
  espRecord: MaterialRecord | null = null;
  espEmployees: EspEmployee[] = [];
  espToEmp = '';
  espPriority = 'High Priority';
  espError = '';                          // shown INSIDE the modal (it lives in <body>)
  espTargetDate = '';                    // "yyyy-MM-dd" — selected by the user
  espMinTargetDate = '';                 // today — lower bound of the picker
  espMsg = '';
  espPriorities = ['High Priority', 'Medium Priority', 'Low Priority'];

  @ViewChild('espOverlayEl') private espOverlayEl?: ElementRef<HTMLElement>;

  /** Move the ESP modal to <body> so no sidebar z-index or transformed ancestor can cover/trap it. */
  ngAfterViewInit(): void {
    const el = this.espOverlayEl?.nativeElement;
    if (el && el.parentElement !== document.body) document.body.appendChild(el);
  }

  /** Today as "yyyy-MM-dd" (local) — lower bound for the Target Date picker. */
  private isoToday(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** ESP button — opens the modal pre-worded for this shortage line. */
  openEsp(r: MaterialRecord): void {
    this.clearMessages();
    if (r.espReqCode) {
      this.errorMessage = `ESP already sent for this line (${r.espReqCode}).`;
      return;
    }
    if (!r.shortageQty || r.shortageQty <= 0) {
      this.errorMessage = 'ESP can be raised only for lines with a shortage.';
      return;
    }
    this.espRecord = r;
    this.espPriority = 'High Priority';
    this.espMinTargetDate = this.isoToday() + 'T00:00';   // datetime-local lower bound
    this.espTargetDate = '';
    const what = r.partName ? `${r.partName}` : `${r.materialType} material`;
    this.espMsg = r.shortageQty > 0
      ? `Material shortage at ${r.deptName} on ${this.niceDate(r.date)}: ` +
        `${r.shortageQty} Nos short — ${what} (Plan ${r.plan} KVA, ${r.materialType}). ` +
        `Current status: ${r.status || 'Open'}. Kindly arrange / issue the material at the earliest.`
      : `Material requirement at ${r.deptName} on ${this.niceDate(r.date)}: ` +
        `${what} (Plan ${r.plan} KVA, ${r.materialType}, Plan Qty ${r.planQuantity}). ` +
        `Kindly arrange / issue the material at the earliest.`;
    // the ESP goes to the row's Responsible person (fixed — no dropdown)
    const m = (r.person || '').match(/\[\s*([^\]]+?)\s*\]/);
    this.espToEmp = m ? m[1].trim() : '';
    if (!this.espToEmp) {
      this.errorMessage = 'Set the Responsible person for this line first.';
      return;
    }
    this.espError = '';
    if (this.espEmployees.length && this.espToEmp && !this.espEmployees.some((e) => e.eCode === this.espToEmp)) {
      this.espError = 'This person is not in the ESP (Corporate Requisition) employee list, so their PC code cannot be resolved. Set a listed employee as the Responsible person for this line.';
    }
    this.espOpen = true;
    if (!this.espEmployees.length) {
      this.service.getEspEmployees().subscribe({
        next: (res) => {
          this.espEmployees = res || [];
          if (this.espToEmp && !this.espEmployees.some((e) => e.eCode === this.espToEmp)) {
            this.espError = 'This person is not in the ESP (Corporate Requisition) employee list, so their PC code cannot be resolved. Set a listed employee as the Responsible person for this line.';
          }
        },
        error: () => (this.errorMessage = 'Could not load the ESP employee list.'),
      });
    }
  }

  closeEsp(): void { this.espOpen = false; this.espRecord = null; this.espError = ''; }

  sendEsp(): void {
    if (!this.espRecord) return;
    this.espError = '';
    if (!this.espToEmp) { this.espError = 'This line has no Responsible person.'; return; }
    if (!this.espTargetDate) { this.espError = 'Select the target date & time.'; return; }
    if (!this.espMsg.trim()) { this.espError = 'The request message cannot be empty.'; return; }
    const emp = this.espEmployees.find((e) => e.eCode === this.espToEmp);
    if (!emp) { this.espError = 'This person is not in the ESP employee list — PC code cannot be resolved.'; return; }
    this.espSending = true;
    this.service.raiseEsp({
      empCode: this.service.sessionUser,
      fromPCCode: this.espRecord.deptCode,
      toEmpCode: emp.eCode,
      toPCCode: emp.pcCode,
      priority: this.espPriority,
      reqMsg: this.espMsg.trim(),
      companyCode: this.service.companyCode,
      targetDate: this.espTargetDate,
      mcode: this.espRecord.mcode,
      srNo: this.espRecord.srNo,
    }).subscribe({
      next: (res: any) => {
        this.espSending = false;
        const reqNo = res?.message ? ` (${res.message})` : '';
        if (this.espRecord && res?.message) this.espRecord.espReqCode = res.message;
        this.successMessage = `ESP raised to ${emp.fullName}${reqNo} for the ${this.espRecord?.partName || this.espRecord?.materialType} shortage.`;
        this.closeEsp();
      },
      error: (err) => {
        this.espSending = false;
        console.error('ESP raise failed:', err);
        this.espError = 'Failed to raise the ESP. Please try again.';
      },
    });
  }

  /* ================= SHORTAGE ANALYTICS (charts) ================= */
  analyticsCollapsed = true;    // hidden at first — loads on expand
  chartLoading = false;
  chartCompany = '';               // charts' own company (independent of the Records filter)
  breakdownDim: 'department' | 'person' | 'part' | 'kva' | 'type' = 'department';
  breakdownIssue: 'all' | 'Wrong' | 'Damaged' | 'Shortage' = 'all';   // issue-type filter for the charts
  breakdownPeriod: 'weekly' | 'monthly' | 'custom' = 'monthly';
  breakdownView: 'both' | 'chart' | 'grid' = 'both';
  breakdownFrom = '';
  breakdownTo = '';
  breakdownRows: { label: string; short: number; open: number }[] = [];
  breakdownDetailRows: { kind: 'single' | 'head' | 'sub'; label: string; date: string; days: number; reason: string; issue: string; short: number }[] = [];
  private breakdownDateMap = new Map<string, { date: string; reason: string; issue: string; short: number }[]>();
  shortageReport: MaterialTrendRow[] = [];      // flat "where is shortage" list for the period
  private breakdownChart: any = null;
  private chartLib?: any;               // our Chart.js v4 (the app ships v2 globally)

  ngOnDestroy(): void {
    if (this.breakdownChart) { this.breakdownChart.destroy(); this.breakdownChart = null; }
    const el = this.espOverlayEl?.nativeElement;
    if (el && el.parentElement === document.body) document.body.removeChild(el);
  }

  toggleAnalytics(): void {
    this.analyticsCollapsed = !this.analyticsCollapsed;
    if (!this.analyticsCollapsed) setTimeout(() => this.loadAnalytics(), 0);
    else if (this.breakdownChart) { this.breakdownChart.destroy(); this.breakdownChart = null; }
  }

  loadAnalytics(): void {
    if (!this.breakdownFrom || !this.breakdownTo) this.resolveBreakdownRange();
    this.loadBreakdown();
  }

  /** Charts' company changed — reload them (if the panel is open). */
  onChartCompanyChange(): void {
    if (!this.analyticsCollapsed) this.loadBreakdown();
  }

  /** Name of the charts' picked company (independent of the Records filter). */
  get chartsCompanyName(): string {
    const c = this.viewCompanies.find((x) => x.companyCode === this.chartCompany);
    return c ? c.companyName : this.service.companyName;
  }

  private fmtDate(d: Date): string { return d.toISOString().slice(0, 10); }

  resolveBreakdownRange(): void {
    const today = new Date();
    if (this.breakdownPeriod === 'weekly') {
      const from = new Date(today); from.setDate(today.getDate() - 6);
      this.breakdownFrom = this.fmtDate(from); this.breakdownTo = this.fmtDate(today);
    } else if (this.breakdownPeriod === 'monthly') {
      const from = new Date(today); from.setDate(today.getDate() - 29);
      this.breakdownFrom = this.fmtDate(from); this.breakdownTo = this.fmtDate(today);
    }
    // custom keeps whatever the user typed
  }

  /** Issue-type filter — narrows every chart/grid to Wrong / Damaged / Shortage (or all). */
  setBreakdownIssue(v: 'all' | 'Wrong' | 'Damaged' | 'Shortage'): void {
    this.breakdownIssue = v;
    this.loadBreakdown();
  }

  /** "All issue types" / "Damaged" … — used in titles and exports. */
  get issueLabel(): string {
    return this.breakdownIssue === 'all' ? 'All issue types' : this.breakdownIssue;
  }

  setBreakdownDim(dim: 'department' | 'person' | 'part' | 'kva' | 'type'): void {
    this.breakdownDim = dim;
    this.loadBreakdown();
  }
  setBreakdownPeriod(period: 'weekly' | 'monthly'): void {
    this.breakdownPeriod = period;
    this.resolveBreakdownRange();
    this.loadBreakdown();
  }
  applyCustomRange(): void {
    if (!this.breakdownFrom || !this.breakdownTo) return;
    this.breakdownPeriod = 'custom';
    this.loadBreakdown();
  }
  setBreakdownView(view: 'both' | 'chart' | 'grid'): void {
    this.breakdownView = view;
    if (view !== 'grid') setTimeout(() => this.renderBreakdownChart(), 0);
  }

  get breakdownPeriodLabel(): string {
    return `${this.niceDate(this.breakdownFrom)} → ${this.niceDate(this.breakdownTo)}`;
  }
  get dimLabel(): string {
    return this.breakdownDim === 'department' ? 'Department'
      : this.breakdownDim === 'person' ? 'Person'
        : this.breakdownDim === 'part' ? 'Part'
          : this.breakdownDim === 'kva' ? 'KVA' : 'Material type';
  }
  get breakdownShortTotal(): number { return this.breakdownRows.reduce((t, r) => t + r.short, 0); }
  get breakdownOpenTotal(): number { return this.breakdownRows.reduce((t, r) => t + r.open, 0); }
  breakdownShare(r: { short: number }): number {
    const tot = this.breakdownShortTotal;
    return tot ? Math.round((r.short / tot) * 1000) / 10 : 0;
  }
  breakdownRankOf(label: string): number {
    return this.breakdownRows.findIndex((r) => r.label === label) + 1;
  }

  private async ensureExcelJs(): Promise<any> {
    if (!(window as any).ExcelJS) {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
    }
    return (window as any).ExcelJS;
  }

  /** Breakdown (dated) grid -> Excel: same rows as on screen, with Reason. */
  async exportBreakdownExcel(): Promise<void> {
    if (this.isExporting || !this.breakdownDetailRows.length) return;
    this.isExporting = true;
    try {
      const ExcelJS = await this.ensureExcelJs();
      if (!ExcelJS) { this.errorMessage = 'Excel library failed to load.'; return; }
      const TEAL = 'FF0F6C8D';
      const thin = { style: 'thin', color: { argb: 'FFB0B0B0' } };
      const B = { top: thin, left: thin, bottom: thin, right: thin };
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Shortage breakdown');
      ws.columns = [{ width: 5 }, { width: 30 }, { width: 13 }, { width: 40 }, { width: 11 }, { width: 15 }, { width: 9 }];
      ws.mergeCells('A1:G1');
      const t1 = ws.getCell('A1');
      t1.value = {
        richText: [
          { text: this.chartsCompanyName + '\n', font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } } },
          { text: `Material shortage by ${this.dimLabel.toLowerCase()}  ·  ${this.issueLabel}        ${this.breakdownPeriodLabel}`, font: { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } } },
        ],
      };
      t1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;
      t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
      ws.getRow(1).height = 36;
      const headers = ['#', this.dimLabel, 'Date', 'Reason', 'Issue', 'Shortage (Nos.)', 'Share'];
      headers.forEach((h, i) => {
        const c = ws.getCell(2, i + 1);
        c.value = h;
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;
        c.border = B;
      });
      let rowNum = 3;
      const write = (vals: any[], kind: string) => {
        ws.getRow(rowNum).values = vals;
        for (let c = 1; c <= 7; c++) {
          const cell = ws.getRow(rowNum).getCell(c);
          cell.border = B;
          cell.alignment = { horizontal: c === 1 || c === 3 || c === 5 ? 'center' : c >= 6 ? 'right' : 'left', vertical: 'middle', wrapText: c === 4 };
          if (kind === 'total') { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF2F6' } }; }
          else if (kind === 'head') { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F6F9' } }; }
          else if (kind === 'single') { cell.font = { bold: true }; }
          else { cell.font = { color: { argb: 'FF5A6973' }, size: 10 }; }
        }
        rowNum++;
      };
      for (const r of this.breakdownDetailRows) {
        write([
          r.kind !== 'sub' ? this.breakdownRankOf(r.label) : '',
          r.kind !== 'sub' ? r.label : '',
          r.kind === 'head' ? '' : this.niceDate(r.date),
          r.kind === 'head' ? '' : (r.reason || ''),
          r.kind === 'head' ? '' : (r.issue || ''),
          r.short,
          this.breakdownShare(r).toFixed(1) + '%',
        ], r.kind);
      }
      write(['', 'Total', '', '', '', this.breakdownShortTotal, '100%'], 'total');
      const buf = await wb.xlsx.writeBuffer();
      this.downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Material_shortage_breakdown.xlsx');
    } catch (e) {
      console.error('Breakdown Excel export failed:', e);
      this.errorMessage = 'Failed to generate the breakdown Excel.';
    } finally { this.isExporting = false; }
  }

  /** "Where is shortage" flat report -> Excel. */
  async exportShortageExcel(): Promise<void> {
    if (this.isExporting || !this.shortageReport.length) return;
    this.isExporting = true;
    try {
      const ExcelJS = await this.ensureExcelJs();
      if (!ExcelJS) { this.errorMessage = 'Excel library failed to load.'; return; }
      const TEAL = 'FF0F6C8D';
      const thin = { style: 'thin', color: { argb: 'FFB0B0B0' } };
      const B = { top: thin, left: thin, bottom: thin, right: thin };
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Shortage report');
      ws.columns = [{ width: 4 }, { width: 12 }, { width: 22 }, { width: 9 }, { width: 11 }, { width: 38 }, { width: 11 }, { width: 9 }, { width: 9 }, { width: 24 }];
      ws.mergeCells('A1:J1');
      const t1 = ws.getCell('A1');
      t1.value = {
        richText: [
          { text: this.chartsCompanyName + '\n', font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } } },
          { text: `Where is shortage  ·  ${this.issueLabel}        ${this.breakdownPeriodLabel}`, font: { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } } },
        ],
      };
      t1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;
      t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
      ws.getRow(1).height = 36;
      const headers = ['#', 'Date', 'Department', 'Plan (KVA)', 'Type', 'Part', 'Issue', 'Shortage', 'Status', 'Responsible person'];
      headers.forEach((h, i) => {
        const c = ws.getCell(2, i + 1);
        c.value = h;
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;
        c.border = B;
      });
      let rowNum = 3;
      for (const r of this.shortageReport) {
        ws.getRow(rowNum).values = [
          rowNum - 2, this.niceDate(r.date), r.deptName, r.plan, r.materialType,
          r.partName || '', r.issueType || '', r.shortageQty, r.status || '', r.person || '',
        ];
        for (let c = 1; c <= 10; c++) {
          const cell = ws.getRow(rowNum).getCell(c);
          cell.border = B;
          cell.alignment = { horizontal: c === 1 || c === 2 || c === 7 ? 'center' : 'left', vertical: 'middle', wrapText: c === 6 };
        }
        rowNum++;
      }
      const buf = await wb.xlsx.writeBuffer();
      this.downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Material_shortage_report.xlsx');
    } catch (e) {
      console.error('Shortage Excel export failed:', e);
      this.errorMessage = 'Failed to generate the shortage Excel.';
    } finally { this.isExporting = false; }
  }

  /** Load + aggregate shortage by the chosen dimension for the resolved window. */
  loadBreakdown(): void {
    if (!this.breakdownFrom || !this.breakdownTo) this.resolveBreakdownRange();
    this.chartLoading = true;
    this.service.getTrend(this.breakdownFrom, this.breakdownTo).subscribe({
      next: (rawRows) => {
        this.chartLoading = false;
        const byCompany = (this.showCompanyPicker && this.chartCompany)
          ? (rawRows || []).filter((r) => (r.companyCode || '') === this.chartCompany)
          : (rawRows || []);
        // issue-type filter: Wrong / Damaged / Shortage (or everything)
        const rows = this.breakdownIssue === 'all'
          ? byCompany
          : byCompany.filter((r) => (r.issueType || '') === this.breakdownIssue);

        // flat "where is shortage" report: every dated line with a shortage
        this.shortageReport = rows
          .filter((r) => (r.shortageQty || 0) > 0)
          .sort((a, b) => b.date.localeCompare(a.date));

        const keyOf = (r: MaterialTrendRow) =>
          (this.breakdownDim === 'department' ? r.deptName
            : this.breakdownDim === 'person' ? r.person
              : this.breakdownDim === 'part' ? r.partName
                : this.breakdownDim === 'kva' ? (r.plan ? 'KVA ' + r.plan : '')
                  : r.materialType) || '—';

        const map = new Map<string, { short: number; open: number }>();
        const dateMap = new Map<string, Map<string, { short: number; reasons: Set<string>; issues: Set<string> }>>();
        for (const r of rows) {
          const q = r.shortageQty || 0;
          if (q <= 0) continue;
          const key = keyOf(r);
          const cur = map.get(key) || { short: 0, open: 0 };
          cur.short += q;
          if ((r.status || '') === 'Open') cur.open += q;
          map.set(key, cur);
          let byDate = dateMap.get(key);
          if (!byDate) { byDate = new Map(); dateMap.set(key, byDate); }
          const cell = byDate.get(r.date) || { short: 0, reasons: new Set<string>(), issues: new Set<string>() };
          cell.short += q;
          if ((r.remark || '').trim()) cell.reasons.add(r.remark.trim());
          if ((r.issueType || '').trim()) cell.issues.add(r.issueType.trim());
          byDate.set(r.date, cell);
        }
        this.breakdownRows = Array.from(map.entries())
          .map(([label, v]) => ({ label, short: v.short, open: v.open }))
          .sort((a, b) => b.short - a.short);
        this.rebuildBreakdownDetail(dateMap);
        setTimeout(() => this.renderBreakdownChart(), 0);
      },
      error: () => { this.chartLoading = false; },
    });
  }

  /** Flatten the per-date map into tidy grid rows (single / head + sub). */
  private rebuildBreakdownDetail(dateMap: Map<string, Map<string, { short: number; reasons: Set<string>; issues: Set<string> }>>): void {
    this.breakdownDateMap = new Map(
      Array.from(dateMap.entries()).map(([label, byDate]) => [
        label,
        Array.from(byDate.entries())
          .map(([date, v]) => ({ date, short: v.short, reason: Array.from(v.reasons).join(' | '), issue: Array.from(v.issues).join(' | ') }))
          .filter((d) => d.short > 0)
          .sort((a, b) => a.date.localeCompare(b.date)),
      ]),
    );
    const detail: typeof this.breakdownDetailRows = [];
    for (const agg of this.breakdownRows) {
      const dates = this.breakdownDateMap.get(agg.label) || [];
      if (!dates.length) continue;
      if (dates.length === 1) {
        detail.push({ kind: 'single', label: agg.label, date: dates[0].date, days: 1, reason: dates[0].reason, issue: dates[0].issue, short: dates[0].short });
      } else {
        detail.push({ kind: 'head', label: agg.label, date: '', days: dates.length, reason: '', issue: '', short: agg.short });
        for (const d of dates) detail.push({ kind: 'sub', label: agg.label, date: d.date, days: 0, reason: d.reason, issue: d.issue, short: d.short });
      }
    }
    this.breakdownDetailRows = detail;
  }

  /** Our own Chart.js v4.
   *  The app already exposes Chart.js **v2** globally (ng2-charts/CoreUI). Rendering with it
   *  silently ignores every v3/v4 option we set — axes auto-scale (not starting at 0), legends
   *  show and custom tooltips never apply. So: load v4 for this page, keep it privately, and
   *  hand the global back to the app. */
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

  /** Hard refresh: destroy the chart and reload the panel (for the odd blank chart). */
  refreshCharts(): void {
    if (this.breakdownChart) { this.breakdownChart.destroy(); this.breakdownChart = null; }
    this.chartLib = undefined;
    this.loadBreakdown();
  }

  /** Bar chart of shortage by the chosen dimension (smooth in-place updates). */
  private async renderBreakdownChart(): Promise<void> {
    if (this.breakdownView === 'grid') return;
    const Chart = await this.ensureChartJs();
    const canvas = document.getElementById('materialBreakdownCanvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    const top = this.breakdownRows.slice(0, 15);
    const labels = top.map((m) => this.partLabel(m.label));
    const dataset = { label: 'Shortage (Nos.)', data: top.map((m) => m.short), backgroundColor: '#0f6c8d', borderWidth: 0, borderRadius: 3 };

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
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items: any) => `${this.dimLabel}: ${items[0].label}`,
              label: (c: any) => `${c.parsed.y} short`,
              afterBody: (items: any) => {
                const full = this.breakdownRows[items[0].dataIndex]?.label || items[0].label;
                const dates = this.breakdownDateMap.get(full) || [];
                if (!dates.length) return [];
                const lines = dates.slice(0, 8).map((d) => `  ${this.niceDate(d.date)}: ${d.short} short`);
                if (dates.length > 8) lines.push(`  +${dates.length - 8} more date(s)`);
                return ['', 'Dates:', ...lines];
              },
            },
          },
        },
        scales: {
          x: { ticks: { maxRotation: 55, minRotation: 0, autoSkip: false }, grid: { display: false } },
          y: { beginAtZero: true, min: 0, title: { display: true, text: 'Shortage (Nos.)' } },
        },
      },
    });
  }

  /** Breakdown PDF — mirrors the View selection (chart / grid / both). */
  async exportBreakdownPdf(): Promise<void> {
    if (this.isExporting) return;
    if (!this.breakdownRows.length) { this.errorMessage = 'No shortage data to export.'; return; }
    this.isExporting = true;
    try {
      if (!(window as any).jspdf) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }
      const jsPDF = (window as any).jspdf?.jsPDF;
      if (!jsPDF) { this.errorMessage = 'PDF library failed to load.'; return; }
      if (!jsPDF.API || !jsPDF.API.autoTable) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
      }
      const pdfSafe = (t: string) => (t || '').replace(/\u2192/g, ' to ').replace(/[^\x00-\xFF]/g, '');
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(15, 108, 141);
      doc.text(pdfSafe(this.chartsCompanyName), pageW / 2, 14, { align: 'center' });
      doc.setFontSize(11); doc.setTextColor(40, 40, 40);
      doc.text(pdfSafe(`Material shortage by ${this.dimLabel.toLowerCase()}  ·  ${this.issueLabel}  ·  ` + this.breakdownPeriodLabel), pageW / 2, 21, { align: 'center' });

      let startY = 26;
      if (this.breakdownView !== 'grid') {
        const src = document.getElementById('materialBreakdownCanvas') as HTMLCanvasElement | null;
        if (src && src.width) {
          const tmp = document.createElement('canvas');
          tmp.width = src.width; tmp.height = src.height;
          const tctx = tmp.getContext('2d')!;
          tctx.fillStyle = '#ffffff'; tctx.fillRect(0, 0, tmp.width, tmp.height);
          tctx.drawImage(src, 0, 0);
          const imgW = pageW - 28;
          const imgH = Math.min(imgW * (src.height / src.width), this.breakdownView === 'chart' ? 150 : 95);
          doc.addImage(tmp.toDataURL('image/png'), 'PNG', 14, startY, imgW, imgH);
          startY += imgH + 6;
        }
      }
      if (this.breakdownView !== 'chart') {
        const kinds: string[] = [];
        const body: any[] = this.breakdownDetailRows.map((r) => {
          kinds.push(r.kind);
          return [
            r.kind !== 'sub' ? this.breakdownRankOf(r.label) : '',
            r.kind !== 'sub' ? pdfSafe(r.label) : '',
            r.kind === 'head' ? '' : this.niceDate(r.date),
            r.kind === 'head' ? '' : pdfSafe(r.reason || ''),
            r.kind === 'head' ? '' : pdfSafe(r.issue || ''),
            r.short,
            this.breakdownShare(r).toFixed(1) + '%',
          ];
        });
        kinds.push('total');
        body.push(['', 'Total', '', '', '', this.breakdownShortTotal, '100%']);
        (doc as any).autoTable({
          head: [['#', this.dimLabel, 'Date', 'Reason', 'Issue', 'Shortage (Nos.)', 'Share']],
          body, startY, theme: 'grid',
          styles: { fontSize: 8, cellPadding: 1.6, valign: 'middle' },
          headStyles: { fillColor: [15, 108, 141], textColor: 255, halign: 'center' },
          columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'left' }, 2: { halign: 'center', cellWidth: 24 }, 3: { halign: 'left', cellWidth: 56 }, 4: { halign: 'center', cellWidth: 22 }, 5: { halign: 'right' }, 6: { halign: 'right' } },
          didParseCell: (d: any) => {
            const k = kinds[d.row.index];
            if (k === 'total') { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [235, 242, 246]; }
            else if (k === 'head' || k === 'single') { d.cell.styles.fontStyle = 'bold'; if (k === 'head') d.cell.styles.fillColor = [240, 246, 249]; }
            else { d.cell.styles.textColor = [90, 105, 115]; }
          },
        });
      }
      doc.save('Material_shortage_breakdown.pdf');
    } catch (e) {
      console.error('Breakdown PDF export failed:', e);
      this.errorMessage = 'Failed to generate the breakdown PDF.';
    } finally { this.isExporting = false; }
  }

  /** "Where is shortage" flat report -> PDF. */
  async exportShortagePdf(): Promise<void> {
    if (this.isExporting || !this.shortageReport.length) return;
    this.isExporting = true;
    try {
      if (!(window as any).jspdf) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }
      const jsPDF = (window as any).jspdf?.jsPDF;
      if (!jsPDF) { this.errorMessage = 'PDF library failed to load.'; return; }
      if (!jsPDF.API || !jsPDF.API.autoTable) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
      }
      const pdfSafe = (t: string) => (t || '').replace(/\u2192/g, ' to ').replace(/[^\x00-\xFF]/g, '');
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(15, 108, 141);
      doc.text(pdfSafe(this.chartsCompanyName), pageW / 2, 14, { align: 'center' });
      doc.setFontSize(11); doc.setTextColor(40, 40, 40);
      doc.text(pdfSafe(`Shortage report  ·  ${this.issueLabel}  ·  ` + this.breakdownPeriodLabel), pageW / 2, 21, { align: 'center' });
      const body = this.shortageReport.map((r, i) => [
        i + 1, this.niceDate(r.date), pdfSafe(r.deptName), r.plan, pdfSafe(r.materialType),
        pdfSafe(r.partName || '-'), pdfSafe(r.issueType || '-'), r.shortageQty, pdfSafe(r.status || '-'), pdfSafe(r.person || '-'),
      ]);
      (doc as any).autoTable({
        head: [['#', 'Date', 'Department', 'Plan (KVA)', 'Type', 'Part', 'Issue', 'Shortage', 'Status', 'Responsible person']],
        body, startY: 26, theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.5, valign: 'middle' },
        headStyles: { fillColor: [15, 108, 141], textColor: 255, halign: 'center' },
        columnStyles: { 0: { halign: 'center', cellWidth: 8 }, 6: { halign: 'center' }, 7: { halign: 'right' } },
      });
      doc.save('Material_shortage_report.pdf');
    } catch (e) {
      console.error('Shortage PDF export failed:', e);
      this.errorMessage = 'Failed to generate the shortage PDF.';
    } finally { this.isExporting = false; }
  }

  /* ---------------- view <-> add ---------------- */
  showForm(): void {
    this.editingRef = null;
    this.isFormVisible = true;
    this.isEditMode = false;
    this.lockHeader(false);
    this.rows.clear();
    this.rows.push(this.newRow());
    this.form.patchValue({ deptCode: '' });
    this.clearMessages();
  }

  showList(): void {
    this.editingRef = null;
    this.isFormVisible = false;
    this.isEditMode = false;
    this.lockHeader(false);
    this.clearMessages();
    this.searchReport();
  }

  /** Open the Add form in edit mode, pre-loaded with that day + department's saved rows. */
  editRecord(r: MaterialRecord): void {
    this.clearMessages();
    if (r.espReqCode) {
      this.errorMessage = `ESP already sent (${r.espReqCode}) — this line is locked.`;
      return;
    }
    this.editingRef = { mcode: r.mcode, srNo: r.srNo };
    this.isFormVisible = true;
    this.isEditMode = true;
    this.form.patchValue({ date: r.date });
    while (this.rows.length) this.rows.removeAt(0);
    this.rows.push(this.fb.group({
      deptCode: [{ value: r.deptCode, disabled: true }],          // a line cannot move departments
      plan: [r.plan, Validators.required],
      planQuantity: [r.planQuantity, [Validators.required, Validators.min(0)]],
      materialType: [r.materialType || 'Raw', Validators.required],
      partCode: [r.partCode || ''],
      partName: [r.partName || ''],
      shortageQty: [r.shortageQty || 0],
      issueType: [r.issueType || ''],
      status: ['Open', Validators.required],
      remark: [r.remark || ''],
      person: [r.person || ''],
    }));
    if ((r.materialType || '') === 'Raw' && r.plan) this.ensureParts(r.plan);
  }

  /** Soft-delete one material line. */
  deleteRecord(r: MaterialRecord): void {
    if (r.espReqCode) {
      this.errorMessage = `ESP already sent (${r.espReqCode}) — this line cannot be deleted.`;
      return;
    }
    const ok = confirm(`Delete material row "${r.plan}" (${r.materialType}) on ${r.date}?`);
    if (!ok) return;
    this.isLoading = true;
    this.service.deleteMaterialRecord(r.mcode, r.srNo).subscribe({
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

  /** Lock/unlock date + department (during edit). */
  private lockHeader(lock: boolean): void {
    const opts = { emitEvent: false };
    ['date', 'deptCode'].forEach((c) => {
      const ctrl = this.form.get(c);
      if (!ctrl) return;
      lock ? ctrl.disable(opts) : ctrl.enable(opts);
    });
  }

  /* ---------------- records (view) ---------------- */
  searchReport(): void {
    this.clearMessages();
    this.isLoading = true;
    const date = this.form.get('date')?.value || null;
    const dept = this.form.get('deptCode')?.value || null;
    this.service.getMaterialRecords(date, dept).subscribe({
      next: (rows) => {
        this.reportRows = rows || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Could not load records.';
      },
    });
  }

  toggleRecords(): void {
    this.recordsCollapsed = !this.recordsCollapsed;
  }

  /* ---------------- lookups ---------------- */
  private loadDepartments(): void {
    this.service.getDepartments(this.service.companyCode).subscribe({
      next: (d) => (this.departments = d),
      error: () => (this.errorMessage = 'Could not load departments.'),
    });
  }

  private loadKva(): void {
    this.service.getKvaList().subscribe({
      next: (k) => (this.kvaOptions = k),
      error: () => (this.errorMessage = 'Could not load KVA list.'),
    });
  }

  get selectedDeptName(): string {
    const d = this.departments.find((x) => x.deptCode === this.form.get('deptCode')?.value);
    return d ? d.deptName : '';
  }

  /* ---------------- save ---------------- */
  submit(): void {
    this.clearMessages();

    if (this.form.get('date')?.invalid) {
      this.form.get('date')?.markAsTouched();
      this.errorMessage = 'Please select a date.';
      return;
    }
    // Every row must be complete: Plan, Type of material, Quantity and Status.
    if (this.rows.invalid) {
      this.rows.markAllAsTouched();
      this.errorMessage = 'Each row needs Department, Plan (KVA), Plan Qty and Type of material.';
      return;
    }

    // const valid = this.rows.controls.filter((r) => {
    //   const v = r.value;
    //   return v.plan && v.materialType && v.quantity !== null && v.quantity !== '';
    // });

    // if (valid.length === 0) {
    //   this.errorMessage = 'Add at least one complete row (Plan, Type of material, Quantity).';
    //   return;
    // }

    if (this.editingRef) { this.saveSingleEdit(); return; }
    const payload: SaveMaterialBatchRequest = {
      date: this.form.get('date')?.value,
      companyCode: this.service.companyCode,
      deptCode: this.form.get('deptCode')?.value,
      deptName: this.selectedDeptName,
      createdBy: this.service.sessionUser,
      entries: this.rows.controls.map((r) => ({
        deptCode: r.value.deptCode || '',
        plan: r.value.plan,
        planQuantity: Number(r.value.planQuantity),
        materialType: r.value.materialType,
        partCode: r.value.materialType === 'Raw'
          ? (this.partsFor(r.value.plan).find((p) => p.partName === r.value.partName)?.partCode || '')
          : '',
        partName: r.value.partName || '',
        shortageQty: Number(r.value.shortageQty) || 0,
        issueType: r.value.issueType || '',
        status: r.value.status || 'Open',
        remark: r.value.remark || '',
        person: r.value.person || '',
      })),
    };

    this.isLoading = true;
    this.service.saveMaterialBatch(payload).subscribe({
      next: () => {
        this.isLoading = false;
        const n = payload.entries.length;
        this.successMessage = `Saved ${n} material ${n === 1 ? 'row' : 'rows'}.`;
        // land the Records view on the company that was just fed, so the new rows are visible
        const firstDept = payload.entries[0]?.deptCode || '';
        if (this.showCompanyPicker && firstDept) {
          const cc = firstDept.slice(0, 2);
          if (this.viewCompanies.some((c) => c.companyCode === cc)) this.selectedCompany = cc;
        }
        this.isFormVisible = false;
        this.isEditMode = false;
        this.lockHeader(false);
        this.searchReport();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Save failed. Please try again.';
      },
    });
  }

  clear(): void {
    this.clearMessages();
    this.rows.clear();
    this.rows.push(this.newRow());
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  trackByIndex(i: number): number {
    return i;
  }

  /* ============================================================= */
  /* Exports (flat table — ExcelJS + jsPDF via CDN, same as the    */
  /* other forms)                                                  */
  /* ============================================================= */
  private exportDateLabel(): string {
    const d = this.form.get('date')?.value;
    return d ? d.split('-').reverse().join('-') : '';
  }

  /** Pretty date for the grid strip: '2026-06-26' -> '26 Jun 2026'. */
  niceDate(s: string | null | undefined): string {
    if (!s) return '';
    const parts = String(s).split('-');
    if (parts.length !== 3) return String(s);
    const y = +parts[0], m = +parts[1], d = +parts[2];
    if (!y || !m || !d) return String(s);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d} ${months[m - 1]} ${y}`;
  }

  private exportFileName(ext: string): string {
    const d = this.form.get('date')?.value || 'all';
    return `Material_U1_${d}.${ext}`;
  }

  async exportExcel(): Promise<void> {
    if (this.isExporting || this.filteredRecords.length === 0) return;
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
      const center = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Material');
      ws.columns = [
        { width: 6 }, { width: 12 }, { width: 24 }, { width: 10 },
        { width: 9 }, { width: 12 }, { width: 36 }, { width: 10 },
        { width: 11 }, { width: 9 }, { width: 18 }, { width: 24 },
      ];

      ws.mergeCells('A1:L1');
      const t1 = ws.getCell('A1');
      t1.value = {
        richText: [
          { text: this.chartCompanyName + '\n', font: { bold: true, size: 15, color: { argb: 'FFFFFFFF' } } },
          { text: `Production Material        ${this.exportDateLabel()}`, font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } } },
        ],
      };
      t1.alignment = center;
      t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
      ws.getRow(1).height = 40;

      const headers = ['Sr.no', 'Date', 'Department', 'Plan (KVA)', 'Plan Qty', 'Type', 'Part Name', 'Shortage Qty', 'Issue', 'Status', 'Remark', 'Responsible person'];
      headers.forEach((h, i) => {
        const c = ws.getCell(2, i + 1);
        c.value = h;
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;
        c.border = allBorders;
      });
      ws.getRow(2).height = 26;                     // wrapped headers get room — nothing clips

      let sr = 1, rowNum = 3;
      for (const r of this.filteredRecords) {
        ws.getRow(rowNum).values = [
          sr++, r.date, r.deptName, r.plan, r.planQuantity, r.materialType, r.partName || '', r.shortageQty || '', r.issueType || '', r.status || '', r.remark || '', r.person || '',
        ];
        for (let c = 1; c <= 12; c++) {
          const cell = ws.getRow(rowNum).getCell(c);
          cell.border = allBorders;
          cell.alignment = {
            horizontal: c === 1 || c === 6 || c === 8 || c === 9 ? 'center' : 'left',
            vertical: 'middle', wrapText: c === 7 || c === 11 || c === 12,
          };
        }
        rowNum++;
      }

      const buf = await wb.xlsx.writeBuffer();
      this.downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), this.exportFileName('xlsx'));
    } catch {
      this.errorMessage = 'Excel export failed.';
    } finally {
      this.isExporting = false;
    }
  }

  async exportPdf(): Promise<void> {
    if (this.isExporting || this.filteredRecords.length === 0) return;
    this.isExporting = true;
    try {
      if (!(window as any).jspdf) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }
      const jsPDF = (window as any).jspdf?.jsPDF;
      if (!jsPDF) { this.errorMessage = 'PDF library failed to load.'; return; }
      if (!jsPDF.API || !jsPDF.API.autoTable) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const M = 40;

      // main heading — centered
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(20, 30, 40);
      doc.text('Production Material U1', pageW / 2, 40, { align: 'center' });

      // company name — left, below the heading
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 108, 141);
      doc.text(this.chartCompanyName, M, 62);

      // date — right, same line as the company name
      const dateLabel = this.exportDateLabel();
      if (dateLabel) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(90, 90, 90);
        doc.text(`Date: ${dateLabel}`, pageW - M, 62, { align: 'right' });
      }

      // divider
      doc.setDrawColor(15, 108, 141);
      doc.setLineWidth(1);
      doc.line(M, 72, pageW - M, 72);

      const body = this.filteredRecords.map((r, i) => [
        i + 1, r.date, r.deptName, r.plan, r.planQuantity, r.materialType, r.partName || '', r.shortageQty || '', r.issueType || '', r.status || '', r.remark || '', r.person || '',
      ]);

      (doc as any).autoTable({
        head: [['Sr.no', 'Date', 'Department', 'Plan (KVA)', 'Plan Qty', 'Type', 'Part Name', 'Shortage', 'Issue', 'Status', 'Remark', 'Responsible person']],
        body,
        startY: 84,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [15, 108, 141], textColor: 255 },
        alternateRowStyles: { fillColor: [247, 249, 251] },
      });

      doc.save(this.exportFileName('pdf'));
    } catch {
      this.errorMessage = 'PDF export failed.';
    } finally {
      this.isExporting = false;
    }
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
}