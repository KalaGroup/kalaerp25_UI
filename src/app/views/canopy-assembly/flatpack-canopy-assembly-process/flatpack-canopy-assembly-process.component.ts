import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  FlatpackCanopyAssemblyProcessService,
  CanopyOption,
  FlatPackPartRow,
  LineRight,
  ProcessDetailsResponse,
} from './flatpack-canopy-assembly-process.service';

@Component({
  selector: 'app-flatpack-canopy-assembly-process',
  standalone: false,
  templateUrl: './flatpack-canopy-assembly-process.component.html',
  styleUrl: './flatpack-canopy-assembly-process.component.scss',
})
export class FlatpackCanopyAssemblyProcessComponent implements OnInit {
  // ── Header context ──────────────────────────────────────────────
  pcCode: string = '';         // login PC (from localStorage), shown in the read-only Profit Center field
  pcName: string = '';
  empCode: string = '';
  companyCode: string = '';
  heading: string = 'Line1';   // legacy "ULHeading" — kept as-is so the SP path is unchanged

  // ── Line list (hardcoded) ─────────────────────────────────────
  // Flat Pack Canopy Assembly is dedicated to three lines — all sharing
  // ParentDgPC 01.093. Hardcoded on purpose: no backend / position-rights
  // lookup for this page. If a fourth line joins, add it here.
  readonly lineRights: LineRight[] = [
    { LineWisePC: '01.124', LineDesc: 'Unit 1 Line A Flat Packing', ParentDgPC: '01.093' },
    { LineWisePC: '01.125', LineDesc: 'Unit 1 Line B Flat Packing', ParentDgPC: '01.093' },
    { LineWisePC: '01.126', LineDesc: 'Unit 1 Line C Flat Packing', ParentDgPC: '01.093' },
  ];
  selectedLineWisePC: string = '';

  // ── Form state ─────────────────────────────────────────────────
  canopyOptions: CanopyOption[] = [];
  selectedCanopyPartCode: string = '';

  processTypeOptions = [
    { label: 'CPY Only',         value: 'CPY' },
    { label: 'CPY with (BF_FT)', value: 'CPY(BF_FT)' },
  ];
  selectedProcessType: string = '';

  partDescDisplay: string = '';
  partCode: string = '';
  bomCode: string = '';
  processQty: number | null = null;

  // ── Derived fields (filled by Search) ──────────────────────────
  overallRate: number = 0;
  overallAmount: number = 0;
  wt: number = 0;
  sqFt: number = 0;
  crWt: number = 0;
  hrWt: number = 0;
  crRate: number = 0;
  hrRate: number = 0;

  // ── Grid ───────────────────────────────────────────────────────
  partDetails: FlatPackPartRow[] = [];
  readonly gridColumns: { label: string; align: 'left' | 'right'; width?: string }[] = [
    { label: 'SrNo',            align: 'left',  width: '60px'  },
    { label: 'PartDesc',        align: 'left'                  },
    { label: 'UOM',             align: 'left',  width: '70px'  },
    { label: 'KitQty',          align: 'right', width: '90px'  },
    { label: 'TotalQty',        align: 'right', width: '100px' },
    { label: 'Stk',             align: 'right', width: '90px'  },
    { label: 'QtyAfterProcess', align: 'right', width: '130px' },
    { label: 'Rate',            align: 'right', width: '110px' },
    { label: 'Amount',          align: 'right', width: '110px' },
  ];

  // ── UI state ──────────────────────────────────────────────────
  isLoadingOptions: boolean = false;
  isSearching: boolean = false;
  isSaving: boolean = false;
  pfbCode: string = '';        // re-entry guard (matches legacy txtDispCode check)

  // ── Modals ─────────────────────────────────────────────────────
  successMessage: string = '';
  errorMessage: string = '';
  confirmMessage: string = '';
  pendingSaveConfirmed: boolean = false;

  constructor(
    private flatpackService: FlatpackCanopyAssemblyProcessService,
    private router: Router,
  ) {}

  // Navigate back to the Flat Pack Canopy Plan Report.
  onBackToReport(): void {
    this.router.navigate(['/canopy-assembly/flatpack-canopy-assembly-plan']);
  }

