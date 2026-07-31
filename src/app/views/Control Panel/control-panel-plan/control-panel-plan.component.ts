import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, of, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import {
  ControlPanelPlanService,
  CanopyPlanPartOption,
  CanopyPlanPartContext,
  CanopyPlanRow,
  CanopyPlanCheckerMakerRow,
  LineRight,
  KvaOption,
  ControlPanelBoxPlanRow,
} from './control-panel-plan.service';

@Component({
  selector: 'app-control-panel-plan',
  standalone: false,
  templateUrl: './control-panel-plan.component.html',
  styleUrl: './control-panel-plan.component.scss',
})
export class ControlPanelPlanComponent implements OnInit, OnDestroy {
  // ── Context (read-only, from localStorage) ────────────────────
  pcCode: string = '';
  pcName: string = '';
  companyCode: string = '';
  empCode: string = '';
  todayIso: string = '';
  cpCode: string = '';

  // ── KVA dropdown (replaces the line-rights dropdown for Control Panel Plan) ──
  // Fed by Quality/GetActivePartKvaList — same source dg-material-status uses.
  kvaOptions: KvaOption[] = [];
  selectedKva: string = '';
  isLoadingKvas: boolean = false;

  // ── Line-rights (kept internally but not surfaced in the UI) ──
  // The submit payload still expects PCCode / ParentDgPC, so the fields
  // remain in the component; loadLineRights() is intentionally NOT invoked
  // for the Control Panel Plan flow.
  prmCode: string = '';
  lineRights: LineRight[] = [];
  selectedLineWisePC: string = '';

  // ── Plan window ───────────────────────────────────────────────
  fromDate: string = '';
  toDate: string = '';

  // ── Part picker (with lazy-load) ──────────────────────────────
  partSearchText: string = '';
  partOptions: CanopyPlanPartOption[] = [];
  isLoadingOptions: boolean = false;
  isDropdownOpen: boolean = false;
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // ── Current draft row (the input panel) ───────────────────────
  draftDate: string = '';
  draftPartCode: string = '';
  draftPartDesc: string = '';
  draftBomCode: string = '';
  draftQty: number | null = null;
  draftStkQty: number = 0;
  draftPendQty: number = 0;
  isFetchingContext: boolean = false;

  // ── Grid rows (SP-fetched candidate parts + any manually-added rows) ──
  // Each row carries Qty (user-editable). Control Panel Plan does not
  // surface Stock/Pending Qty or an Action column — the operator just picks
  // rows and types a Qty.
  rows: CanopyPlanRow[] = [];
  isLoadingPlanRows: boolean = false;
  readonly gridColumns: { label: string; align: 'left' | 'right' | 'center'; width?: string }[] = [
    { label: 'SrNo',             align: 'center', width: '60px'  },
    { label: 'Qty',              align: 'right',  width: '110px' },
    { label: 'Part Description', align: 'left'                    },
    { label: 'BOM Code',         align: 'left',   width: '220px' },
    { label: 'Date',             align: 'center', width: '110px' },
  ];

  // ── UI state ───────────────────────────────────────────────────
  isSaving: boolean = false;

  // ── Modals ─────────────────────────────────────────────────────
  successMessage: string = '';
  errorMessage: string = '';
  confirmMessage: string = '';

  constructor(
    private planService: ControlPanelPlanService,
  ) {}

