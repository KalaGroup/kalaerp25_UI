import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';

/**
 * Bending Checker service — plan load, grid fetch, auth/reject save.
 * Kept separate from BendingprcService (Bending Maker) and CanopyProcessService.
 */
@Injectable({ providedIn: 'root' })
export class BendingCheckerService {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  private logUrl(method: string, label: string, url: string, params?: HttpParams | object): void {
    if (params instanceof HttpParams) {
      const qs = params.toString();
      // eslint-disable-next-line no-console
      console.log(`[BendingCheckerService] ${method} ${label} → ${url}${qs ? '?' + qs : ''}`);
    } else if (params && typeof params === 'object') {
      // eslint-disable-next-line no-console
      console.log(`[BendingCheckerService] ${method} ${label} → ${url}`, params);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[BendingCheckerService] ${method} ${label} → ${url}`);
    }
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Status:', error.status);
    console.error('Body:', error.error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }

  /** GET: plan codes for the Bending Checker page (filtered by PC). */
  GetBendingCheckerCPPlanLoad(pcCode: string): Observable<any[]> {
    const url = `${this.baseUrl}CNC/GetCNCCheckerCPPlanLoad`;
    const params = new HttpParams().set('pcCode', pcCode);
    this.logUrl('GET', 'GetBendingCheckerCPPlanLoad', url, params);
    return this.http.get<any[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  /** GET: Bending checker grid rows for the chosen plan. */
  GetBending_chekerDetails(compId: string, planCode: string, pcCode: string): Observable<any[]> {
    const url = `${this.baseUrl}CNC/GetCNC_chekerDetails`;
    const params = new HttpParams()
      .set('compId', compId)
      .set('planCode', planCode)
      .set('pcCode', pcCode);
    this.logUrl('GET', 'GetBending_chekerDetails', url, params);
    return this.http.get<any[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  /** POST: Auth / Reject for the Bending Checker. */
  postBending_chekerSave(payload: any): Observable<string> {
    const url = `${this.baseUrl}Bending/Bending_chekerSave`;
    this.logUrl('POST', 'postBending_chekerSave', url, payload);
    return this.http.post(url, payload, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'text'
    }).pipe(catchError(this.handleError));
  }
}
