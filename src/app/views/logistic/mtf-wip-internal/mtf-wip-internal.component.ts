import { Component, OnInit } from '@angular/core';
import {
  LogisticService,
  PCNameForMTFScanDTO,
  ReqCodeForMTFDTO,
  PartDescDTO,
  ReqDetailsForMTFDTO,
  SubmitMTFWipInternalRequest,
} from '../logistic.service';

@Component({
  selector: 'app-mtf-wip-internal',
  standalone: false,
  templateUrl: './mtf-wip-internal.component.html',
  styleUrl: './mtf-wip-internal.component.scss'
})
export class MtfWipInternalComponent implements OnInit {

  // Header/top row
  mtfNo: string = '';
  mtfDate: string = '';
  readonly fromPCCode: string = '23.001'; // TODO: derive from logged-in user context
  fromPC: string = `Logistics-->${this.fromPCCode}`;
  toPC: string = '';
  toPCOptions: PCNameForMTFScanDTO[] = [];

  // Requisition row
  requisitionNo: string = '';
  requisitionOptions: ReqCodeForMTFDTO[] = [];
  dgCpyCpPartDesc: string = '-';
  kitPartCode: string = ''; // KitPartCode captured for later part-detail calls
  bomCode: string = '';     // BOMCode captured from requisition for later use

  // Qty row
  reqQty: number = 0;
  reqBalQty: number = 0;
  mtfQty: number | null = null;

  // Part details
  partDetails: ReqDetailsForMTFDTO[] = [];
  isSearching: boolean = false;
  isSubmitting: boolean = false;
  successMessage: string = '';

  // Remark
  remark: string = '';

  // Feedback
  errorMessage: string = '';

  constructor(private logisticService: LogisticService) {}

  ngOnInit(): void {
    this.mtfDate = this.formatDateTime(new Date());
    this.loadToPCOptions();
  }

  loadToPCOptions(): void {
    this.logisticService.getPCNameList(this.fromPCCode, 'MTF').subscribe({
      next: (data) => {
        this.toPCOptions = data ?? [];
      },
      error: (err) => {
        console.error('Error loading To PC list:', err);
        this.errorMessage = 'Failed to load To PC list.';
      },
    });
  }

  onToPCChange(): void {
    // Reset dependent fields when To PC changes
    this.requisitionNo = '';
    this.requisitionOptions = [];
    this.resetRequisitionDetails();

    if (!this.toPC) return;

    this.loadRequisitionOptions();
  }

  onRequisitionChange(): void {
    this.resetRequisitionDetails();

    if (!this.requisitionNo) return;

    this.loadPartDesc();
  }

  private resetRequisitionDetails(): void {
    this.dgCpyCpPartDesc = '-';
    this.kitPartCode = '';
    this.bomCode = '';
    this.reqQty = 0;
    this.reqBalQty = 0;
    this.mtfQty = null;
    this.partDetails = [];
  }

  loadPartDesc(): void {
    this.logisticService.getPartDesc(this.requisitionNo).subscribe({
      next: (data: PartDescDTO[]) => {
        const item = data?.[0];
        if (item) {
          this.dgCpyCpPartDesc = item.KitPartDesc ?? '-';
          this.kitPartCode = item.KitPartCode ?? '';
          this.bomCode = item.BOMCode ?? '';
          this.reqQty = item.ReqQty ?? 0;
          this.reqBalQty = item.BalReqQty ?? 0;
          this.mtfQty = item.MTFQty ?? 0;
        } else {
          this.resetRequisitionDetails();
        }
      },
      error: (err) => {
        console.error('Error loading Part Desc:', err);
        this.errorMessage = 'Failed to load Part Description.';
      },
    });
  }

  loadRequisitionOptions(): void {
    const TPCCode = this.toPC;
    const FPCCode = this.fromPCCode;

    this.logisticService.getReqCodeForMTF(TPCCode, FPCCode).subscribe({
      next: (data) => {
        // Drop the backend's "---Select---" sentinel row (ReqNo === '0')
        this.requisitionOptions = (data ?? []).filter(
          (r) => r.ReqNo && r.ReqNo !== '0'
        );
      },
      error: (err) => {
        console.error('Error loading Requisition list:', err);
        this.errorMessage = 'Failed to load Requisition list.';
      },
    });
  }

