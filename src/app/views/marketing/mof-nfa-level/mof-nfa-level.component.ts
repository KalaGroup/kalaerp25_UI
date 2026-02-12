import { Component, OnInit } from '@angular/core';
import { MarketingService, MOFAPIResponse } from '../marketing.service';
import { JwtAuthService } from 'app/shared/services/auth/jwt-auth.service';

export interface MOFData {
  mofNo: string;
  date: string;
  branch: string;
  branchNumber: string;
  kva: string;
  ph: string;
  model: string;
  panel: string;
  indentorName: string;
  customerName: string;
  orderedBy: string;
  // Additional fields for detail view
  orderTakenBy?: string;
  gia?: string;
  basicRate?: string;
  mktPLust?: string;
  actualAmt?: string;
  diff?: string;
  bomDg?: string;
  dgBomAmt?: string;
  cpBomAmt?: string;
  totalBomAmt?: string;
  nfaNo?: string;
  qty?: string;
  balQty?: string;
  koelAmt?: string;
  kalaAmt?: string;
  otherAmt?: string;
  mofRemark?: string;
  hodLevelRemark?: string;
  qiaLevelRemark?: string;
  nfaLevelRemark?: string;
}

@Component({
  selector: 'app-mof-nfa-level',
  templateUrl: './mof-nfa-level.component.html',
  styleUrl: './mof-nfa-level.component.scss',
})
export class MofNfaLevelComponent implements OnInit {
  mofList: MOFData[] = [];
  selectedMof: MOFData | null = null;
  showDetail: boolean = false;
  isLoading: boolean = false;
  userId: string = '';
  nfaRemark: string = '';
  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  constructor(
    private marketingService: MarketingService,
    private authservice: JwtAuthService
  ) {}

  ngOnInit(): void {
    this.loadMOFData();
    // this.authservice.credentials$.subscribe((credentials) => {
    //   if (credentials) {
    //     this.userId = credentials.userid;
    //     console.log('From MOF - NFA Level', this.userId);
    //   }
    // });
    debugger
    const storedUser = localStorage.getItem('EGRET_USER');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.EmpCode || '';
      console.log('From MOF - NFA Level', this.userId);
    }
  }

  loadMOFData(): void {
    this.isLoading = true;
    this.marketingService.getPendingMOFNFA().subscribe({
      next: (response: MOFAPIResponse[]) => {
        this.mofList = this.mapAPIResponseToMOFData(response);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading MOF data:', error);
        this.isLoading = false;
      },
    });
  }

  mapAPIResponseToMOFData(apiData: MOFAPIResponse[]): MOFData[] {
    return apiData.map((item) => ({
      mofNo: item.MOFCode,
      date: item.Mofdate,
      branch: item.PCName,
      branchNumber: item.PCCode,
      kva: item.KVA.toString(),
      ph: item.Phase,
      model: item.Model,
      panel: item.Panel,
      indentorName: item.IName,
      customerName: item.CCName,
      orderedBy: item.orderby,
      // Detail view fields
      orderTakenBy: item.orderby,
      gia: item.Model,
      basicRate: item.BasicPrice.toString(),
      mktPLust: item.MktPl.toString(),
      actualAmt: item.ActualPrice.toString(),
      diff: item.diff.toString(),
      bomDg: item.BOMCode,
      dgBomAmt: item.BOMPrice.toString(),
      cpBomAmt: item.CPBOMAmt.toString(),
      totalBomAmt: item.TotBOMAmt.toString(),
      nfaNo: item.NFANo,
      qty: item.Qty.toString(),
      balQty: item.NfaBalQty.toString(),
      koelAmt: item.NFAKoel.toString(),
      kalaAmt: item.NFAKala.toString(),
      otherAmt: item.NFAOther.toString(),
      mofRemark: item.Remark,
      hodLevelRemark: item.AuthRemark1,
      qiaLevelRemark: item.AuthRemark2,
      nfaLevelRemark: '',
    }));
  }

  goBack(): void {
    if (this.showDetail) {
      this.showDetail = false;
      this.selectedMof = null;
    } else {
      // Implement navigation logic
      console.log('Navigate back');
    }
  }

  refresh(): void {
    this.loadMOFData();
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
  }

  onCardClick(mof: MOFData): void {
    this.selectedMof = mof;
    this.showDetail = true;
    this.nfaRemark = '';
    console.log('Card clicked:', mof);
  }

  onHold(): void {
    if (!this.selectedMof) {
      this.warningMessage = 'No MOF selected, cannot hold.';
      return;
    }

     if (!this.nfaRemark || this.nfaRemark.trim() === '') {
      this.warningMessage = 'Please enter NFA Level Remark before holding.';
      return;
    }

    const payload = {
      MOFNo: this.selectedMof.mofNo,
      SaveType: 'Hold',
      UserID: this.userId,
      AuthRemark: this.nfaRemark,
    };

    this.marketingService.authorizeMOF(payload).subscribe({
      next: (response) => {
        this.successMessage = `MOF: ${this.selectedMof.mofNo} hold successfully.`;
        this.goBack();
        this.refresh();
      },
      error: (error) => {
        console.error('Error holding MOF:', error);
        this.errorMessage = `Error holding MOF: ${this.selectedMof.mofNo}. Please try again.`;
      },
    });
  }

  onAuth(): void {
    if (!this.selectedMof) {
      this.warningMessage = 'No MOF selected, cannot authorize.';
      return;
    }

    if (!this.nfaRemark || this.nfaRemark.trim() === '') {
      this.warningMessage = 'Please enter NFA Level Remark before authorizing.';
      return;
    }

    const payload = {
      MOFNo: this.selectedMof.mofNo,
      SaveType: 'Auth', // A for Auth
      UserID: this.userId,
      AuthRemark: this.nfaRemark,
    };

    this.marketingService.authorizeMOF(payload).subscribe({
      next: (response) => {
        console.log('Authorization successful:', response);
       this.successMessage = `MOF: ${this.selectedMof.mofNo} authorized successfully.`;
        this.goBack();
        this.refresh();
      },
      error: (error) => {
        console.error('Error authorizing MOF:', error);
        this.errorMessage = `Error authorizing MOF: ${this.selectedMof.mofNo}. Please try again.`;
      },
    });
  }
}
