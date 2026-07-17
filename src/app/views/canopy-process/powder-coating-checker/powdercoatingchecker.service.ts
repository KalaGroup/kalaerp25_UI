import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';

/**
 * Powder Coating Checker service — plan load, grid fetch, auth/reject save.
 * Kept separate from PowderCoatingPrcService (Powder Coating Maker) and
 * CanopyProcessService. All endpoints live under `/CpyPrc/...`.
 */
@Injectable({ providedIn: 'root' })
export class PowderCoatingCheckerService {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  private logUrl(method: string, label: string, url: string, params?: HttpParams | object): void {
    if (params instanceof HttpParams) {
      const qs = params.toString();
      // eslint-disable-next-line no-console
      console.log(`[PowderCoatingCheckerService] ${method} ${label} → ${url}${qs ? '?' + qs : ''}`);
    } else if (params && typeof params === 'object') {
      // eslint-disable-next-line no-console
      console.log(`[PowderCoatingCheckerService] ${method} ${label} → ${url}`, params);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[PowderCoatingCheckerService] ${method} ${label} → ${url}`);
    }
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Status:', error.status);
    console.error('Body:', error.error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }

  /** GET: plan codes for the Powder Coating Checker page (filtered by PC). */
  GetCheckerCPPlanLoad(pcCode: string): Observable<any[]> {
    const url = `${this.baseUrl}CNC/GetCNCCheckerCPPlanLoad`;
    const params = new HttpParams().set('pccode', pcCode);
    this.logUrl('GET', 'GetCheckerCPPlanLoad', url, params);
    return this.http.get<any[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  /** GET: Powder Coating checker grid rows for the chosen plan. */
  GetPowdercoating_chekerDetails(compId: string, planCode: string, pcCode: string): Observable<any[]> {
    const url = `${this.baseUrl}CNC/GetCNC_chekerDetails`;
    const params = new HttpParams()
      .set('CompId', compId)
      .set('planCode', planCode)
      .set('pccode', pcCode);
    this.logUrl('GET', 'GetPowdercoating_chekerDetails', url, params);
    return this.http.get<any[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  /** POST: Auth / Reject for the Powder Coating Checker. */
  Postpowdercoating_chekerSave(payload: any): Observable<string> {
    const url = `${this.baseUrl}PowderCoating/powdercoatingCheckerSubmit`;
    this.logUrl('POST', 'Postpowdercoating_chekerSave', url, payload);
    return this.http.post(url, payload, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'text'
    }).pipe(catchError(this.handleError));
  }
}
