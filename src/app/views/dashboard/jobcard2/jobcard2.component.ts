import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { Jobcard2Service } from './jobcard2.service';

@Component({
  selector: 'app-jobcard2',
  standalone: false,
  templateUrl: './jobcard2.component.html',
  styleUrls: ['./jobcard2.component.scss']
})
export class Jobcard2Component implements OnInit {
  today: string = '';
  pcCode_act: string = '';
  pcCode_old: string = '';
  pcDisplay: string = '';
  compCode: string = '';
  jobCardCode: string = '';
  remarkText: string = '';

  dataSource: any[] = [];
  panelTypeOptions: { PanelTypeName: string; PanelTypeCode: string }[] = [];
  isLoading: boolean = false;
  isSubmitting: boolean = false;

  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  displayedColumns = [
    { key: 'SrNo', label: 'Sr' },
    { key: 'jobcard2Qty', label: 'Qty' },
    { key: 'Stage3Qty', label: 'St3 Qty' },
    { key: 'JobCard1Qty', label: 'JC1 Qty' },
    { key: 'KVA', label: 'KVA' },
    { key: 'Phase', label: 'Phase' },
    { key: 'Model', label: 'Model' },
    { key: 'DGPanel', label: 'DG Panel' },
    { key: 'PanelType', label: 'Panel Type' },
    { key: 'DGStk', label: 'CPStk(DG)' },
    { key: 'CPStk', label: 'CPStk(CP)' },
    { key: 'PartCode', label: 'Part Code' },
    { key: 'BOMCode', label: 'BOM Code' },
  ];

  constructor(private jobcard2Service: Jobcard2Service) {}

  ngOnInit(): void {
    this.compCode = localStorage.getItem('companyId')?.trim() ?? '';
    this.pcCode_act = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    this.pcCode_old = localStorage.getItem('ProfitCenter_old')?.trim() ?? '';
    const pcName = localStorage.getItem('profitCenterName')?.trim() ?? '';
    this.pcDisplay = pcName && this.pcCode_old ? `${pcName} --> ${this.pcCode_old}` : pcName || this.pcCode_old;
    this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
    this.loadPanelTypes();
  }

  loadPanelTypes(): void {
    this.jobcard2Service.getCPDetails().subscribe({
      next: (res: any[]) => {
        this.panelTypeOptions = (res ?? []).map(opt => ({
          PanelTypeName: (opt.PanelTypeName || '').trim(),
          PanelTypeCode: (opt.PanelTypeCode || '').trim(),
        }));
      },
      error: (err: any) => {
        console.error('Error fetching panel types:', err);
      }
    });
  }

  onSearch(): void {
    this.isLoading = true;
    this.dataSource = [];
    this.clearMessages();

    this.jobcard2Service.getJobCard2Data(this.compCode, this.pcCode_act).subscribe({
      next: (res: any[]) => {
        this.dataSource = (res ?? []).map(row => ({ ...row, PanelType: row.PanelType || '0' }));
        this.isLoading = false;
        if (this.dataSource.length === 0) {
          this.warningMessage = 'No records found.';
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to fetch data. Please try again.';
        console.error('Error fetching data:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.dataSource.length === 0) {
      this.warningMessage = 'Please search for model details first.';
      return;
    }

    const selectedRows = this.dataSource
      .filter(row => Number(row.jobcard2Qty) > 0)
      .map(row => ({
        BOMCode: row.BOMCode ?? null,
        CPStk: row.CPStk != null ? Number(row.CPStk) : null,
        DGPanel: row.DGPanel ?? null,
        DGStk: row.DGStk != null ? Number(row.DGStk) : null,
        JobCard1Qty: row.JobCard1Qty != null ? Number(row.JobCard1Qty) : null,
        KVA: row.KVA != null ? Number(row.KVA) : null,
        Model: row.Model ?? null,
        PanelType: row.PanelType && row.PanelType !== '' ? row.PanelType : 'None',
        PartCode: row.PartCode ?? null,
        Phase: row.Phase != null ? String(row.Phase) : null,
        Stage3Qty: row.Stage3Qty != null ? Number(row.Stage3Qty) : null,
        Jobcard2Qty: String(row.jobcard2Qty),
      }));

    if (selectedRows.length === 0) {
      this.warningMessage = 'Please enter quantity for at least one model.';
      return;
    }

    const payload = {
      PCCode: this.pcCode_old,
      PCCode_Act: this.pcCode_act,
      Remark: this.remarkText,
      JobCard2Dts: selectedRows,
    };

    this.isSubmitting = true;
    this.clearMessages();

    this.jobcard2Service.submitJobcard2Details(payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        const msg = response.Message || '';
        const warningPrefixes = [
          'Insufficient Stock For Part',
          'Panel Not Selected For DG',
          'JobCard1(Without Panel) Not available For DG',
          'Engine SrNo Not available For DG',
          'Alternator SrNo Not available For DG',
          'Battery SrNo Not available For DG',
          'Canopy SrNo Not available For DG',
          'CP SrNo Not available For DG',
        ];
        if (warningPrefixes.some(p => msg.startsWith(p))) {
          this.warningMessage = msg;
        } else {
          this.successMessage = msg || 'JobCard submitted successfully.';
          this.remarkText = '';
          this.dataSource = [];
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error || 'Failed to submit data. Please try again.';
        console.error('Submit error:', err);
      }
    });
  }

  onPanelTypeChange(row: any): void {
    const selectedOption = this.panelTypeOptions.find(opt => opt.PanelTypeCode === row.PanelType);
    if (selectedOption && selectedOption.PanelTypeName.trim().toLowerCase() === 'none') {
      this.jobcard2Service.getCPStk(row.KVA, row.PartCode, 'None', this.compCode, this.pcCode_act).subscribe({
        next: (response: string) => {
          const cleaned = response.replace(/"/g, '').trim();
          const parts = cleaned.split('-->');
          if (parts.length === 2) {
            row.DGStk = parts[0].trim();
            row.CPStk = parts[1].trim();
          }
        },
        error: (err) => console.error('Error fetching CPStk:', err)
      });
    }
  }

  validateQty(row: any): void {
    const max = Number(row.Stage3Qty) || 0;
    let val = Number(row.jobcard2Qty) || 0;
    if (val < 0) val = 0;
    if (val > max) val = max;
    row.jobcard2Qty = val;
  }

  incrementQty(row: any): void {
    const max = Number(row.Stage3Qty) || 0;
    const current = Number(row.jobcard2Qty) || 0;
    if (current < max) {
      row.jobcard2Qty = current + 1;
    }
  }

  decrementQty(row: any): void {
    const current = Number(row.jobcard2Qty) || 0;
    if (current > 0) {
      row.jobcard2Qty = current - 1;
    }
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.warningMessage = '';
  }
}
