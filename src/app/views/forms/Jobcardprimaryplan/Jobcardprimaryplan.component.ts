import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JobcardService } from '../jobcard.service';

@Component({
    selector: 'app-Jobcardprimaryplan',
    templateUrl: './Jobcardprimaryplan.component.html',
    styleUrl: './Jobcardprimaryplan.component.scss',
    standalone: false
})
export class JobcardPrimaryPlanComponent {
   // Inside your component.ts
displayedColumns = [
  { key: 'SrNo', label: 'SrNo.' },                     // Custom SrNo
  { key: 'Qty', label: 'Qty' },                        // From API: Qty
  { key: 'KVA', label: 'KVA' },                        // From API: KVA
  { key: 'Phase', label: 'Ph' },                       // From API: Phase
  { key: 'Model', label: 'Model' },                    // From API: Model
  { key: 'DGPanel', label: 'DGPanel' },                // From API: DGPanel
  { key: 'FNorm', label: 'FNorm' },                    // From API: FNorm
  { key: 'DStk', label: 'DStk' },                      // From API: DStk
  { key: 'PPlanQty', label: 'PPlanQty' },              // From API: PPlanQty
  { key: 'PlReq', label: 'PIReq' },                    // API key: PlReq → shown as PIReq
  { key: 'Eng', label: 'EngDG' },                      // API key: Eng → shown as EngDG
  { key: 'Alt', label: 'AltDgG' },                     // API key: Alt → AltDgG
  { key: 'Cpy', label: 'CpyDG' },                      // API key: Cpy → CpyDG
  { key: 'CpyLog', label: 'CPYU1' },                    // API key: CpyU1
  { key: 'Bat', label: 'BatDG' },                      // API key: Bat → BatDG
  { key: 'BatLog', label: 'BatLog' },                  // API key: BatLog
  { key: 'BOMCode', label: 'BOMCode' },                // API key: BOMCode
  { key: 'PartCode', label: 'PartCode' },              // API key: PartCode
  { key: 'PartDesc', label: 'PartDesc' },              // API key: PartDesc
];

   currentDate: Date = new Date();
  dataSource: any[] = [];
  remarkText: string = '';
  companyId: string = '';
  profitCenterId: string = '';

  constructor(private http: HttpClient, private jobcardService: JobcardService) {}

  ngOnInit(): void {
     const companyId = localStorage.getItem('companyId');
     const pccode = localStorage.getItem('ProfitCenter');
      this.companyId = companyId ? companyId : '';
      this.profitCenterId = pccode ? pccode : '';
      console.log("Company ID:", this.companyId);
      console.log("Profit Center ID:", this.profitCenterId);

  }

  search(): void{
     this.fetchJobCardData();
  }

  fetchJobCardData(): void {
    const strJobCardType = 'DGWOP';
    const strcompID = '01';

    this.jobcardService.getJobCardDGDetails(strJobCardType, strcompID).subscribe({
      next: (res) => {
        this.dataSource = res;
        console.log("Jobcard Primary Plan",res);
      },
      error: (err) => {
        console.error('Error fetching data:', err);
      }
    });
  }

  submit(): void {
  const selectedRows = this.dataSource
    .filter(row => row.Qty > 0)
    .map(row => {
      const formattedRow: { [key: string]: any } = {};
      this.displayedColumns.forEach(col => {
        const key = typeof col === 'string' ? col : col.key; // Support both array formats
        formattedRow[key] = row[key] ?? 'N/A'; // Fallback if key missing
      });
      return formattedRow;
    });

  if (selectedRows.length === 0) {
    alert('Please Enter Quantity For At Least 1 Record');
    return;
  }

  console.log('Formatted Rows:', selectedRows);

  // Optionally send to backend
  // this.http.post('your-api-endpoint', selectedRows).subscribe(...)

  this.remarkText = '';
}

}
