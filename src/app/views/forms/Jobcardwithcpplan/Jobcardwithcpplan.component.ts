import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JobcardService } from '../jobcard.service';

@Component({
    selector: 'app-Jobcardwithcpplan',
    templateUrl: './Jobcardwithcpplan.component.html',
    styleUrl: './Jobcardwithcpplan.component.scss',
    standalone: false
})
export class JobcardWithCPPlanComponent {
  warningMessage: string = '';
  successMessage: string = '';
  errorMessage: string = '';

  displayedColumns = [
    { key: 'SrNo', label: 'SrNo.' },
    { key: 'jobcard2Qty', label: 'Qty' },
    { key: 'Stage3Qty', label: 'St3Qty' },
    { key: 'JobCard1Qty', label: 'JC1Qty' },
    { key: 'KVA', label: 'KVA' },
    { key: 'Phase', label: 'Ph' },
    { key: 'Model', label: 'Model' },
    { key: 'DGPanel', label: 'DGPanel' },
    { key: 'PanelType', label: 'PanelType' },
    { key: 'DGStk', label: 'CPStk(DG)' },
    { key: 'CPStk', label: 'CPStk(CP)' },
    { key: 'PartCode', label: 'PartCode' },
    { key: 'BOMCode', label: 'BOMCode' },
  ];
  currentDate: Date = new Date();
  dataSource: any[] = [];
  remarkText: string = '';
  constructor(
    private http: HttpClient,
    private jobcardService: JobcardService
  ) {}

  ngOnInit(): void {}

  search(): void {
    this.fetchJobCardData();
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
  }

  fetchJobCardData(): void {
    const strJobCardType = 'DGWIP';
    const strcompID = '03';

    this.jobcardService
      .getJobCardDGDetails(strJobCardType, strcompID)
      .subscribe({
        next: (res) => {
          this.dataSource = res;
          console.log('Jobcard Primary Plan', res);
        },
        error: (err) => {
          console.error('Error fetching data:', err);
        },
      });
  }

  submit(): void {
    const selectedRows = this.dataSource
      .filter((row) => Number(row.jobcard2Qty) > 0)
      .map((row) => {
        const formattedRow: { [key: string]: any } = {};
        this.displayedColumns.forEach((col) => {
          const key = typeof col === 'string' ? col : col.key;
          if (key === 'SrNo') {
            return;
          }
          // 👇 Inject default "None" for PanelType
          if (key === 'PanelType' && (row[key] == null || row[key] === '')) {
            formattedRow[key] = 'None';
          } else {
            formattedRow[key] = row[key] ?? 'N/A';
          }
        });
        return formattedRow;
      });

    console.log('selected rows', selectedRows);

    if (this.dataSource.length === 0) {
      alert('Please Search for Model Details and then try..!');
    }

    if (selectedRows.length === 0) {
      alert('Add Quantity for at least one Model..!');
      return;
    }

    console.log('Formatted Rows:', selectedRows);

    const finalPayload = {
      PCCode: '01.004',
      Remark: this.remarkText,
      JobCard2Dts: selectedRows,
    };

    console.log('Final Payload: ', finalPayload);

    this.jobcardService.submitJobcard2Details(finalPayload).subscribe({
      next: (response) => {
        if (
          response.Message.startsWith('Insufficient Stock For Part') ||
          response.Message.startsWith('Panel Not Selected For DG') ||
          response.Message.startsWith(
            'JobCard1(Without Panel) Not available For DG'
          ) ||
          response.Message.startsWith('Engine SrNo Not available For DG') ||
          response.Message.startsWith('Alternator SrNo Not available For DG') ||
          response.Message.startsWith('Battery SrNo Not available For DG') ||
          response.Message.startsWith('Canopy SrNo Not available For DG') ||
          response.Message.startsWith('CP SrNo Not available For DG')
        ) {
          this.warningMessage = response.Message;
        } else {
          this.successMessage = response.Message;
        }
        console.log('Jobcard submission success:', response);
        alert('Data saved successfully!');
      },
      error: (error) => {
        this.errorMessage =
          error.error || 'Failed to submit data. Please try again.';
        console.error('Jobcard submission error:', error);
        alert('Error while saving jobcard data!');
      },
    });
    this.remarkText = '';
  }
}
