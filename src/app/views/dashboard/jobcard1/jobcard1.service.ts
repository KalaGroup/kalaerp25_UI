import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'environments/environment';

// ── Models ────────────────────────────────────────────────────────
export interface JobCardDtsRow {
  // Identifiers
  BOMCode?:     string;
  PartCode?:    string;
  PartDesc?:    string;

  // DG Specifications
  KVA?:         number;
  Phase?:       string;
  Model?:       string;
  DGPanel?:     string;
  PanelType?:   string;

  // Stock counts — API returns as string
  Eng?:         number;
  Alt?:         number;
  Bat?:         number;
  Cpy?:         number;
  BatLog?:      number;
  CpyLog?:      number;

  // Stock / plan numbers
  DStk?:        number;
  CPStk?:       number;
  FNorm?:       number;
  PPlanQty?:    number;
  PlReq?:       number;
  Stage3Qty?:   number;
  JobCard1Qty?: string;
  Jobcard2Qty?: string;

  // Plan columns
  PlanCode?:    string;
  PlanDate?:    string;
  DayPlanQty?:  number;
  FwPQty?:      number;
  PenPQty?:     number;

  // Calendar helpers
  DayName?:     string;
  TodayFlag?:   string;

  // User input — filled by user in table (must be <= PenPQty)
  Qty:          number;
}

export interface JobCard1ReportRow {
  JobCode:            string;
  JobDate:            string;
  FinancialYear:      string;
  ProfitCenter:       string;
  AssemblyLine:       string;
  CompanyCode:        string;
  Remark:             string;
  JobCardStatus:      string;
  JobCardAuthStatus:  string;
  PlanSrNo:           number;
  PlanNo:             number;
  DGProductCode:      string;
  DGProductDesc:      string;
  KVA:                number;
  Phase:              string;
  Model:              string;
  PlannedQty:         number;
  PlanCode:           string;
  PlanDate:           string;
  Stage2CompletedQty: number;
  Engine:             number;
  Alternator:         number;
  Batteries:          number;
  Canopy:             number;
  TotalComponents:    number;
  Stage1:             string;
  Stage1QAStatus:     string;
  Stage2:             string;
  Stage2QAStatus:     string;
  JobCard2Status:     string;

  // Per-plan component serials (combined into JobCard1Report SP)
  BOMCode?:               string;
  Engine_SrNo?:           string;
  Engine_SrNoDesc?:       string;
  Alternator_SrNo?:       string;
  Alternator_SrNoDesc?:   string;
  Battery1_SrNo?:         string;
  Battery1_SrNoDesc?:     string;
  Battery2_SrNo?:         string;
  Battery2_SrNoDesc?:     string;
  Battery3_SrNo?:         string;
  Battery3_SrNoDesc?:     string;
  Battery4_SrNo?:         string;
  Battery4_SrNoDesc?:     string;
  Canopy_SrNo?:           string;
  Canopy_SrNoDesc?:       string;
}

export interface JobCard1CheckerRow {
  JobCode:   string;
  Dt:        string;
  PartCode:  string;
  PartDesc:  string;
  Model:     string;
  KVA:       number;
  Phase:     string;
  PlanQty:   number;
}

export interface SixMItem {
  Id:   number;
  Name: string;
}

export interface EmployeeItem {
  ECode: string;
  EmployeeName: string;
}

export interface PlanDetailItem {
  JobCode: string;
  BOMCode: string;
  PlanCode: string;
  PlanDate: string;
  PartCode: string;
  JPriority?: number;
  Engine: string;
  Engine_Desc?: string;
  Alternator: string;
  Alternator_Desc?: string;
  Battery1: string;
  Battery1_Desc?: string;
  Battery2: string;
  Battery2_Desc?: string;
  Battery3: string;
  Battery3_Desc?: string;
  Battery4: string;
  Battery4_Desc?: string;
  Canopy: string;
  Canopy_Desc?: string;
  Remark?: string;
}

export interface CheckerDetailItem {
  sixM:        string;
  description: string;
  assignTo:    string;
  assignName:  string;
  selected?:   boolean;
}

export interface CheckerSubmitRequest {
  empCode: string;
  pccode_Act: string;
  pcCode_Old: string;
  jobCode: string;
  status:  string;
  details: CheckerDetailItem[];
}

export interface JobCardSubmitRequest {
  pcCode_Act:   string;
  pcCode_Old:   string;
  remark:   string;
  empCode:  string;
  plans:    JobCardDtsRow[];
}