  ngOnInit(): void {
    // Read context from localStorage (set on login).
    const rawPc = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    this.pcCode      = rawPc === 'undefined' || rawPc === 'null' ? '' : rawPc;
    this.pcName      = localStorage.getItem('profitCenterName')?.trim() ?? '';
    this.companyCode = localStorage.getItem('companyId')?.trim() ?? '01';
    this.empCode     = localStorage.getItem('employeeCode')?.trim() ?? '';
    this.prmCode     = localStorage.getItem('positionRoleId')?.trim() ?? '';
    // Control Panel Plan uses KVA-based selection instead of line-based.
    // loadLineRights() is intentionally not called here.
    this.loadKvaList();

    // Default plan window = today → today + 6 days.
    const today = new Date();
    const plus6 = new Date();
    plus6.setDate(today.getDate() + 6);
    this.todayIso = this.toIsoDate(today);
    this.fromDate = this.toIsoDate(today);
    this.toDate   = this.toIsoDate(plus6);
    this.draftDate = this.toIsoDate(today);

    // Wire the debounced part-search pipeline.
    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(text => {
        if (!text || text.trim().length < 2) {
          this.isLoadingOptions = false;
          return of([] as CanopyPlanPartOption[]);
        }
        this.isLoadingOptions = true;
        const pc = this.selectedLineRight?.LineWisePC || this.pcCode;
        return this.planService.getPartOptions(text, pc).pipe(
          catchError(_ => of([] as CanopyPlanPartOption[])),
        );
      }),
    ).subscribe(opts => {
      this.partOptions = opts;
      this.isLoadingOptions = false;
      this.isDropdownOpen = opts.length > 0;
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  // ── Line-rights ───────────────────────────────────────────────
  get selectedLineRight(): LineRight | undefined {
    return this.lineRights.find(l => l.LineWisePC === this.selectedLineWisePC);
  }

  // Kept for future re-use — Control Panel Plan uses KVA selection instead
  // of line selection, so ngOnInit does NOT call this method. Preserved
  // (rather than deleted) because the submit payload still expects PCCode /
  // ParentDgPC that would ordinarily come from a picked LineRight.
  private loadLineRights(): void {
    if (!this.prmCode) { this.lineRights = []; return; }
    this.planService.getLineRights(this.prmCode).subscribe({
      next: (rows) => {
        this.lineRights = Array.isArray(rows) ? rows : [];
        // Auto-select for single-line positions so the dropdown isn't blank.
        if (this.lineRights.length === 1) {
          this.selectedLineWisePC = this.lineRights[0].LineWisePC;
          this.onLineChange();
        }
      },
      error: () => { this.lineRights = []; },
    });
  }

  // ── KVA dropdown load ─────────────────────────────────────────
  // Parameterless GET — Quality/GetActivePartKvaList — shared with the
  // dg-material-status form. UI-first phase: we're just wiring the source
  // for now; onKvaChange doesn't hit an API yet (the SP that filters
  // candidate control panels by KVA hasn't been built).
  private loadKvaList(): void {
    this.isLoadingKvas = true;
    this.planService.getKvaList().subscribe({
      next: (rows) => {
        this.kvaOptions = Array.isArray(rows) ? rows : [];
        this.isLoadingKvas = false;
      },
      error: (err) => {
        this.isLoadingKvas = false;
        this.errorMessage = this.extractErr(err, 'Failed to load KVA list.');
      },
    });
  }

  // Triggered when the user picks a KVA from the dropdown.
  // Loads candidate Control Panel Box BOMs from the new backend endpoint
  // (ControlPanelBox/GetPlanRowsByKva) and maps each row into the grid
  // schema. StkQty / PendQty are set to 0 because the query doesn't
  // surface them — the UI grid also doesn't render those columns anymore.
  onKvaChange(): void {
    this.rows = [];
    this.cpCode = '';
    if (!this.selectedKva) return;

    this.isLoadingPlanRows = true;
    this.planService.getPlanRowsByKva(this.selectedKva).subscribe({
      next: (spRows: ControlPanelBoxPlanRow[]) => {
        const today = this.toIsoDate(new Date());
        this.rows = (spRows ?? []).map(r => ({
          Dt:       today,
          PartCode: r.KitCode,        // KitCode is the part identity for save
          PartDesc: r.PartDesc,
          BomCode:  r.BOMCode,
          Qty:      0,                 // user fills in
          StkQty:   0,                 // not shown in the grid; kept for the DTO shape
          PendQty:  0,                 // not shown in the grid; kept for the DTO shape
        }));
        this.isLoadingPlanRows = false;
      },
      error: (err) => {
        this.isLoadingPlanRows = false;
        this.errorMessage = this.extractErr(err, 'Failed to load candidate rows for this KVA.');
      },
    });
  }

  // Triggered every time the user changes the Select Line dropdown.
  // Calls SP getcpyplandts_checker_maker for the selected LineWisePC and
  // loads the returned candidate parts into the plan grid.
  onLineChange(): void {
    // Clear previously-loaded rows + any save state from a prior line.
    this.rows = [];
    this.cpCode = '';
    if (!this.selectedLineWisePC) return;

    this.isLoadingPlanRows = true;
    this.planService.getCheckerMakerRows(this.selectedLineWisePC).subscribe({
      next: (spRows: CanopyPlanCheckerMakerRow[]) => {
        const today = this.toIsoDate(new Date());
        this.rows = (spRows ?? []).map(r => ({
          Dt:       today,
          PartCode: r.PartCode,
          PartDesc: r.PartDesc,
          BomCode:  r.BOMCode,
          Qty:      0,                // user fills in, capped at PendQty
          StkQty:   r.StkQty ?? 0,
          PendQty:  r.PendQty ?? 0,
        }));
        this.isLoadingPlanRows = false;
      },
      error: (err) => {
        this.isLoadingPlanRows = false;
        this.errorMessage = this.extractErr(err, 'Failed to load candidate parts for this line.');
      },
    });
  }

  // Clamp the user's Qty entry to never exceed PendQty for the row.
  // Control Panel Plan is "one row per plan" — a single Save produces one
  // CPCode, and the header only makes sense against a single line item.
  //
  //   • Floor negatives / non-finite input at 0.
  //   • If the operator tries to add Qty to a SECOND row while another row
  //     is still non-zero, show a warning and refuse the change. This is
  //     safer than silently clobbering the earlier row — the operator has
  //     to explicitly zero the previous row before starting a new one.
  onRowQtyChange(idx: number, value: number | string | null): void {
    if (idx < 0 || idx >= this.rows.length) return;
    let n = Number(value);
    if (!isFinite(n) || n < 0) n = 0;

    if (n > 0) {
      const otherEditedIdx = this.rows.findIndex(
        (r, i) => i !== idx && Number(r.Qty) > 0,
      );
      if (otherEditedIdx !== -1) {
        const other = this.rows[otherEditedIdx];
        this.errorMessage =
          `Only one row can be planned at a time. Row ${otherEditedIdx + 1} ` +
          `(${other.PartDesc || other.PartCode}) already has Qty = ${other.Qty}. ` +
          `Please set that row's Qty to 0 before editing another row.`;
        // Force the model back to 0 so the change is rejected in-place.
        this.rows[idx].Qty = 0;
        return;
      }
    }

    this.rows[idx].Qty = n;
  }

  // ── Part dropdown handlers ────────────────────────────────────
  onPartSearchInput(value: string): void {
    this.partSearchText = value;
    // Clear the resolved part if user is typing fresh.
    if (this.draftPartCode && !value.includes(this.draftPartCode)) {
      this.draftPartCode = '';
      this.draftPartDesc = '';
      this.draftBomCode  = '';
      this.draftStkQty   = 0;
      this.draftPendQty  = 0;
    }
    this.searchSubject.next(value);
  }

  onPartSelected(opt: CanopyPlanPartOption): void {
    this.draftPartCode = opt.PartCode;
    this.draftPartDesc = opt.PartDesc;
    this.partSearchText = opt.PartDesc;
    this.isDropdownOpen = false;
    this.partOptions = [];

    this.fetchPartContext(opt.PartCode);
  }

  onPartSearchBlur(): void {
    // Slight delay so the (click) on a dropdown row registers first.
    setTimeout(() => { this.isDropdownOpen = false; }, 150);
  }

  private fetchPartContext(partCode: string): void {
    this.isFetchingContext = true;
    const pc = this.selectedLineRight?.LineWisePC || this.pcCode;
    this.planService.getPartContext(partCode, pc).subscribe({
      next: (ctx: CanopyPlanPartContext) => {
        this.draftBomCode = ctx?.BomCode ?? '';
        this.draftStkQty  = ctx?.StkQty ?? 0;
        this.draftPendQty = ctx?.PendQty ?? 0;
        this.isFetchingContext = false;
      },
      error: (err) => {
        this.isFetchingContext = false;
        this.errorMessage = this.extractErr(err, 'Failed to load part context.');
      },
    });
  }

  // ── Add row → grid ────────────────────────────────────────────
  onAddRow(): void {
    if (!this.draftDate)     { this.errorMessage = 'Date is mandatory.'; return; }
    if (!this.draftPartCode) { this.errorMessage = 'Please pick a Canopy Part.'; return; }
    if (!this.draftBomCode)  { this.errorMessage = 'BOM Code missing — pick a part with an active BOM.'; return; }
    if (!this.draftQty || this.draftQty <= 0) { this.errorMessage = 'Qty must be greater than 0.'; return; }

    // Duplicate check — same PartCode already in grid?
    if (this.rows.some(r => r.PartCode === this.draftPartCode)) {
      this.errorMessage = `Part ${this.draftPartCode} already added. Try another.`;
      return;
    }

    this.rows.push({
      Dt:       this.draftDate,
      PartCode: this.draftPartCode,
      PartDesc: this.draftPartDesc,
      BomCode:  this.draftBomCode,
      Qty:      Number(this.draftQty),
      StkQty:   this.draftStkQty,
      PendQty:  this.draftPendQty,
    });

    this.clearDraft();
  }

  removeRow(idx: number): void {
    if (idx < 0 || idx >= this.rows.length) return;
    this.rows.splice(idx, 1);
  }

  private clearDraft(): void {
    this.partSearchText = '';
    this.draftPartCode  = '';
    this.draftPartDesc  = '';
    this.draftBomCode   = '';
    this.draftQty       = null;
    this.draftStkQty    = 0;
    this.draftPendQty   = 0;
    this.partOptions    = [];
  }

  // Rows the user has actually planned (Qty > 0) — sent to the API on save.
  get plannedRows(): CanopyPlanRow[] {
    return this.rows.filter(r => Number(r.Qty) > 0);
  }

  // ── Save ───────────────────────────────────────────────────────
  onSaveClick(): void {
    if (this.cpCode) {
      this.errorMessage = `Plan already saved as ${this.cpCode}.`;
      return;
    }
    if (!this.selectedKva) {
      this.errorMessage = 'Please select a KVA before saving.';
      return;
    }
    if (!this.fromDate || !this.toDate) {
      this.errorMessage = 'Please select From Date and To Date.';
      return;
    }
    if (this.fromDate > this.toDate) {
      this.errorMessage = 'From Date cannot be after To Date.';
      return;
    }
    const planned = this.plannedRows;
    if (planned.length === 0) {
      this.errorMessage = 'Please enter Qty (> 0) for at least one part.';
      return;
    }
    // "One plan at a time" — Control Panel Plan generates a single CPCode
    // per Save, and by design that CPCode represents ONE line item.
    // onRowQtyChange normally prevents this from ever being true; this is
    // the defensive fallback in case any edge case slipped through.
    if (planned.length > 1) {
      this.errorMessage =
        `Only one row can be planned at a time — currently ${planned.length} rows have Qty > 0. ` +
        `Please set all but one row's Qty back to 0 before saving.`;
      return;
    }
    this.confirmMessage = `Save plan with ${planned.length} row?`;
  }

  onConfirmSave(): void {
    this.confirmMessage = '';
    this.doSave();
  }

  onCancelConfirm(): void {
    this.confirmMessage = '';
  }

  private doSave(): void {
    this.isSaving = true;

    // PCCode / CompanyCode / PCCode_Act / Checker1 are hardcoded server-side
    // (Control Panel Plan is fixed to line '01.041', company '01'). We only
    // send the operator-controlled fields.
    this.planService.submitPlan({
      EmpCode: this.empCode,
      FromDt:  this.fromDate,
      ToDt:    this.toDate,
      Rows:    this.plannedRows.map(r => ({
        Dt:       r.Dt,
        PartCode: r.PartCode,
        PartDesc: r.PartDesc,
        BomCode:  r.BomCode,
        Qty:      r.Qty,
      })),
    }).subscribe({
      next: (resp) => {
        this.isSaving = false;
        this.cpCode = resp?.CPCode ?? '';
        this.successMessage = resp?.Message
          || `Control Panel Plan Saved — Plan Code : ${this.cpCode}`;
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = this.extractErr(err, 'Save failed.');
      },
    });
  }

  // ── Modal close handlers ──────────────────────────────────────
  closeError(): void { this.errorMessage = ''; }
  closeSuccess(): void { this.successMessage = ''; }

  // ── Helpers ───────────────────────────────────────────────────
  trackByIndex = (i: number) => i;

  rowDisplayIndex(i: number): number { return i + 1; }

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
