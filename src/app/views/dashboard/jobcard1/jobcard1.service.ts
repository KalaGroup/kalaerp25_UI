import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

export interface JobCardSubmitRequest {
  pcCode:   string;
  remark:   string;
  empCode:  string;
  rows:     JobCardDtsRow[];
}

@Injectable({ providedIn: 'root' })
export class Jobcard1Service {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  // GET — fetch DG list with plan + stock for a company
  getJobCardDetails(compCode: string): Observable<JobCardDtsRow[]> {
    return this.http
      .get<JobCardDtsRow[]>(`${this.baseUrl}Jobcard/GetJobCard1?CompId=${compCode}`)
      .pipe(catchError(this.handleError));
  }

  // POST — submit job card with typed row list
  submitJobCard(request: JobCardSubmitRequest): Observable<string> {
    return this.http
      .post(`${this.baseUrl}Jobcard/SubmitJobCard`, request, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        responseType: 'text'
      })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('JobCard API Error:', error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }
}
