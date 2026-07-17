import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';

import { IfabricationprcloadMachine }    from './Model/fabricationprcloadMachine';
import { IfabricationprcloadOSSupplier } from './Model/fabricationprcloadOSSupplier';
import { IfabricationprcloadKVA }        from './Model/fabricationprcloadKVA';
import { IfabricationprcloadModel }      from './Model/fabricationprcloadModel';
import { IfabricationprcloadCpyKit }     from './Model/fabricationprcloadCpyKit';
import { IfabricationprcloadCpyKitQty }  from './Model/fabricationprcloadCpyKitQty';
import { IfabricationPrcPlanDts }        from './Model/fabricationprcplanDts';
import { IfabricationPrcPartDts }        from './Model/fabricationprcPartDts';
import { IfabricationprcSave }           from './Model/fabricationprcSave';

/**
 * Fabrication Process service — kept separate from CanopyProcessService.
 * All endpoints live under `/CpyPrc/...` and most of the dropdown lookups
 * take a Supplier code parameter that the CNC equivalents don't.
 */
@Injectable({ providedIn: 'root' })
export class FabricationprcService {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  private logUrl(method: string, label: string, url: string, params?: HttpParams | object): void {
    if (params instanceof HttpParams) {
      const qs = params.toString();
      // eslint-disable-next-line no-console
      console.log(`[FabricationprcService] ${method} ${label} → ${url}${qs ? '?' + qs : ''}`);
    } else if (params && typeof params === 'object') {
      // eslint-disable-next-line no-console
      console.log(`[FabricationprcService] ${method} ${label} → ${url}`, params);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[FabricationprcService] ${method} ${label} → ${url}`);
    }
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Status:', error.status);
    console.error('Body:', error.error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }

  // ─── Dropdown lookups ───────────────────────────────────────────────────────

  /** Machine list for the fabrication page. */
  LoadMachine(PCCode: string): Observable<IfabricationprcloadMachine[]> {
    const url = `${this.baseUrl}CNC/LoadMachine?PCCode=${PCCode}`;
    this.logUrl('GET', 'LoadMachine', url);
    return this.http.get<IfabricationprcloadMachine[]>(url)
      .pipe(catchError(this.handleError));
  }

  /** OS Supplier list — takes a PCCode param and hits the CpyPrc endpoint. */
  LoadOSSupplier(PCCode: string): Observable<IfabricationprcloadOSSupplier[]> {
    const url = `${this.baseUrl}CNC/LoadOSSupplier?PCCode=${PCCode}`;
    this.logUrl('GET', 'LoadOSSupplier', url);
    return this.http.get<IfabricationprcloadOSSupplier[]>(url)
      .pipe(catchError(this.handleError));
  }

  FabGetKVA(pcCode: string, machineCode: string, suppCode: string): Observable<IfabricationprcloadKVA[]> {
    const url = `${this.baseUrl}Fabrication/getCpyPrcddlFab`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('MachineCode', machineCode)
      .set('KVA', '0').set('Model', '0')
      .set('SuppCode', suppCode);
    this.logUrl('GET', 'FabGetKVA', url, params);
    return this.http.get<IfabricationprcloadKVA[]>(url, { params })
      .pipe(catchError(this.handleError));
  }



  FabGetModel(
    pcCode: string, machineCode: string, kva: string, suppCode: string
  ): Observable<IfabricationprcloadModel[]> {
    const url = `${this.baseUrl}Fabrication/getCpyPrcddlFab`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('MachineCode', machineCode)
      .set('KVA', kva).set('Model', '0')
      .set('SuppCode', suppCode);
    this.logUrl('GET', 'FabGetModel', url, params);
    return this.http.get<IfabricationprcloadModel[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  FabGetPlanDts(
    pcCode: string, machineCode: string, kva: string, model: string, suppCode: string
  ): Observable<IfabricationPrcPlanDts[]> {
    const url = `${this.baseUrl}Fabrication/getCpyPrcddlFab`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('MachineCode', machineCode)
      .set('KVA', kva).set('Model', model)
      .set('SuppCode', suppCode);
    this.logUrl('GET', 'FabGetPlanDts', url, params);
    return this.http.get<IfabricationPrcPlanDts[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  FabGetCpyKit(
    machineCode: string, pcCode: string, planCode: string, partCode: string, suppCode: string
  ): Observable<IfabricationprcloadCpyKit[]> {
    const url = `${this.baseUrl}Fabrication/GetCpyKitFab`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('MachineCode', machineCode)
      .set('PlanCode', planCode)
      .set('Partcode', partCode)
      .set('CpyKit', '0')
      .set('SuppCode', suppCode);
    this.logUrl('GET', 'FabGetCpyKit', url, params);
    return this.http.get<IfabricationprcloadCpyKit[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  FabGetCpyKitQty(
    machineCode: string, cpyKit: string, pcCode: string,
    planCode: string, partCode: string, suppCode: string
  ): Observable<IfabricationprcloadCpyKitQty[]> {
    const url = `${this.baseUrl}Fabrication/GetCpyKitFab`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('MachineCode', machineCode)
      .set('PlanCode', planCode)
      .set('Partcode', partCode)
      .set('CpyKit', cpyKit)
      .set('SuppCode', suppCode);
    this.logUrl('GET', 'FabGetCpyKitQty', url, params);
    return this.http.get<IfabricationprcloadCpyKitQty[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  FabGetCpyKitDts(
    pcCode: string, cpyKit: string, bomCode: string, planQty: number
  ): Observable<IfabricationPrcPartDts[]> {
    const url = `${this.baseUrl}Fabrication/GetCpyKitDts`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('BatchQty', String(planQty))
      .set('CpyKitcode', cpyKit)
      .set('BOMCode', bomCode)
      .set('PFBCode', 'NEW');
    this.logUrl('GET', 'FabGetCpyKitDts', url, params);
    return this.http.get<IfabricationPrcPartDts[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  FabGetEndPrcPartDts(pcCode: string, pfbCode: string): Observable<IfabricationPrcPartDts[]> {
    const url = `${this.baseUrl}Fabrication/GetCpyKitDts`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('BatchQty', '0')
      .set('CpyKitcode', '0')
      .set('BOMCode', '0')
      .set('PFBCode', pfbCode);
    this.logUrl('GET', 'FabGetEndPrcPartDts', url, params);
    return this.http.get<IfabricationPrcPartDts[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  /** POST: submit the fabrication process. */
  postFabSave(payload: IfabricationprcSave): Observable<string> {
    const url = `${this.baseUrl}Fabrication/FabricationSubmit`;
    this.logUrl('POST', 'postFabSave', url, payload);
    return this.http.post(url, payload, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'text'
    }).pipe(catchError(this.handleError));
  }
}
