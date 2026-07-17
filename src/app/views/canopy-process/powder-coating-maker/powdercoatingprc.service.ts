import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';

import { IpowdercoatingprcSupplier }    from './Model/powdercoatingprcloadSupplier';
import { IpowdercoatingPrcPartDts }     from './Model/powdercoatingprcPartDts';
import { IpowdercoatingprcloadMachine } from './Model/powdercoatingprcloadMachine';
import { IpowdercoatingprcloadKVA }     from './Model/powdercoatingprcloadKVA';
import { IpowdercoatingprcSave }        from './Model/powdercoatingprcSave';

/**
 * Powder Coating Maker service — dropdowns, part lookups and submit.
 * The Powder Coating Checker has its own service
 * (powder-coating-checker/powdercoatingchecker.service.ts).
 */
@Injectable({ providedIn: 'root' })
export class PowderCoatingPrcService {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  /** Logs every outgoing request URL so it's visible in F12 → Console. */
  private logUrl(method: string, label: string, url: string, params?: HttpParams | object): void {
    if (params instanceof HttpParams) {
      const qs = params.toString();
      // eslint-disable-next-line no-console
      console.log(`[PowderCoatingPrcService] ${method} ${label} → ${url}${qs ? '?' + qs : ''}`);
    } else if (params && typeof params === 'object') {
      // eslint-disable-next-line no-console
      console.log(`[PowderCoatingPrcService] ${method} ${label} → ${url}`, params);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[PowderCoatingPrcService] ${method} ${label} → ${url}`);
    }
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Status:', error.status);
    console.error('Body:', error.error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }

  // ─── Powder Coating Maker ─────────────────────────────────────────────────────

  LoadOSSupplier(PCCode: string): Observable<IpowdercoatingprcSupplier[]> {
    const url = `${this.baseUrl}CNC/LoadOSSupplier?PCCode=${PCCode}`;
    this.logUrl('GET', 'LoadOSSupplier', url);
    return this.http.get<IpowdercoatingprcSupplier[]>(url);
  }

  LoadMachine(PCCode: string): Observable<IpowdercoatingprcloadMachine[]> {
    const url = `${this.baseUrl}CNC/LoadMachine?PCCode=${PCCode}`;
    this.logUrl('GET', 'LoadMachine', url);
    return this.http.get<IpowdercoatingprcloadMachine[]>(url);
  }

  getKVA(PCCode: string, ddlMachine: string): Observable<IpowdercoatingprcloadKVA[]> {
    const url = `${this.baseUrl}CNC/getCpyPrcddl?PCCode=${PCCode}&MachineCode=${ddlMachine}&KVA=0&Model=0&PlanCode=0&CatID=0`;
    this.logUrl('GET', 'getKVA', url);
    return this.http.get<IpowdercoatingprcloadKVA[]>(url);
  }

  GetCpyKitDts(PCCode: string, MachineCode: string, ddlKVA: string): Observable<IpowdercoatingPrcPartDts[]> {
    const url = `${this.baseUrl}PowderCoating/GetCpyKitPC?PCCode=${PCCode}&MachineCode=${MachineCode}&KVA=${ddlKVA}&PlanCode=0&Partcode=0&BOMCode=0&CpyKit=0`;
    this.logUrl('GET', 'GetCpyKitDts', url);
    return this.http.get<IpowdercoatingPrcPartDts[]>(url);
  }

  /** POST PowderCoating/PowderCoatingSubmit — controller returns Ok(result) as a text body. */
  postPCSave(PCprcSave: IpowdercoatingprcSave): Observable<string> {
    const url = `${this.baseUrl}PowderCoating/PowderCoatingSubmit`;
    this.logUrl('POST', 'postPCSave', url, PCprcSave);
    return this.http.post(url, PCprcSave, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'text'
    }).pipe(catchError((err) => this.handleError(err)));
  }
}