  // Full text of the selected canopy — used as a hover tooltip so the
  // truncated dropdown still surfaces the full description on demand.
  get selectedCanopyDescription(): string {
    if (!this.selectedCanopyPartCode) return '';
    const opt = this.canopyOptions.find(o => o.PartCode === this.selectedCanopyPartCode);
    return opt?.PartDesc ?? '';
  }

  ngOnInit(): void {
    const rawPc = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    this.pcCode      = rawPc === 'undefined' || rawPc === 'null' ? '' : rawPc;
    this.pcName      = localStorage.getItem('profitCenterName')?.trim() ?? '';
    this.empCode     = localStorage.getItem('employeeCode')?.trim() ?? '';
    this.companyCode = localStorage.getItem('companyId')?.trim() ?? '';

    // Canopy options depend on the selected line's LineWisePC (KVA band
    // filter). Nothing loads until the operator picks a line.
  }

  // Resolved line record for the currently selected LineWisePC.
  get selectedLineRight(): LineRight | undefined {
    return this.lineRights.find(l => l.LineWisePC === this.selectedLineWisePC);
  }

  // Line changed — reload the Canopy dropdown for the new LineWisePC (KVA
  // band changes per line) and clear derived state so the operator re-runs
  // Search against the newly selected line's PC.
  onLineChange(): void {
    this.canopyOptions = [];
    this.selectedCanopyPartCode = '';
    this.clearDerived();
    if (this.selectedLineWisePC) this.loadCanopyOptions();
  }

  // ── Canopy dropdown load ──────────────────────────────────────
  // Server applies the per-line KVA band based on selectedLineWisePC.
  private loadCanopyOptions(): void {
    if (!this.selectedLineWisePC) { this.canopyOptions = []; return; }
    this.isLoadingOptions = true;
    this.flatpackService.getCanopyOptions(this.selectedLineWisePC).subscribe({
      next: (rows) => {
        this.canopyOptions = Array.isArray(rows) ? rows : [];
        this.isLoadingOptions = false;
      },
      error: (err) => {
        this.isLoadingOptions = false;
        this.errorMessage = this.extractErr(err, 'Failed to load canopy options.');
      },
    });
  }

  // ── Cascade ───────────────────────────────────────────────────
  onCanopyChange(): void {
    this.clearDerived();
    this.refreshBindPrimary();
  }

  onProcessTypeChange(): void {
    this.clearDerived();
    if (!this.selectedCanopyPartCode) {
      this.errorMessage = 'Please select Canopy!';
      return;
    }
    this.refreshBindPrimary();
  }

  private refreshBindPrimary(): void {
    if (!this.selectedCanopyPartCode || !this.selectedProcessType) return;

    this.flatpackService.getBindPrimary(
      this.selectedCanopyPartCode,
      this.selectedProcessType,
      this.heading,
    ).subscribe({
      next: (resp) => {
        this.partDescDisplay = resp?.PartDesc ?? '';
        this.partCode        = resp?.PartCode ?? '';
      },
      error: (err) => {
        this.errorMessage = this.extractErr(err, 'Failed to derive Part Desc.');
      },
    });
  }

  private clearDerived(): void {
    this.partDescDisplay = '';
    this.partCode = '';
    this.bomCode = '';
    this.overallRate = 0;
    this.overallAmount = 0;
    this.wt = 0;
    this.sqFt = 0;
    this.crWt = 0;
    this.hrWt = 0;
    this.crRate = 0;
    this.hrRate = 0;
    this.partDetails = [];
  }

  // ── Search ────────────────────────────────────────────────────
  onSearch(): void {
    if (!this.selectedLineWisePC)     { this.errorMessage = 'Please select Line!'; return; }
    if (!this.selectedCanopyPartCode) { this.errorMessage = 'Please select Canopy!'; return; }
    if (!this.selectedProcessType)    { this.errorMessage = 'Please select Process Type!'; return; }
    if (!this.partCode)               { this.errorMessage = 'Part Desc could not be derived.'; return; }
    if (!this.processQty || this.processQty <= 0) { this.errorMessage = 'Please Enter ProcessQty !'; return; }

    const pcForSearch = this.selectedLineRight?.LineWisePC ?? '';

    this.isSearching = true;
    this.flatpackService.getProcessDetails({
      PCCode:         pcForSearch,
      CanopyPartCode: this.selectedCanopyPartCode,
      PartCode:       this.partCode,
      ProcessType:    this.selectedProcessType,
      ProcessQty:     Number(this.processQty),
    }).subscribe({
      next: (resp: ProcessDetailsResponse) => {
        this.isSearching = false;
        this.applyDetails(resp);
      },
      error: (err) => {
        this.isSearching = false;
        this.errorMessage = this.extractErr(err, 'Failed to load process details.');
      },
    });
  }

