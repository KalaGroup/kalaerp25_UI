import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';

/**
 * Service for the Job Card Canopy Requisition (In-Active) page.
 * Converts the legacy JobCardConopyReq_InActive.aspx flow:
 *  - Search  -> GetconopyHold (list of plans that can be held / inactivated)
 *  - Hold    -> inactivate the selected plans with a remark
 * Same conventions as the other canopy-process services.
 */
@Injectable({ providedIn: 'root' })
export class JobCardConopyReqInActiveService {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  private logUrl(method: string, label: string, url: string, params?: HttpParams | object): void {
    if (params instanceof HttpParams) {
      const qs = params.toString();
      // eslint-disable-next-line no-console
      console.log(`[JobCardConopyReqInActiveService] ${method} ${label} → ${url}${qs ? '?' + qs : ''}`);
    } else if (params && typeof params === 'object') {
      // eslint-disable-next-line no-console
      console.log(`[JobCardConopyReqInActiveService] ${method} ${label} → ${url}`, params);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[JobCardConopyReqInActiveService] ${method} ${label} → ${url}`);
    }
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Status:', error.status);
    console.error('Body:', error.error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }

  /** GET: plans that can be held/inactivated (legacy `Exec GetconopyHold`). */
  GetConopyHold(compCode: string): Observable<any[]> {
    const url = `${this.baseUrl}Canopy/GetconopyHold`;
    const params = new HttpParams().set('compCode', compCode);
    this.logUrl('GET', 'GetConopyHold', url, params);
    return this.http.get<any[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  /** POST: inactivate (hold) the selected plans with their remarks. */
  HoldConopyReq(payload: any): Observable<string> {
    const url = `${this.baseUrl}Canopy/JobCardConopyReqInActiveHold`;
    this.logUrl('POST', 'HoldConopyReq', url, payload);
    return this.http.post(url, payload, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'text'
    }).pipe(catchError(this.handleError));
  }
}
