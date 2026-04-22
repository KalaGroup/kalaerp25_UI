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

export interface JobCard1CheckerRow {
  JobCode:   string;
  Dt:        string;
  PartCode:  string;
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
  Engine: string;
  Alternator: string;
  Battery: string;
  Canopy: string;
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
