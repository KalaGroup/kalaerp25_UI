import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { formatDate } from '@angular/common';
import {
  Jobcard1Service,
  JobCardDtsRow,
  JobCardSubmitRequest
} from './jobcard1.service';

@Component({
  selector: 'app-jobcard1',
  standalone: false,
  templateUrl: './jobcard1.component.html',
  styleUrl: './jobcard1.component.scss'
})
export class Jobcard1Component implements OnInit {

  // ── State ──────────────────────────────────────────────────────
  today:          string          = '';
  pcDisplay:      string          = '';
  pcCode:         string          = '';
  compCode:       string          = '';
  empCode:        string          = '';
  jobCardList:    JobCardDtsRow[] = [];
  isLoading:      boolean         = false;
  isSubmitting:   boolean         = false;
  showPlanCode:   boolean         = false;
  successMessage: string          = '';
  errorMessage:   string          = '';
  warningMessage: string          = '';

  constructor(
    private jobcardService: Jobcard1Service,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Read from localStorage — set during login
    this.compCode = localStorage.getItem('companyId')?.trim() ?? '';
    this.empCode  = localStorage.getItem('employeeCode')?.trim() ?? '';
    this.today    = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
    this.setPCByCompany();
  }

  // ── Set profit center label and code from logged-in employee ──
  private setPCByCompany(): void {
    this.pcCode    = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    const pcName   = localStorage.getItem('profitCenterName')?.trim() ?? '';
    this.pcDisplay = pcName && this.pcCode ? `${pcName} --> ${this.pcCode}` : pcName || this.pcCode;
  }

  // ── Search ────────────────────────────────────────────────────
  onSearch(): void {
    if (!this.compCode) {
      this.warningMessage = 'Company code not found. Please login again.';
      return;
    }

    this.isLoading   = true;
    this.jobCardList = [];
    this.clearMessages();

    this.jobcardService.getJobCardDetails(this.compCode).subscribe({
      next: (data) => {
        this.jobCardList = data ?? [];
        this.isLoading   = false;
        if (this.jobCardList.length === 0)
          this.warningMessage = 'No records found for the selected profit center.';
      },
      error: (err) => {
        this.isLoading    = false;
        this.errorMessage = 'Failed to fetch job card details. Please try again.';
        console.error(err);
      }
    });
  }

  // ── Submit ────────────────────────────────────────────────────
  onSubmit(form: NgForm): void {
    if (!form.valid) return;

    if (!this.jobCardList || this.jobCardList.length === 0) {
      this.warningMessage = 'Please search for job card details first.';
      return;
    }

    // Validate each row — Qty must not exceed PenPQty
    for (const row of this.jobCardList) {
      if (row.Qty > 0 && row.PenPQty != null && row.Qty > row.PenPQty) {
        this.warningMessage =
          `Qty cannot exceed Pending Qty (${row.PenPQty}) for Part: ${row.PartCode}`;
        return;
      }
    }

    // Only submit rows where user has entered Qty > 0
    const selectedRows = this.jobCardList.filter(r => r.Qty > 0);
    if (selectedRows.length === 0) {
      this.warningMessage = 'Please enter quantity for at least one row.';
      return;
    }

    const request: JobCardSubmitRequest = {
      pcCode:  this.pcCode,
      remark:  form.value.remark?.trim() ?? '',
      empCode: this.empCode,
      rows:    selectedRows
    };

    console.log('Submitting Job Card with request:', request);

    this.isSubmitting = true;
    this.clearMessages();

    this.jobcardService.submitJobCard(request).subscribe({
      next: (response) => {
        this.isSubmitting   = false;
        this.successMessage = response ?? 'Job Card created successfully.';
        this.jobCardList    = [];
        form.resetForm();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = 'Failed to submit job card. Please try again.';
        console.error(err);
      }
    });
  }

  // ── Row background based on stock and today flag ───────────────
  getRowBackground(row: JobCardDtsRow): string {
    if (row.TodayFlag === 'TODAY') return '#fff8e1';
    const hasAllStock =
      Number(row.Eng) > 0 &&
      Number(row.Alt) > 0 &&
      Number(row.Bat) > 0 &&
      Number(row.Cpy) > 0;
    return hasAllStock ? '' : '#fff9f9';
  }

  // ── Cap qty at PenPQty on input change ────────────────────────
  onQtyChange(row: JobCardDtsRow): void {
    if (row.PenPQty != null && row.Qty > row.PenPQty) {
      row.Qty = row.PenPQty;
    }
  }

  // ── Clear all alert messages ───────────────────────────────────
  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage   = '';
    this.warningMessage = '';
  }
}
