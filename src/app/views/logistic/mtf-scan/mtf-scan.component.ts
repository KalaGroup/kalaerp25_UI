import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  LogisticService,
  PCNameForMTFScanDTO,
  MTFCodeAndMTFNoDTO,
  PartDescDTO,
} from '../logistic.service';
import { BarcodeFormat } from '@zxing/browser';

interface MTFSerialNoDtl {
  Partcode: string;
  SerialNo: string;
}

interface MTFScanSubmitRequest {
  MtfCode: string;
  MTFSerialNoDts: MTFSerialNoDtl[];
}

// Interface for MTF Serial Number Details
interface MTFSrNoDtsDTO {
  PartDesc: string;
  PartCode: string;
  UName: string;
  CatId: string;
  Catname: string;
  SerialNo: string;
  scanStatus?: 'pending' | 'done' | 'error';
}

@Component({
    selector: 'app-service-site-visit',
    templateUrl: './mtf-scan.component.html',
    styleUrl: './mtf-scan.component.scss',
    standalone: false
})
export class MtfScanComponent {
  profitcenter: string = '';
  toPCName: string = '';
  mtfNo: string = '';
  kitPartDesc: string = '';
  mtfQty: number = 0;
  pcNameOptions: PCNameForMTFScanDTO[] = [];
  mtfNoOptions: MTFCodeAndMTFNoDTO[] = [];

  // Array to hold part details for cards
  partDetailsList: MTFSrNoDtsDTO[] = [];
  showPartDetails: boolean = false;

  // QR Scanner properties
  showQrScanner: boolean = false;
  allowedFormats = [BarcodeFormat.QR_CODE];
  currentScanningCard: MTFSrNoDtsDTO | null = null;
  currentScanningIndex: number = -1;

  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  constructor(private logisticService: LogisticService) {}

  ngOnInit(): void {
    const pccode = localStorage.getItem('ProfitCenter');
    if (pccode) {
      this.profitcenter = pccode;
    }
    this.loadPCNames(this.profitcenter);
  }

  onBack(): void {
    console.log('Back clicked');
  }

  onSave(): void {
    if (this.isSaveDisabled()) {
      this.warningMessage = 'Cannot submit. Please ensure all parts are scanned successfully.';
      return;
    }
    // Prepare the payload
    const payload: MTFScanSubmitRequest = {
      MtfCode: this.mtfNo,
      MTFSerialNoDts: this.partDetailsList.map((part) => ({
        Partcode: part.PartCode,
        SerialNo: part.SerialNo,
      })),
    };
    console.log('Submitting payload:', payload);

    // Call the API
    this.logisticService.submitMTFScanDetails(payload).subscribe({
      next: (response) => {
        console.log('Submit Success:', response);
        this.successMessage = `MTF Scan details submitted successfully for MTF No: ${this.mtfNo}`;
        // Reset form after successful submission
        // this.resetForm();
      },
      error: (err) => {
        console.error('Submit Error:', err);
        this.errorMessage = 'Error submitting MTF Scan details. Please try again.';
      },
    });
  }

   // ✅ NEW - Reset Form Method
  resetForm(): void {
    this.toPCName = '';
    this.mtfNo = '';
    this.kitPartDesc = '';
    this.mtfQty = 0;
    this.mtfNoOptions = [];
    this.partDetailsList = [];
    this.showPartDetails = false;
  }

   clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
  }

  // Update the searchPartDetails method with better validation messages
  searchPartDetails(): void {
    this.logisticService.getMTFSrNoDtl(this.mtfNo).subscribe({
      next: (data: MTFSrNoDtsDTO[]) => {
        if (data && data.length > 0) {
          this.partDetailsList = data.map((part) => ({
            ...part,
            scanStatus: 'pending',
          }));
          this.showPartDetails = true;
        } else {
          this.partDetailsList = [];
          this.showPartDetails = false;
          this.warningMessage = 'No part details found for the selected MTF No.';
        }
      },
      error: (err) => {
        console.error('Error loading Part Details:', err);
       this.errorMessage = 'Error loading part details. Please try again.';
      },
    });
  }

  loadPCNames(PCCode: string): void {
    this.logisticService.getPCNameList(PCCode, 'MTFScan').subscribe({
      next: (data) => {
        this.pcNameOptions = data;
      },
      error: (err) => {
        console.error('Error loading PC Names:', err);
      },
    });
  }

  onPCNameChange(): void {
    this.mtfNoOptions = [];
    this.mtfNo = '';
    this.kitPartDesc = '';
    this.mtfQty = 0;
    this.partDetailsList = [];
    this.showPartDetails = false;

    if (this.toPCName && this.profitcenter) {
      this.loadMTFCode(this.profitcenter, this.toPCName);
    }
  }

  loadMTFCode(FPCCode: string, TPCCode: string): void {
    this.logisticService.getMTFCodeList(FPCCode, TPCCode).subscribe({
      next: (data) => {
        this.mtfNoOptions = data;
      },
      error: (err) => {
        console.error('Error loading MTF Numbers:', err);
      },
    });
  }

  onMTFNoChange(): void {
    this.kitPartDesc = '';
    this.mtfQty = 0;
    this.partDetailsList = [];
    this.showPartDetails = false;

    if (this.mtfNo) {
      this.loadPartDescription(this.mtfNo);
    }
  }

  loadPartDescription(mtfNo: string): void {
    this.logisticService.getPartDesc(mtfNo).subscribe({
      next: (data: PartDescDTO[]) => {
        if (data && data.length > 0) {
          this.kitPartDesc = data[0].KitPartDesc;
          this.mtfQty = data[0].MTFQty;
        }
      },
      error: (err) => {
        console.error('Error loading Part Description:', err);
      },
    });
  }

  // QR Scanner Methods
  openQrScanner(part: MTFSrNoDtsDTO, index: number): void {
    this.currentScanningCard = part;
    this.currentScanningIndex = index;
    this.showQrScanner = true;
  }

  closeQrScanner(): void {
    this.showQrScanner = false;
    this.currentScanningCard = null;
    this.currentScanningIndex = -1;
  }

  handleQrCodeResult(result: string): void {
    if (this.currentScanningCard && this.currentScanningIndex >= 0) {
      // Match scanned result with SerialNo
      if (result === this.currentScanningCard.SerialNo) {
        // Mark as done
        (this.partDetailsList[this.currentScanningIndex] as any).scanStatus =
          'done';
        this.closeQrScanner();
      } else {
        // Show error - serial number doesn't match
        // alert(
        //   `Serial Number does not match!\nExpected: ${this.currentScanningCard.SerialNo}\nScanned: ${result}`
        // );
        // (this.partDetailsList[this.currentScanningIndex] as any).scanStatus =
        //   'error';
        this.errorMessage = `Serial Number does not match!\nExpected: ${this.currentScanningCard.SerialNo}\nScanned: ${result}`;

        (this.partDetailsList[this.currentScanningIndex] as any).scanStatus =
          'error';

          this.closeQrScanner();
      }
    }
  }

  // Helper method to get category icon based on category name
  getCategoryIcon(catname: string): string {
    const category = catname?.toLowerCase() || '';
    if (category.includes('battery')) return 'battery_charging_full';
    if (category.includes('canopy')) return 'roofing';
    if (category.includes('alternator')) return 'settings_input_component';
    if (category.includes('engine')) return 'precision_manufacturing';
    return 'category';
  }

  // Helper method to get category color
  getCategoryColor(catname: string): string {
    const category = catname?.toLowerCase() || '';
    if (category.includes('battery')) return '#4CAF50';
    if (category.includes('canopy')) return '#2196F3';
    if (category.includes('alternator')) return '#FF9800';
    if (category.includes('engine')) return '#9C27B0';
    return '#607D8B';
  }

  // Add this method to check if search button should be disabled
  isSearchDisabled(): boolean {
    // All required fields must be filled
    return !this.toPCName || !this.mtfNo;
  }

  // Add this method to your component
  isSaveDisabled(): boolean {
    // If no parts to scan, disable save
    if (this.partDetailsList.length === 0) {
      return true;
    }

    // Check if all parts have been scanned successfully
    return !this.partDetailsList.every((part) => part.scanStatus === 'done');
  }
}
