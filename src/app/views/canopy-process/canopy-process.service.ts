import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';
import { IJobcard_CpyDts } from './sheet-metal-jobcard/Model/Jobcard_CpyDts';
import { IJobcard_CpySave } from './sheet-metal-jobcard/Model/IJobcard_CpySave';
import { IToEmpNamePCCode } from './sheet-metal-jobcard-checker/Model/ToEmpNamePCCode';
import { IJobcardCpyChekerDts } from './sheet-metal-jobcard-checker/Model/jobCard_Cpy_chekerDts';
import { IRejectPayload } from './sheet-metal-jobcard-checker/Model/jobcard_Cpy_chekerSave';

// CNC Maker      → cnc-maker/cncprc.service.ts          (CncprcService)
// CNC Checker    → cnc-checker/cncchecker.service.ts    (CncCheckerService)
// Bending Maker  → bending-maker/bendingprc.service.ts  (BendingprcService)
// Bending Checker→ bending-checker/bendingchecker.service.ts (BendingCheckerService)
// Fabrication    → fabrication-maker/fabricationprc.service.ts (FabricationprcService)
//
// This service now only owns the Sheet-Metal JobCard and JobCard-Checker
// endpoints plus a few shared helpers (get6M, getToEmpNamePCCode,
// GetStageSheetData) that more than one page calls.


// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class CanopyProcessService {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) { }

  /** Logs every outgoing request URL so it's visible in F12 → Console. */
  private logUrl(method: string, label: string, url: string, params?: HttpParams | object): void {
    if (params instanceof HttpParams) {
      const qs = params.toString();
      // eslint-disable-next-line no-console
      console.log(`[CanopyProcessService] ${method} ${label} → ${url}${qs ? '?' + qs : ''}`);
    } else if (params && typeof params === 'object') {
      // eslint-disable-next-line no-console
      console.log(`[CanopyProcessService] ${method} ${label} → ${url}`, params);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[CanopyProcessService] ${method} ${label} → ${url}`);
    }
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Status:', error.status);
    console.error('Body:', error.error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }

  // ─── Start sheet-metal-jobcard ──────────────────────────────────────────────

  /** GET: fetch canopy plan details by line (LineWisePC). */
  getCanopyPlan(lineWisePC: string): Observable<IJobcard_CpyDts[]> {
    const url = `${this.baseUrl}Canopy/GetCanopyPlan/${lineWisePC}`;
    this.logUrl('GET', 'getCanopyPlan', url);
    return this.http.get<IJobcard_CpyDts[]>(url)
      .pipe(catchError(this.handleError));
  }

  /** GET: lines configured for a given process name (e.g. "Sheet Metal"), optionally filtered by company. */
  GetLineByProcess(processName: string, compCode: string = ''): Observable<any[]> {
    let url = `${this.baseUrl}Canopy/GetLineByProcess/${encodeURIComponent(processName)}`;
    if (compCode) {
      url += `?compCode=${encodeURIComponent(compCode)}`;
    }
    this.logUrl('GET', 'GetLineByProcess', url);
    return this.http.get<any[]>(url)
      .pipe(catchError(this.handleError));
  }

  /** POST: submit job card copy */
  submitJobCardCpy(payload: IJobcard_CpySave): Observable<string> {
    const url = `${this.baseUrl}Canopy/JobCard_Cpy/Submit`;
    this.logUrl('POST', 'submitJobCardCpy', url, payload);
    return this.http.post(url, payload, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'text'
    }).pipe(catchError(this.handleError));
  }

  // ─── Start sheet-metal-jobcard-checker ──────────────────────────────────────

  GetJobCardCpychecker(compId: string, planCode: string): Observable<any[]> {
    const url = `${this.baseUrl}Canopy/GetJobCardCpychecker/${compId}/${planCode}`;
    this.logUrl('GET', 'GetJobCardCpychecker', url);
    return this.http.get<any[]>(url)
      .pipe(catchError(this.handleError));
  }

  GetCheckerCPPlanLoad(): Observable<any[]> {
    const url = `${this.baseUrl}Canopy/GetCheckerCPPlanLoad`;
    this.logUrl('GET', 'GetCheckerCPPlanLoad', url);
    return this.http.get<any[]>(url)
      .pipe(catchError(this.handleError));
  }

  /** GET: checker-done plans for the report grid */
  GetJobCardCpyCheckerDone(): Observable<IJobcardCpyChekerDts[]> {
    const url = `${this.baseUrl}Canopy/GetJobCardCpyCheckerDone`;
    this.logUrl('GET', 'GetJobCardCpyCheckerDone', url);
    return this.http.get<IJobcardCpyChekerDts[]>(url)
      .pipe(catchError(this.handleError));
  }

  /** GET: stage sheet rows (cnc / bending / fabrication / powdercoating). */
  GetStageSheetData(cpCode: string, partCode: string, stage: string, pcCode: string): Observable<any[]> {
    const url = `${this.baseUrl}Canopy/GetStageSheetData`;
    const params = new HttpParams()
      .set('cpCode', cpCode)
      .set('partCode', partCode)
      .set('stage', stage)
      .set('pcCode', pcCode);
    this.logUrl('GET', 'GetStageSheetData', url, params);
    return this.http.get<any[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  getToEmpNamePCCode(): Observable<IToEmpNamePCCode[]> {
    const url = `${this.baseUrl}Canopy/JobCard_Cpy/CorReqEmpName`;
    this.logUrl('GET', 'getToEmpNamePCCode', url);
    return this.http.get<IToEmpNamePCCode[]>(url);
  }

  get6M(): Observable<any[]> {
    const url = `${this.baseUrl}Canopy/JobCard_Cpy/6MTypes`;
    this.logUrl('GET', 'get6M', url);
    return this.http.get<any[]>(url);
  }

  /** POST: Auth/Reject Job Card */
  postSheetMetalJobcardCheckerSave(payload: IRejectPayload): Observable<string> {
    const url = `${this.baseUrl}Canopy/JobCard_Cpy/SaveChecker`;
    this.logUrl('POST', 'postSheetMetalJobcardCheckerSave', url, payload);
    return this.http.post(url, payload, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'text'
    }).pipe(catchError(this.handleError));
  }

  // END sheet-metal-jobcard-checker
}
