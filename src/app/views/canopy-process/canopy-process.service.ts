import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IJobcard_CpyDts {
  SelectR: boolean;
  KVA: number;
  Model: string;
  Partcode: string;
  FNorm: number;
  TotStk: number;
  WIPStk: number;
  PenPlanQty: number;
  PReq: number;
  PlanQty: number;
  BatchQty: number;
  Bomcode: string;
  PlanCode: string;
  PlanDate: Date | string;
  DayPlanQty: number;
  DayName?: string;
  TodayFlag?: string;
}

export interface IJobcard_CpySave {
  Code: string;
  EmpCode: string;
  PCCode: string;
  CompCode: string;
  JobCard_CpyDts: string;
  Remark: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class CanopyProcessService {

  private baseUrl = environment.apiURL;

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const msg = error.error instanceof ErrorEvent
      ? `Client error: ${error.error.message}`
      : `Server error ${error.status}: ${error.message}`;
    console.error(msg);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }

  /** GET: fetch canopy plan details by company code */
  getCanopyPlan(compCode: string): Observable<IJobcard_CpyDts[]> {
    const url = `${this.baseUrl}Canopy/GetCanopyPlan/${compCode}`;
    return this.http.get<IJobcard_CpyDts[]>(url)
      .pipe(catchError(this.handleError));
  }

  /** POST: submit job card copy */
  submitJobCardCpy(payload: IJobcard_CpySave): Observable<any> {
    const url = `${this.baseUrl}Canopy/JobCard_Cpy/Submit`;
    return this.http.post<any>(url, payload, this.httpOptions)
      .pipe(catchError(this.handleError));
  }
}