  formatDateTime(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    let hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${dd}-${mm}-${yyyy} ${String(hours).padStart(2, '0')}:${mins}:${secs} ${ampm}`;
  }

  onSearch(): void {
    if (!this.canSearch) {
      this.errorMessage = 'Please select To PC, Requisition, and enter a non-zero MTF Qty before searching.';
      return;
    }

    this.partDetails = [];
    this.isSearching = true;

    const payload = {
      PCCode: this.fromPCCode,
      StrBomCode: this.bomCode,
      StrReqCode: this.requisitionNo,
      StrReqQty: Number(this.reqQty) || 0,
      StrMTFQty: Number(this.mtfQty) || 0,
    };

    this.logisticService.getReqDetails(payload).subscribe({
      next: (data) => {
        this.partDetails = data ?? [];
        this.isSearching = false;
      },
      error: (err) => {
        console.error('Error loading part details:', err);
        this.errorMessage = err?.error?.message || 'Failed to load part details.';
        this.isSearching = false;
      },
    });
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.mtfQty != null && this.reqBalQty != null && Number(this.mtfQty) > Number(this.reqBalQty)) {
      this.errorMessage = 'MTF Qty should be less than or equal to MTF Balance Qty';
      return;
    }

    if (this.partDetails.length === 0) {
      this.errorMessage = 'No part details. Please click Search first.';
      return;
    }

    // Build MTFDetails string: PartCode-->MtfQty-->Rate-->StockQty,...
    const mtfDetailsStr = this.partDetails
      .map(p => `${p.PartCode}-->${p.MTFQty}-->${p.Rate}-->${p.Stk}`)
      .join(',');

    const payload: SubmitMTFWipInternalRequest = {
      FromPCCode:   this.fromPCCode,
      ToPCCode:     this.toPC,
      ReqCode:      this.requisitionNo,
      ProdPartCode: this.kitPartCode,
      ReqBalQty:    Number(this.reqBalQty) || 0,
      MTFQty:       Number(this.mtfQty)    || 0,
      MTFDetails:   mtfDetailsStr,
      Remark:       this.remark || '',
      UserID:       localStorage.getItem('employeeCode')?.trim() || '',
      CompID:       localStorage.getItem('companyId')?.trim()    || '',
    };

    this.isSubmitting = true;

    this.logisticService.submitMTFWipInternal(payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        const trimmed = (response || '').trim();
        // Backend returns the MTFCode on success (format "MTF/YY-YY/CC######")
        // or a validation/error message string otherwise.
        if (trimmed.startsWith('MTF/')) {
          this.successMessage = `MTF created successfully: ${trimmed}`;
          this.resetAfterSubmit();
        } else {
          this.errorMessage = trimmed || 'Submission failed.';
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error submitting MTF:', err);
        this.errorMessage = err?.error?.message || err?.error || 'Failed to submit MTF.';
      },
    });
  }

  private resetAfterSubmit(): void {
    this.partDetails = [];
    this.remark = '';
    // Refresh the requisition list — the just-completed one may now be marked done
    if (this.toPC) this.loadRequisitionOptions();
    this.requisitionNo = '';
    this.dgCpyCpPartDesc = '-';
    this.kitPartCode = '';
    this.bomCode = '';
    this.reqQty = 0;
    this.reqBalQty = 0;
    this.mtfQty = null;
  }

  clearError(): void {
    this.errorMessage = '';
  }

  clearSuccess(): void {
    this.successMessage = '';
  }

  get canSearch(): boolean {
    return (
      !!this.toPC &&
      !!this.requisitionNo &&
      !!this.bomCode &&
      !!this.reqQty && this.reqQty > 0 &&
      this.mtfQty != null && Number(this.mtfQty) > 0 &&
      !this.isSearching
    );
  }

  get canSubmit(): boolean {
    return (
      !!this.toPC &&
      !!this.requisitionNo &&
      this.mtfQty != null && Number(this.mtfQty) > 0 &&
      this.partDetails.length > 0 &&
      !this.isSubmitting
    );
  }
}
