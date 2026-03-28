import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { Jobcard1Service, JobCard1CheckerRow, SixMItem, EmployeeItem, PlanDetailItem, CheckerSubmitRequest } from '../jobcard1/jobcard1.service';

interface CheckerRow {
  id: number;
  sixM: string;
  description: string;
  assignTo: string;
  selected: boolean;
}

@Component({
  selector: 'app-jobcard1-checker',
  standalone: false,
  templateUrl: './jobcard1-checker.component.html',
  styleUrls: ['./jobcard1-checker.component.scss']
})
export class Jobcard1CheckerComponent implements OnInit {

  today: string = '';
  pcCode: string = '';
  pcDisplay: string = '';
  compCode: string = '';

  shiftType: string = '';
  selectedJobCard: string = '';
  jobCardNumbers: string[] = [];
  isLoadingJobCards: boolean = false;

  checkerList: JobCard1CheckerRow[] = [];
  isLoading: boolean = false;

  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  // Modal state
  showModal: boolean = false;
  selectedJobCode: string = '';

  employees: EmployeeItem[] = [];
  sixMItems: SixMItem[] = [];
  checkerRows: CheckerRow[] = [];

  // Plan details
  showPlanDetails: boolean = false;
  selectedPlanJobCode: string = '';
  planDetailsList: PlanDetailItem[] = [];
  isLoadingPlan: boolean = false;

  // Searchable assign dropdown per row
  assignSearchText: string[] = [];
  assignDropdownOpen: number = -1;

  constructor(private jobcardService: Jobcard1Service) {}

  ngOnInit(): void {
    this.compCode = localStorage.getItem('companyId')?.trim() ?? '';
    this.pcCode = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    const pcName = localStorage.getItem('profitCenterName')?.trim() ?? '';
    this.pcDisplay = pcName && this.pcCode ? `${pcName} --> ${this.pcCode}` : pcName || this.pcCode;
    this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
    this.loadJobCardNumbers();
    this.loadSixMData();
    this.loadEmployees();
  }

  loadSixMData(): void {
    this.jobcardService.fetchSelect6MData().subscribe({
      next: (data) => { this.sixMItems = data ?? []; },
      error: (err) => { console.error('Failed to load 6M data:', err); }
    });
  }

  loadEmployees(): void {
    this.jobcardService.fetchEmployeeList().subscribe({
      next: (data) => {
        const noneOption: EmployeeItem = { ECode: '', EmployeeName: 'None' };
        this.employees = [noneOption, ...(data ?? [])];
      },
      error: (err) => { console.error('Failed to load employees:', err); }
    });
  }

  loadJobCardNumbers(): void {
    this.isLoadingJobCards = true;
    this.jobcardService.getJobCard1CheckerDetails().subscribe({
      next: (data) => {
        this.jobCardNumbers = data ?? [];
        this.isLoadingJobCards = false;
      },
      error: (err) => {
        this.isLoadingJobCards = false;
        console.error('Failed to load jobcard numbers:', err);
      }
    });
  }

