import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';

/**
 * Fabrication Checker service — plan load, grid fetch, auth/reject save.
 * Kept separate from FabricationprcService (Fabrication Maker) and
 * CanopyProcessService. All endpoints live under `/CpyPrc/...`.
 */
@Injectable({ providedIn: 'root' })
export class FabricationCheckerService {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  private logUrl(method: string, label: string, url: string, params?: HttpParams | object): void {
    if (params instanceof HttpParams) {
      const qs = params.toString();
      // eslint-disable-next-line no-console
      console.log(`[FabricationCheckerService] ${method} ${label} → ${url}${qs ? '?' + qs : ''}`);
    } else if (params && typeof params === 'object') {
      // eslint-disable-next-line no-console
      console.log(`[FabricationCheckerService] ${method} ${label} → ${url}`, params);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[FabricationCheckerService] ${method} ${label} → ${url}`);
    }
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Status:', error.status);
    console.error('Body:', error.error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }

  /** GET: plan codes for the Fabrication Checker page (filtered by PC). */
  GetCheckerCPPlanLoad(pcCode: string): Observable<any[]> {
    const url = `${this.baseUrl}CNC/GetCNCCheckerCPPlanLoad`;
    const params = new HttpParams().set('pccode', pcCode);
    this.logUrl('GET', 'GetCheckerCPPlanLoad', url, params);
    return this.http.get<any[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  /** GET: Fabrication checker grid rows for the chosen plan. */
  GetFabrication_chekerDetails(compId: string, planCode: string, pcCode: string): Observable<any[]> {
    const url = `${this.baseUrl}CNC/GetCNC_chekerDetails`;
    const params = new HttpParams()
      .set('CompId', compId)
      .set('planCode', planCode)
      .set('pccode', pcCode);
    this.logUrl('GET', 'GetFabrication_chekerDetails', url, params);
    return this.http.get<any[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  /** POST: Auth / Reject for the Fabrication Checker. */
  postFabrication_chekerSave(payload: any): Observable<string> {
    const url = `${this.baseUrl}Fabrication/FabricationCheckerSubmit`;
    this.logUrl('POST', 'postFabrication_chekerSave', url, payload);
    return this.http.post(url, payload, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'text'
    }).pipe(catchError(this.handleError));
  }
}
