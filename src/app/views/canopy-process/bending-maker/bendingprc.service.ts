import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';

import { IbendingprcloadMachine }   from './Model/bendingprcloadMachine';
import { IbendingprcloadKVA }       from './Model/bendingprcloadKVA';
import { IbendingprcloadModel }     from './Model/bendingprcloadModel';
import { IbendingprcloadCpyKit }    from './Model/bendingprcloadCpyKit';
import { IbendingprcloadCpyKitQty } from './Model/bendingprcloadCpyKitQty';
import { IbendingPrcPlanDts }       from './Model/bendingprcplanDts';
import { IBendingPrcPartDts }       from './Model/bendingprcPartDts';
import { IbendingprcSave }          from './Model/bendingprcSave';

/**
 * Bending Maker service — dropdowns, plan/kit/part lookups and submit.
 * Method names keep the `Bend*` prefix so the existing call sites in
 * bending-maker.component.ts work unchanged after the inject swap.
 */
@Injectable({ providedIn: 'root' })
export class BendingprcService {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  private logUrl(method: string, label: string, url: string, params?: HttpParams | object): void {
    if (params instanceof HttpParams) {
      const qs = params.toString();
      // eslint-disable-next-line no-console
      console.log(`[BendingprcService] ${method} ${label} → ${url}${qs ? '?' + qs : ''}`);
    } else if (params && typeof params === 'object') {
      // eslint-disable-next-line no-console
      console.log(`[BendingprcService] ${method} ${label} → ${url}`, params);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[BendingprcService] ${method} ${label} → ${url}`);
    }
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Status:', error.status);
    console.error('Body:', error.error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }

  /**
   * Machine / KVA / Model lookups for the bending-maker page — these reuse
   * the CNC endpoints (same path the merged CanopyProcessService called).
   * Returned shapes are assigned into bending-prefixed signals; the JSON
   * fields line up structurally.
   */
  LoadMachine(PCCode: string): Observable<IbendingprcloadMachine[]> {
    const url = `${this.baseUrl}CNC/LoadMachine?PCCode=${PCCode}`;
    this.logUrl('GET', 'LoadMachine', url);
    return this.http.get<IbendingprcloadMachine[]>(url)
      .pipe(catchError(this.handleError));
  }

  getKVA(PCCode: string, ddlMachine: string): Observable<IbendingprcloadKVA[]> {
    const url = `${this.baseUrl}CNC/getCpyPrcddl?PCCode=${PCCode}&MachineCode=${ddlMachine}&KVA=0&Model=0&PlanCode=0&CatID=0`;
    this.logUrl('GET', 'getKVA', url);
    return this.http.get<IbendingprcloadKVA[]>(url)
      .pipe(catchError(this.handleError));
  }

  getModel(PCCode: string, ddlMachine: string, ddlKVA: string): Observable<IbendingprcloadModel[]> {
    const url = `${this.baseUrl}CNC/getCpyPrcddl?PCCode=${PCCode}&MachineCode=${ddlMachine}&KVA=${ddlKVA}&Model=0&PlanCode=0&CatID=0`;
    this.logUrl('GET', 'getModel', url);
    return this.http.get<IbendingprcloadModel[]>(url)
      .pipe(catchError(this.handleError));
  }

  BendLoadMachine(pcCode: string): Observable<IbendingprcloadMachine[]> {
    const url = `${this.baseUrl}CpyPrc/LoadMachine`;
    const params = new HttpParams().set('PCCode', pcCode);
    this.logUrl('GET', 'BendLoadMachine', url, params);
    return this.http.get<IbendingprcloadMachine[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  BendGetKVA(pcCode: string, machineCode: string): Observable<IbendingprcloadKVA[]> {
    const url = `${this.baseUrl}CpyPrc/getCpyPrcddl`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('MachineCode', machineCode)
      .set('KVA', '0').set('Model', '0').set('PlanCode', '0').set('CatID', '0');
    this.logUrl('GET', 'BendGetKVA', url, params);
    return this.http.get<IbendingprcloadKVA[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  BendGetModel(pcCode: string, machineCode: string, kva: string): Observable<IbendingprcloadModel[]> {
    const url = `${this.baseUrl}CpyPrc/getCpyPrcddl`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('MachineCode', machineCode)
      .set('KVA', kva).set('Model', '0').set('PlanCode', '0').set('CatID', '0');
    this.logUrl('GET', 'BendGetModel', url, params);
    return this.http.get<IbendingprcloadModel[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  BendGetPlanDts(
    pcCode: string, machineCode: string, kva: string, model: string
  ): Observable<IbendingPrcPlanDts[]> {
    const url = `${this.baseUrl}CNC/getCpyPrcddl`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('MachineCode', machineCode)
      .set('KVA', kva).set('Model', model).set('PlanCode', '0').set('CatID', '0');
    this.logUrl('GET', 'BendGetPlanDts', url, params);
    return this.http.get<IbendingPrcPlanDts[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  BendGetCpyKit(
    machineCode: string, pcCode: string, planCode: string, partCode: string
  ): Observable<IbendingprcloadCpyKit[]> {
    const url = `${this.baseUrl}Bending/GetCpyKit`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('MachineCode', machineCode)
      .set('PlanCode', planCode)
      .set('Partcode', partCode)
      .set('CpyKit', '0');
    this.logUrl('GET', 'BendGetCpyKit', url, params);
    return this.http.get<IbendingprcloadCpyKit[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  BendGetCpyKitQty(
    machineCode: string, cpyKit: string, pcCode: string, planCode: string, partCode: string
  ): Observable<IbendingprcloadCpyKitQty[]> {
    const url = `${this.baseUrl}Bending/GetCpyKit`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('MachineCode', machineCode)
      .set('PlanCode', planCode)
      .set('Partcode', partCode)
      .set('CpyKit', cpyKit);
    this.logUrl('GET', 'BendGetCpyKitQty', url, params);
    return this.http.get<IbendingprcloadCpyKitQty[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  BendGetCpyKitDts(
    pcCode: string, cpyKit: string, bomCode: string, planQty: number
  ): Observable<IBendingPrcPartDts[]> {
    const url = `${this.baseUrl}Bending/GetCpyKitDts`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('BatchQty', String(planQty))
      .set('CpyKitcode', cpyKit)
      .set('BOMCode', bomCode)
      .set('PFBCode', 'NEW');
    this.logUrl('GET', 'BendGetCpyKitDts', url, params);
    return this.http.get<IBendingPrcPartDts[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  BendGetEndPrcPartDts(pcCode: string, pfbCode: string): Observable<IBendingPrcPartDts[]> {
    const url = `${this.baseUrl}Bending/GetCpyKitDts`;
    const params = new HttpParams()
      .set('PCCode', pcCode)
      .set('BatchQty', '0')
      .set('CpyKitcode', '0')
      .set('BOMCode', '0')
      .set('PFBCode', pfbCode);
    this.logUrl('GET', 'BendGetEndPrcPartDts', url, params);
    return this.http.get<IBendingPrcPartDts[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  /** POST: submit the bending process. Returns the server status string. */
  postBendSave(payload: IbendingprcSave): Observable<string> {
    const url = `${this.baseUrl}Bending/BendingSubmit`;
    this.logUrl('POST', 'postBendSave', url, payload);
    return this.http.post(url, payload, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'text'
    }).pipe(catchError(this.handleError));
  }
}
