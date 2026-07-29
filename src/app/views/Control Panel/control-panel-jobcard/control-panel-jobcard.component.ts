import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { formatDate } from '@angular/common';

import { CanopyProcessService } from '../../canopy-process/canopy-process.service';
import { ControlPanelJobcardService } from './control-panel-jobcard.service';
import { IJobcard_CpDts } from './Model/Jobcard_CpDts';
import { IJobcard_CpSave } from './Model/Jobcard_CpSave';

@Component({
  selector: 'app-control-panel-jobcard',
  standalone: false,
  templateUrl: './control-panel-jobcard.component.html',
  styleUrl: './control-panel-jobcard.component.scss'
})

export class ControlPanelJobcardComponent implements OnInit {

  // ── UI state ────────────────────────────────────────────────────
  today          = '';
  PC             = '';
  PCName         = '';
  isLoading      = false;
  errorMessage   = '';
  successMessage = '';
  warningMessage = '';

  /** Toggles the PlanCode column (hidden by default, as in the reference). */
  showPlanCode = false;

  /** Re-entry guard: blocks a second Submit while a save is in flight. */
  isSubmitting = false;

  // ── Login info (from localStorage) ──────────────────────────────
  EmpCode       = '';
  LoginCompCode = '';
  LoginType     = '';
  PCOld         = '';
  FormName      = '';
  FormRightId   = '';
  isShowForm    = true;

  // ── Data ────────────────────────────────────────────────────────
  planList: IJobcard_CpDts[] = [];
  payload: IJobcard_CpSave   = this.emptyPayload();

  /** Lines configured for this process (GetLineByProcess). */
  lineList: any[] = [];
  /** Selected line's LineWisePC code. */
  selectedLine: string = '';

  // ── Summary counters ────────────────────────────────────────────
  totalRows = 0;
  todayRows = 0;

  constructor(
    private canopyService: CanopyProcessService,
    private cpService: ControlPanelJobcardService
  ) {
    this.loadCurrentUser();
  }

  ngOnInit(): void {
    this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');

    if (!this.isShowForm) {
      this.clearLoginInfo();
      return;
    }

    this.loadLineByProcess();
  }

  // ── API calls ───────────────────────────────────────────────────

  /** Loads the lines for this process. ProcessName is hard-coded to "Control Panel". */
  loadLineByProcess(): void {
    this.canopyService.GetLineByProcess('Control Panel', this.LoginCompCode).subscribe({
      next: (data) => {
        this.lineList = data ?? [];
        console.log('GetLineByProcess (Control Panel):', this.lineList);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  onClickSearch(): void {
    this.clearMessages();

    // Use the selected line's LineWisePC as the plan filter.
    const lineWisePC = this.selectedLine;
    if (!lineWisePC) {
      this.errorMessage = 'Please select a Line.';
      return;
    }

    this.isLoading = true;

    this.cpService.getJobCard_CpDetails(lineWisePC).subscribe({
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
      this.errorMessage = 'Please search Control Panel Plan details first.';
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
      this.warningMessage =
        `PlanQty is 0 for Model "${zeroQty.Model}". Please fix before submitting.`;
      return;
    }

    // Guard against a double-click firing a second save before the first responds.
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    // Build delimited details string (KVA@#@Model@#@Phase@#@Partcode...@@#@@nextRow)
    const dtsStr = selected
      .map(r =>
        [
          r.KVA,
          r.Model,
          r.Phase,
          r.Partcode,
          r.FNorm,
          r.TotStk,
          r.WIPStk,
          r.PenPlanQty,
          r.PReq,
          r.PlanQty,
          r.BatchQty,
          r.Bomcode,
          r.PlanCode,
          r.PlanDate,
          r.DayPlanQty
        ].join('@#@')
      )
      .join('@@#@@');

    // Resolve the selected line so we can read its ParentDgPC.
    const selectedLineObj = this.lineList.find(l => l.LineWisePC === this.selectedLine);

    this.payload = {
      Code:        '0',
      EmpCode:     this.EmpCode,
      PCCode_Act:  this.selectedLine,                 // LineWisePC of the selected line
      PCCode:      selectedLineObj?.ParentDgPC ?? '', // ParentDgPC of the selected line
      CompCode:    this.LoginCompCode,
      JobCard_CpyDts: dtsStr,
      Remark:         form.value.txtRemark.trim()
    };

    console.log('Control Panel Submit payload', this.payload);

    this.isLoading = true;

    this.cpService.postjobcard_CpSave(this.payload).subscribe({
      next: (res) => {
        this.isLoading      = false;
        this.isSubmitting   = false;
        this.successMessage = (typeof res === 'string' && res.trim().length)
          ? res
          : 'Control Panel Job Card submitted successfully.';
      },
      error: (err) => {
        this.isLoading    = false;
        this.isSubmitting = false;
        this.errorMessage = err.message ?? 'Submission failed. Please try again.';
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────

  get selectedCount(): number {
    return this.planList.filter(r => r.SelectR).length;
  }

  /**
   * The submit API can return a compound status string joined by " & ".
   * Split it into label/value parts so the success popup shows each on
   * its own line instead of one long sentence.
   */
  get successMessageParts(): { label: string; value: string }[] {
    return (this.successMessage ?? '')
      .split('&')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => {
        const idx = s.indexOf(':');
        return idx > -1
          ? { label: s.slice(0, idx).trim(), value: s.slice(idx + 1).trim() }
          : { label: '', value: s };
      });
  }

  selectOnly(index: number, checked: boolean): void {
    this.planList.forEach((r, i) => (r.SelectR = checked && i === index));
  }

  clearMessages(): void {
    this.errorMessage   = '';
    this.successMessage = '';
    this.warningMessage = '';
  }

  onSuccessOk(): void {
    this.clearMessages();
    this.planList  = [];
    this.totalRows = 0;
    this.todayRows = 0;
  }

  // ── Private ─────────────────────────────────────────────────────

  private loadCurrentUser(): void {
    this.EmpCode       = (localStorage.getItem('employeeCode')     ?? '').trim();
    this.PC            = (localStorage.getItem('ProfitCenter')     ?? '').trim();
    this.PCName        = (localStorage.getItem('profitCenterName') ?? '').trim();
    this.LoginType     = (localStorage.getItem('loginType')        ?? '').trim();
    this.LoginCompCode = (localStorage.getItem('companyId')        ?? '').trim();
    this.PCOld         = (localStorage.getItem('ProfitCenter_old') ?? '').trim();
  }

  private clearLoginInfo(): void {
    this.EmpCode       = '';
    this.FormName      = '';
    this.FormRightId   = '';
    this.LoginCompCode = '';
  }

  private emptyPayload(): IJobcard_CpSave {
    return {
      Code: '',
      EmpCode: '',
      PCCode_Act: '',
      PCCode: '',
      CompCode: '',
      JobCard_CpyDts: '',
      Remark: ''
    };
  }
}
