import { Component, OnInit, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { Router } from '@angular/router';

import { JobCardConopyReqInActiveService } from './job-card-conopy-req-in-active.service';

/** A single grid row (server data + client-side select/remark). */
interface ConopyReqRow {
  CPCode: string;
  Dt: string;
  kva: string;
  Model: string;
  PartDesc: string;
  partcode: string;
  Batch: string | number;
  // ---- client-side ----
  selected: boolean;
  InActiveRemark: string;
}

@Component({
  selector: 'app-job-card-conopy-req-in-active',
  standalone: false,
  templateUrl: './job-card-conopy-req-in-active.component.html',
  styleUrl: './job-card-conopy-req-in-active.component.scss'
})
export class JobCardConopyReqInActiveComponent implements OnInit {

  private readonly api = inject(JobCardConopyReqInActiveService);
  private readonly router = inject(Router);

  /** Drives the in-template loading overlay. */
  isLoading = false;

  today = '';
  isShowForm = true;

  // ---- Grid ----
  rows: ConopyReqRow[] = [];

  // ---- Result popup ----
  showResultPopup = false;
  resultTitle = '';
  resultMessage = '';
  resultOk = true;

  // ---- Current user (from localStorage) ----
  EmpCode = '';
  PC = '';
  PCName = '';
  PCOld = '';
  LoginType = '';
  LoginCompCode = '';

  constructor() {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    this.EmpCode       = (localStorage.getItem('employeeCode')     ?? '').trim();
    this.PC            = (localStorage.getItem('ProfitCenter')     ?? '').trim();
    this.PCName        = (localStorage.getItem('profitCenterName') ?? '').trim();
    this.LoginType     = (localStorage.getItem('loginType')        ?? '').trim();
    this.LoginCompCode = (localStorage.getItem('companyId')        ?? '').trim();
    this.PCOld         = (localStorage.getItem('ProfitCenter_old') ?? '').trim();
  }

  ngOnInit(): void {
    if (!this.isShowForm) {
      this.router.navigate(['/']);
      return;
    }
    this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
  }

  /** Company code = first segment of the PC (e.g. "01.134" -> "01"), like the legacy page. */
  private get companyCode(): string {
    return (this.PC || '').split('.')[0] || this.LoginCompCode;
  }

  get selectedCount(): number {
    return this.rows.filter(r => r.selected).length;
  }

  // ============ Search ============

  onSearch(): void {
    this.isLoading = true;
    this.api.GetConopyHold(this.companyCode).subscribe({
      next: (data: any[]) => {
        this.rows = (data ?? []).map((d: any) => ({
          ...d,
          selected: false,
          InActiveRemark: ''
        }));
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  // ============ Hold (inactivate) ============

  onHold(): void {
    const selected = this.rows.filter(r => r.selected);

    if (selected.length === 0) {
      alert('Please select at least one checkbox..!');
      return;
    }

    // Every selected row needs an InActive Remark (legacy AuthRemark).
    const missing = selected.find(r => !r.InActiveRemark?.trim());
    if (missing) {
      alert(`Please Fill Remark For CPCode ${missing.CPCode} !`);
      return;
    }

    const payload = {
      EmpCode: this.EmpCode,
      CompCode: this.LoginCompCode,
      PCCode: this.PC,
      details: selected.map(r => ({
        CPCode: r.CPCode,
        Partcode: r.partcode,
        InActiveRemark: r.InActiveRemark.trim()
      }))
    };

    this.isLoading = true;
    this.api.HoldConopyReq(payload).subscribe({
      next: (response: string) => {
        this.isLoading = false;
        const message = (response ?? '').trim();
        this.openResultPopup(message, !this.isFailureMessage(message));
      },
      error: (error) => {
        this.isLoading = false;
        console.error('API Error:', error);
        const apiMessage =
          (typeof error?.error === 'string' && error.error.trim()) ||
          error?.message ||
          'Something went wrong. Please try again.';
        this.openResultPopup(apiMessage, /*ok*/ false);
      }
    });
  }

  // ============ Result popup ============

  private isFailureMessage(message: string): boolean {
    if (!message) return false;
    const lower = message.toLowerCase();
    const failureSignals = [
      'insufficient', 'not enough', 'error', 'failed', 'fail',
      'invalid', 'cannot', "can't", 'unable', 'missing', 'duplicate',
      'already', 'not found', 'denied'
    ];
    return failureSignals.some(p => lower.includes(p));
  }

  private openResultPopup(message: string, ok: boolean): void {
    this.resultOk = ok;
    this.resultTitle = ok ? 'Record Hold Successfully' : 'Hold Failed';
    this.resultMessage = message || (ok ? 'Record Hold Successfully' : 'Operation failed.');
    this.showResultPopup = true;
  }

  /** Closes the popup and reloads the list (on success). */
  closeResultPopup(): void {
    this.showResultPopup = false;
    if (this.resultOk) {
      this.onSearch();
    }
  }
}
