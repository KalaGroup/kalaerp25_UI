import { Component } from '@angular/core';
import { BarcodeFormat } from '@zxing/browser';
import { AccountService, InvoiceScanDts } from '../account.service';

@Component({
  selector: 'app-scan-invoice',
  standalone: false,
  templateUrl: './scan-invoice.component.html',
  styleUrls: ['./scan-invoice.component.scss']
})
export class ScanInvoiceComponent {

  showQrScanner: boolean = false;
  allowedFormats = [BarcodeFormat.QR_CODE];
  isLoading: boolean = false;

  invoiceData: InvoiceScanDts | null = null;

  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  constructor(private accountService: AccountService) {}

  onScanClick(): void {
    this.showQrScanner = !this.showQrScanner;
    this.clearMessages();
  }

  handleQrCodeResult(result: string): void {
    this.showQrScanner = false;
    this.clearMessages();

    if (!result || result.trim() === '') {
      this.warningMessage = 'Empty QR code scanned. Please try again.';
      return;
    }

    this.isLoading = true;
    this.invoiceData = null;

    this.accountService.getInvoiceScanDts(result.trim()).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response && response.length > 0) {
          this.invoiceData = response[0];
          this.successMessage = 'Invoice scanned successfully!';
        } else {
          this.warningMessage = 'No invoice data found for the scanned QR code.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to fetch invoice details. Please try again.';
        console.error(err);
      }
    });
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.warningMessage = '';
  }
}