  private applyDetails(r: ProcessDetailsResponse): void {
    this.bomCode       = r?.BomCode ?? '';
    this.overallRate   = r?.OverallRate ?? 0;
    this.overallAmount = r?.OverallAmount ?? 0;
    this.wt            = r?.Wt ?? 0;
    this.sqFt          = r?.SqFt ?? 0;
    this.crWt          = r?.CRWt ?? 0;
    this.hrWt          = r?.HRWt ?? 0;
    this.crRate        = r?.CRRate ?? 0;
    this.hrRate        = r?.HRRate ?? 0;
    this.partDetails   = Array.isArray(r?.PartDetails) ? r.PartDetails : [];
  }

  // ── Save (with confirm modal) ──────────────────────────────────
  onSaveClick(): void {
    if (this.pfbCode) {
      this.errorMessage = `Process already saved as ${this.pfbCode}.`;
      return;
    }
    if (!this.selectedCanopyPartCode) { this.errorMessage = 'Please Select Canopy Part !'; return; }
    if (!this.partDescDisplay || this.partCode === '0') { this.errorMessage = 'PartDesc can not empty or 0!'; return; }
    if (!this.processQty || this.processQty <= 0) { this.errorMessage = 'Please fill ProcessQty !'; return; }
    if (this.partDetails.length === 0) { this.errorMessage = 'Part Details should not be blank !'; return; }

    // Client-side stock validations (parity with legacy alerts).
    for (const row of this.partDetails) {
      if (row.Stk <= 0)                throw this.errorMessage = `Insufficient Stock for Part : ${row.PartCode} !`;
      if (row.Stk < row.TotalQty)      throw this.errorMessage = `Insufficient Stock for Part : ${row.PartCode}`;
      if (row.QtyAfterProcess < 0)     throw this.errorMessage = `Insufficient Stock for Part : ${row.PartCode}`;
    }

    this.confirmMessage = 'Are you sure you want to continue?';
  }

  onConfirmSave(): void {
    this.confirmMessage = '';
    this.doSave();
  }

  onCancelConfirm(): void {
    this.confirmMessage = '';
  }

  private doSave(): void {
    const pcForSave = this.selectedLineRight?.LineWisePC ?? '';
    if (!pcForSave) { this.errorMessage = 'Please select Line!'; return; }

    this.isSaving = true;
    this.flatpackService.submit({
      PCCode:         pcForSave,
      ParentDgPC:     this.selectedLineRight?.ParentDgPC ?? '',
      CompanyCode:    this.companyCode || '01',
      EmpCode:        this.empCode,
      ProcessType:    this.selectedProcessType,
      CanopyPartCode: this.selectedCanopyPartCode,
      PartCode:       this.partCode,
      ProcessQty:     Number(this.processQty),
      BomCode:        this.bomCode,
      Heading:        this.heading,
      OverallRate:    this.overallRate,
      Wt:             this.wt,
      SqFt:           this.sqFt,
      CRWt:           this.crWt,
      HRWt:           this.hrWt,
      CRRate:         this.crRate,
      HRRate:         this.hrRate,
      PartDetails:    this.partDetails,
    }).subscribe({
      next: (resp) => {
        this.isSaving = false;
        this.pfbCode = resp?.PFBCode ?? '';
        this.successMessage = resp?.Message
          || `Process Saved Successfully & Your Process Code : ${this.pfbCode}`;
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
  private extractErr(err: any, fallback: string): string {
    if (err?.status === 0) return 'Unable to reach server. Please try again.';
    return err?.error?.message
        || err?.error
        || err?.message
        || fallback;
  }
}
