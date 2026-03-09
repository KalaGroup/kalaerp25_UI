import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { formatDate } from '@angular/common';
import { CanopyProcessService,IJobcard_CpyDts,IJobcard_CpySave } from '../canopy-process.service';

@Component({
  selector: 'app-canopy-plan',
  standalone: false,
  templateUrl: './canopy-plan.component.html',
  styleUrl: './canopy-plan.component.scss'
})
export class CanopyPlanComponent implements OnInit {

  // ── UI state ────────────────────────────────────────────────────
  today          = '';
  PC             = 'PPC-Canopy --> 01.041';
  isLoading      = false;
  errorMessage   = '';
  successMessage = '';
  warningMessage = '';

  // ── Data ────────────────────────────────────────────────────────
  planList: IJobcard_CpyDts[] = [];
  payload: IJobcard_CpySave   = this.emptyPayload();

  // ── Summary counters ────────────────────────────────────────────
  totalRows = 0;
  todayRows = 0;

  constructor(private canopyService: CanopyProcessService) { }

  ngOnInit(): void {
    this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
  }

  // ── API calls ───────────────────────────────────────────────────

  onClickSearch(): void {
    this.clearMessages();
    this.isLoading = true;

    const compCode = localStorage.getItem('companyId') ?? '01';

    this.canopyService.getCanopyPlan(compCode).subscribe({
      next: (data) => {
        this.planList  = (data ?? []).map(d => ({ ...d, SelectR: false }));
        this.totalRows = this.planList.length;
        this.todayRows = this.planList.filter(r => r.TodayFlag === 'TODAY').length;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.message ?? 'Failed to load data.';
        this.isLoading    = false;
      }
    });
  }

  onFormSubmit(form: NgForm): void {
    this.clearMessages();

    if (!this.planList.length) {
      this.errorMessage = 'Please search Canopy Plan details first.';
      return;
    }

    const selected = this.planList.filter(r => r.SelectR === true);

    if (!selected.length) {
      this.errorMessage = 'Please select at least one row.';
      return;
    }

    if (!form.value.txtRemark?.trim()) {
      this.errorMessage = 'Remark is required.';
      return;
    }

    const zeroQty = selected.find(r => r.PlanQty <= 0);
    if (zeroQty) {
      this.warningMessage = `PlanQty is 0 for Model "${zeroQty.Model}". Please fix before submitting.`;
      return;
    }

    const compCode = localStorage.getItem('companyId') ?? '01';

    const dtsStr = selected
      .map(r =>
        [r.KVA, r.Model, r.Partcode, r.FNorm, r.TotStk, r.WIPStk,
         r.PenPlanQty, r.PReq, r.PlanQty, r.BatchQty, r.Bomcode,
         r.PlanCode, r.PlanDate, r.DayPlanQty].join('@#@')
      )
      .join('@@#@@');

    this.payload = {
      Code:           '0',
      EmpCode:        '',
      PCCode:         form.value.txtPC?.substr(-6, 6) ?? '',
      CompCode:       compCode,
      JobCard_CpyDts: dtsStr,
      Remark:         form.value.txtRemark.trim()
    };

    this.isLoading = true;

    this.canopyService.submitJobCardCpy(this.payload).subscribe({
      next: (res) => {
        this.isLoading      = false;
        this.successMessage = res ?? 'Job Card submitted successfully.';
      },
      error: (err) => {
        this.isLoading    = false;
        this.errorMessage = err.message ?? 'Submission failed. Please try again.';
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────

  get selectedCount(): number {
    return this.planList.filter(r => r.SelectR).length;
  }

  toggleAll(checked: boolean): void {
    this.planList.forEach(r => (r.SelectR = checked));
  }

  get allChecked(): boolean {
    return this.planList.length > 0 && this.planList.every(r => r.SelectR);
  }

  clearMessages(): void {
    this.errorMessage   = '';
    this.successMessage = '';
    this.warningMessage = '';
  }

  onSuccessOk(): void {
    this.clearMessages();
  }

  private emptyPayload(): IJobcard_CpySave {
    return { Code: '', EmpCode: '', PCCode: '', CompCode: '', JobCard_CpyDts: '', Remark: '' };
  }
}