  onSearch(): void {
    if (!this.selectedJobCard) {
      this.warningMessage = 'Please select a JobCard.';
      return;
    }

    this.isLoading = true;
    this.checkerList = [];
    this.closePlanDetails();
    this.clearMessages();

    this.jobcardService.getJobCard1CheckerDetailsByCode(this.selectedJobCard).subscribe({
      next: (data) => {
        this.checkerList = data ?? [];
        this.isLoading = false;
        if (this.checkerList.length === 0) {
          this.warningMessage = 'No details found for selected JobCard.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to fetch checker details.';
        console.error(err);
      }
    });
  }

  // Modal
  openCheckerModal(jobCode: string): void {
    this.selectedJobCode = jobCode;
    this.checkerRows = this.sixMItems.filter(item => item.Id > 0 && item.Name !== 'None').map(item => ({
      id: item.Id,
      sixM: item.Name,
      description: '',
      assignTo: '',
      selected: true
    }));
    this.assignSearchText = this.checkerRows.map(() => 'None');
    this.assignDropdownOpen = -1;
    this.modalErrorMessage = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedJobCode = '';
    this.checkerRows = [];
    this.assignSearchText = [];
    this.assignDropdownOpen = -1;
    this.modalErrorMessage = '';
  }

  filteredEmployees(index: number): EmployeeItem[] {
    const search = (this.assignSearchText[index] || '').toLowerCase();
    if (!search) return this.employees;
    return this.employees.filter(e =>
      e.EmployeeName.toLowerCase().includes(search) || e.ECode.includes(search)
    );
  }

  toggleAssignDropdown(index: number): void {
    this.assignDropdownOpen = this.assignDropdownOpen === index ? -1 : index;
  }

  selectEmployee(index: number, emp: EmployeeItem): void {
    this.checkerRows[index].assignTo = emp.ECode;
    this.assignSearchText[index] = emp.EmployeeName;
    this.assignDropdownOpen = -1;
  }

  clearAssign(index: number): void {
    this.checkerRows[index].assignTo = '';
    this.assignSearchText[index] = '';
  }

  get selectedCount(): number {
    return this.checkerRows.filter(r => r.selected).length;
  }

  get canAuth(): boolean {
    const selected = this.checkerRows.filter(r => r.selected);
    if (selected.length === 0) return false;
    return selected.every(r =>
      r.description.trim().toLowerCase() === 'ok' &&
      this.assignSearchText[this.checkerRows.indexOf(r)]?.toLowerCase() === 'none'
    );
  }

  get canReject(): boolean {
    return this.checkerRows.some((r, i) => {
      const text = (this.assignSearchText[i] || '').trim().toLowerCase();
      return r.selected && text !== '' && text !== 'none';
    });
  }

  isSubmitting: boolean = false;
  modalErrorMessage: string = '';

  onAuth(): void {
    const payload: CheckerSubmitRequest = {
      jobCode: this.selectedJobCode,
      status: 'Auth',
      details: this.checkerRows.map((row, i) => ({
        sixM: row.sixM,
        description: row.description,
        assignTo: row.assignTo,
        assignName: this.assignSearchText[i] || ''
      }))
    };
    this.submitChecker(payload);
  }

  onReject(): void {
    const payload: CheckerSubmitRequest = {
      jobCode: this.selectedJobCode,
      status: 'Reject',
      details: this.checkerRows.map((row, i) => ({
        sixM: row.sixM,
        description: row.description,
        assignTo: row.assignTo,
        assignName: this.assignSearchText[i] || '',
        selected: row.selected
      }))
    };
    this.submitChecker(payload);
  }

  private submitChecker(payload: CheckerSubmitRequest): void {
    console.log('submitChecker called with:', payload);
    this.isSubmitting = true;
    this.modalErrorMessage = '';
    this.jobcardService.submitJobcard1Checker(payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.closeModal();
        this.checkerList = [];
        this.selectedJobCard = '';
        this.closePlanDetails();
        this.loadJobCardNumbers();
        this.clearMessages();
        if (payload.status === 'Auth') {
          this.successMessage = response || `JobCode ${payload.jobCode} authorized successfully.`;
        } else {
          this.successMessage = response || `JobCode ${payload.jobCode} rejected successfully.`;
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.modalErrorMessage = 'Failed to submit. Please try again.';
        console.error(err);
      }
    });
  }

  onViewPlan(row: JobCard1CheckerRow): void {
    this.selectedPlanJobCode = row.JobCode;
    this.planDetailsList = [];
    this.isLoadingPlan = true;
    this.showPlanDetails = true;

    this.jobcardService.getPlanDetails(row.JobCode).subscribe({
      next: (data) => {
        this.planDetailsList = data ?? [];
        this.isLoadingPlan = false;
      },
      error: (err) => {
        this.isLoadingPlan = false;
        this.errorMessage = 'Failed to fetch plan details.';
        console.error(err);
      }
    });
  }

  closePlanDetails(): void {
    this.showPlanDetails = false;
    this.selectedPlanJobCode = '';
    this.planDetailsList = [];
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.warningMessage = '';
  }
}