@Injectable({ providedIn: 'root' })
export class Jobcard1Service {

  private baseUrl = environment.apiURL;
  private cachedEmployees: EmployeeItem[] | null = null;

  constructor(private http: HttpClient) {}

  // GET — fetch DG list with plan + stock for a company
  getJobCardDetails(compCode: string, pcCode: string): Observable<JobCardDtsRow[]> {
    return this.http
      .get<JobCardDtsRow[]>(`${this.baseUrl}Jobcard/GetJobCard1?CompId=${compCode}&AssemblyLine=${pcCode}`)
      .pipe(catchError(this.handleError));
  }

  // GET — Plan details for one JobCode + Plan number (used by report drill-in modal)
  getPlanDetailsForReport(jobCode: string, planNo: number): Observable<PlanDetailItem[]> {
    const url = `${this.baseUrl}Jobcard/GetPlanDetailsForJobcard1Report`
      + `?jobCode=${encodeURIComponent(jobCode)}`
      + `&planNo=${planNo}`;
    return this.http
      .get<PlanDetailItem[]>(url)
      .pipe(catchError(this.handleError));
  }

  // GET — JobCard production report (status + stage progress, one row per plan)
  getJobCard1Report(
    compCode: string,
    assemblyLine: string,
    fromDate: string,
    toDate: string
  ): Observable<JobCard1ReportRow[]> {
    const url = `${this.baseUrl}Jobcard/GetJobCard1Report`
      + `?CompanyCode=${encodeURIComponent(compCode)}`
      + `&AssemblyLine=${encodeURIComponent(assemblyLine)}`
      + `&FromDate=${encodeURIComponent(fromDate)}`
      + `&ToDate=${encodeURIComponent(toDate)}`;
    return this.http
      .get<JobCard1ReportRow[]>(url)
      .pipe(catchError(this.handleError));
  }

  // POST — submit job card with typed row list
  submitJobCard(request: JobCardSubmitRequest): Observable<string> {
    return this.http
      .post(`${this.baseUrl}Jobcard/SubmitJobCard`, request, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        responseType: 'text'
      })
      .pipe(
        tap(response => console.log('submitJobCard Response:', response)),
        catchError(this.handleError)
      );
  }

  // POST — submit checker auth/reject
  submitJobcard1Checker(request: CheckerSubmitRequest): Observable<string> {
    console.log('submitJobcard1Checker API URL:', `${this.baseUrl}Jobcard/SubmitJobcard1Checker`);
    console.log('submitJobcard1Checker Payload:', JSON.stringify(request, null, 2));
    return this.http
      .post(`${this.baseUrl}Jobcard/SubmitJobcard1Checker`, request, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        responseType: 'text'
      })
      .pipe(
        tap(response => console.log('submitJobcard1Checker Response:', response)),
        catchError(this.handleError)
      );
  }

  // GET — fetch checker jobcard numbers
  getJobCard1CheckerDetails(): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.baseUrl}Jobcard/GetJobCard1CheckerDetails`)
      .pipe(catchError(this.handleError));
  }

  // GET — fetch checker details by jobcode
  getJobCard1CheckerDetailsByCode(jobCode: string): Observable<JobCard1CheckerRow[]> {
    return this.http
      .get<JobCard1CheckerRow[]>(`${this.baseUrl}Jobcard/GetJobCard1CheckerDetails/${encodeURIComponent(jobCode)}`)
      .pipe(catchError(this.handleError));
  }

  // GET — fetch plan details by jobcode
  getPlanDetails(jobCode: string): Observable<PlanDetailItem[]> {
    return this.http
      .get<PlanDetailItem[]>(`${this.baseUrl}Jobcard/GetPlanDetails/${encodeURIComponent(jobCode)}`)
      .pipe(catchError(this.handleError));
  }

  // GET — fetch 6M data
  fetchSelect6MData(): Observable<SixMItem[]> {
    return this.http
      .get<SixMItem[]>(`${this.baseUrl}DGAssemblly/GetSelect6MData`)
      .pipe(catchError(this.handleError));
  }

  // GET — fetch employee list (cached)
  fetchEmployeeList(): Observable<EmployeeItem[]> {
    if (this.cachedEmployees) {
      return of(this.cachedEmployees);
    }
    return this.http
      .get<EmployeeItem[]>(`${this.baseUrl}DgStageChecker/FetchEmployeeListToRaiseESP`)
      .pipe(
        tap(data => this.cachedEmployees = data),
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('JobCard API Error:', error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }
}
