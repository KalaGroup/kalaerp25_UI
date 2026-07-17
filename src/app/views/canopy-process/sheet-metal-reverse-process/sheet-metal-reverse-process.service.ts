import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';

import { IGetRevMst }                from './Model/getrevmst';
import { IcpyCatagory }             from './Model/cpyCatagory';
import { IcpyreverseloadPcCode }    from './Model/cpyreverseloadPcCode';
import { IcpyreverseloadTransType } from './Model/cpyreverseloadTransType';
import { IcpyreverseDts }           from './Model/cpyreverseDts';
import { ICpyReverseSave }          from './Model/cpyreverseSave';

/**
 * Sheet Metal Reverse Process service (was CpyReverseService).
 * Same conventions as the CNC Maker service (CncprcService):
 * `providedIn: 'root'`, `environment.apiURL` base, URL logging and a
 * shared error handler.
 */
@Injectable({ providedIn: 'root' })
export class SheetMetalReverseProcessService {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  /** Logs every outgoing request URL so it's visible in F12 → Console. */
  private logUrl(method: string, label: string, url: string): void {
    // eslint-disable-next-line no-console
    console.log(`[SheetMetalReverseProcessService] ${method} ${label} → ${url}`);
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Status:', error.status);
    console.error('Body:', error.error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }

  /** GET: reverse transaction master (optional lookup). */
  getRecTransMst(pcCode: string): Observable<IGetRevMst[]> {
    const url = `${this.baseUrl}Reverse/GetRevTransMst?PCCode=${pcCode}`;
    this.logUrl('GET', 'getRecTransMst', url);
    return this.http.get<IGetRevMst[]>(url);
  }

  /** GET: category list. */
  getCatagoryType(): Observable<IcpyCatagory[]> {
    const url = `${this.baseUrl}Reverse/getRevPCCode?StrTransType=CatName&CatId=0`;
    this.logUrl('GET', 'getCatagoryType', url);
    return this.http.get<IcpyCatagory[]>(url);
  }

  /** GET: profit centers for the selected category. */
  getPCcode(catId: string): Observable<IcpyreverseloadPcCode[]> {
    const url = `${this.baseUrl}Reverse/getRevPCCode?StrTransType=Profitcenter&CatId=${catId}`;
    this.logUrl('GET', 'getPCcode', url);
    return this.http.get<IcpyreverseloadPcCode[]>(url);
  }

  /** GET: transaction types. */
  getTransType(): Observable<IcpyreverseloadTransType[]> {
    const url = `${this.baseUrl}Reverse/getRevPCCode?StrTransType=TransType&CatId=0`;
    this.logUrl('GET', 'getTransType', url);
    return this.http.get<IcpyreverseloadTransType[]>(url);
  }

  /** GET: reverse-process detail rows for a PC + category. */
  getReversCpyDetails(pcCode: string, catId: string): Observable<IcpyreverseDts[]> {
    const url = `${this.baseUrl}Reverse/LoadPrcDts?PCCode=${pcCode}&CatId=${catId}`;
    this.logUrl('GET', 'getReversCpyDetails', url);
    return this.http.get<IcpyreverseDts[]>(url);
  }

  /** POST: submit the reverse transaction. Controller returns Ok(result) as text. */
  postReverseSave(payload: ICpyReverseSave): Observable<string> {
    const url = `${this.baseUrl}Reverse/SubmitRevCpyTrans`;
    this.logUrl('POST', 'postReverseSave', url);
    return this.http.post(url, payload, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'text'
    }).pipe(catchError((err) => this.handleError(err)));
  }
}
