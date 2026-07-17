import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';

import { IcncprcloadMachine }    from './Model/cncprcloadMachine';
import { IcncprcloadOSSupplier } from './Model/cncprcloadOSSupplier';
import { IcncprcloadCatID }      from './Model/cncprcloadCatID ';
import { IcncprcloadProduct }    from './Model/cncprcloadProduct';
import { IcncprcloadKVA }        from './Model/cncprcloadKVA';
import { IcncprcloadModel }      from './Model/cncprcloadModel';
import { ICncPrcPlanDts }        from './Model/CncPrcPlanDts';
import { IcncprcloadSheet }      from './Model/cncprcloadSheet';
import { IcncprcloadSheetSrno }  from './Model/cncprcloadSheetSrno';
import { IcncprcSheetQtyWt }     from './Model/cncprcSheetQtyWt';
import { IcncprcloadSheetStk }   from './Model/cncprcloadSheetStk ';
import { ICncPrcPartDts }        from './Model/CncPrcPartDts';
import { ICncPrcEndDts }         from './Model/CncPrcEndDts';
import { IcncprcSave }           from './Model/cncprcSave';

/**
 * CNC Maker service — dropdowns, plan, sheet & kit lookups, submit.
 * The CNC Checker has its own service (cnc-checker/cncchecker.service.ts).
 */
@Injectable({ providedIn: 'root' })
export class CncprcService {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  /** Logs every outgoing request URL so it's visible in F12 → Console. */
  private logUrl(method: string, label: string, url: string, params?: HttpParams | object): void {
    if (params instanceof HttpParams) {
      const qs = params.toString();
      // eslint-disable-next-line no-console
      console.log(`[CncprcService] ${method} ${label} → ${url}${qs ? '?' + qs : ''}`);
    } else if (params && typeof params === 'object') {
      // eslint-disable-next-line no-console
      console.log(`[CncprcService] ${method} ${label} → ${url}`, params);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[CncprcService] ${method} ${label} → ${url}`);
    }
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Status:', error.status);
    console.error('Body:', error.error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }

  // ─── CNC Maker ──────────────────────────────────────────────────────────────

  LoadMachine(PCCode: string): Observable<IcncprcloadMachine[]> {
    const url = `${this.baseUrl}CNC/LoadMachine?PCCode=${PCCode}`;
    this.logUrl('GET', 'LoadMachine', url);
    return this.http.get<IcncprcloadMachine[]>(url);
  }

  LoadOSSupplier(PCCode: string): Observable<IcncprcloadOSSupplier[]> {
    const url = `${this.baseUrl}CNC/LoadOSSupplier?PCCode=${PCCode}`;
    this.logUrl('GET', 'LoadOSSupplier', url);
    return this.http.get<IcncprcloadOSSupplier[]>(url);
  }

  LoadCatID(PCCode: string, PlanCode: string): Observable<IcncprcloadCatID[]> {
    const url = `${this.baseUrl}CNC/LoadCatID?PCCode=${PCCode}&PlanCode=${PlanCode}`;
    this.logUrl('GET', 'LoadCatID', url);
    return this.http.get<IcncprcloadCatID[]>(url);
  }

  LoadProduct(PCCode: string): Observable<IcncprcloadProduct[]> {
    const url = `${this.baseUrl}CNC/LoadProduct?PCCode=${PCCode}`;
    this.logUrl('GET', 'LoadProduct', url);
    return this.http.get<IcncprcloadProduct[]>(url);
  }

  getKVA(PCCode: string, ddlMachine: string): Observable<IcncprcloadKVA[]> {
    const url = `${this.baseUrl}CNC/getCpyPrcddl?PCCode=${PCCode}&MachineCode=${ddlMachine}&KVA=0&Model=0&PlanCode=0&CatID=0`;
    this.logUrl('GET', 'getKVA', url);
    return this.http.get<IcncprcloadKVA[]>(url);
  }

  getModel(PCCode: string, ddlMachine: string, ddlKVA: string): Observable<IcncprcloadModel[]> {
    const url = `${this.baseUrl}CNC/getCpyPrcddl?PCCode=${PCCode}&MachineCode=${ddlMachine}&KVA=${ddlKVA}&Model=0&PlanCode=0&CatID=0`;
    this.logUrl('GET', 'getModel', url);
    return this.http.get<IcncprcloadModel[]>(url);
  }

  getPlanDts(
    PCCode: string, ddlMachine: string, ddlKVA: string, ddlModel: string
  ): Observable<ICncPrcPlanDts[]> {
    const url = `${this.baseUrl}CNC/getCpyPrcddl?PCCode=${PCCode}&MachineCode=${ddlMachine}&KVA=${ddlKVA}&Model=${ddlModel}&PlanCode=0&CatID=0`;
    this.logUrl('GET', 'getPlanDts', url);
    return this.http.get<ICncPrcPlanDts[]>(url);
  }

  getcatID(
    
    PCCode: string, ddlMachine: string, ddlKVA: string, ddlModel: string, Partcode: string
  ): Observable<IcncprcloadCatID[]> {
    const url = `${this.baseUrl}CNC/getCpyPrcddl?PCCode=${PCCode}&MachineCode=${ddlMachine}&KVA=${ddlKVA}&Model=${ddlModel}&PlanCode=${Partcode}&CatID=0`;
    this.logUrl('GET', 'getcatID', url);
    return this.http.get<IcncprcloadCatID[]>(url);
  }

  getSheet(
    PCCode: string, ddlMachine: string, PlanCode: string, Partcode: string, CatID: string
  ): Observable<IcncprcloadSheet[]> {
    const url = `${this.baseUrl}CNC/getSheetPartDts?PCCode=${PCCode}&SheetSrNo=0&MachineCode=${ddlMachine}&SheetPartcode=0&PlanCode=${PlanCode}&Partcode=${Partcode}&CatID=${CatID}`;
    this.logUrl('GET', 'getSheet', url);
    return this.http.get<IcncprcloadSheet[]>(url);
  }

  getSheetSrno(
    PCCode: string, ddlMachine: string, PlanCode: string, Partcode: string,
    SheetPart: string, CatID: string
  ): Observable<IcncprcloadSheetSrno[]> {
    const url = `${this.baseUrl}CNC/getSheetPartDts?PCCode=${PCCode}&SheetSrNo=0&MachineCode=${ddlMachine}&SheetPartcode=${SheetPart}&PlanCode=${PlanCode}&Partcode=${Partcode}&CatID=${CatID}`;
    this.logUrl('GET', 'getSheetSrno', url);
    return this.http.get<IcncprcloadSheetSrno[]>(url);
  }

  getSheetSrnoDts(
    PCCode: string, ddlMachine: string, PlanCode: string, Partcode: string,
    SheetPart: string, SheetSrno: number, CatID: string
  ): Observable<IcncprcSheetQtyWt[]> {
    const url = `${this.baseUrl}CNC/getSheetPartDts?PCCode=${PCCode}&SheetSrNo=${SheetSrno}&MachineCode=${ddlMachine}&SheetPartcode=${SheetPart}&PlanCode=${PlanCode}&Partcode=${Partcode}&CatID=${CatID}`;
    this.logUrl('GET', 'getSheetSrnoDts', url);
    return this.http.get<IcncprcSheetQtyWt[]>(url);
  }

  GetSheetStk(PCCode: string, TkitId: string): Observable<IcncprcloadSheetStk[]> {
    const url = `${this.baseUrl}CNC/GetTKitDts?PCCode=${PCCode}&TKitID=${TkitId}&BatchQty=0&TrnsType=Stk&PlanCode=0&ProdCode=0`;
    this.logUrl('GET', 'GetSheetStk', url);
    return this.http.get<IcncprcloadSheetStk[]>(url);
  }

  GetEndPrcPartDts(
    PCCode: string, TkitId: string, PlanCode: string, Partcode: string
  ): Observable<ICncPrcPartDts[]> {
    const url = `${this.baseUrl}CNC/GetTKitDts?PCCode=${PCCode}&TKitID=${TkitId}&BatchQty=0&TrnsType=End&PlanCode=${PlanCode}&ProdCode=${Partcode}`;
    this.logUrl('GET', 'GetEndPrcPartDts', url);
    return this.http.get<ICncPrcPartDts[]>(url);
  }

  GetPartDts(
    PCCode: string, TkitId: string, PlanQty: number, PlanCode: string, Partcode: string
  ): Observable<ICncPrcPartDts[]> {
    const url = `${this.baseUrl}CNC/GetTKitDts?PCCode=${PCCode}&TKitID=${TkitId}&BatchQty=${PlanQty}&TrnsType=KitDts&PlanCode=${PlanCode}&ProdCode=${Partcode}`;
    this.logUrl('GET', 'GetPartDts', url);
    return this.http.get<ICncPrcPartDts[]>(url);
  }

  GetCNCEndPrcDts(
    PCCode: string, PlanCode: string, Partcode: string
  ): Observable<ICncPrcEndDts[]> {
    const url = `${this.baseUrl}CNC/GetCpyEndPrcDts?PCCode=${PCCode}&PlanCode=${PlanCode}&PartCode=${Partcode}`;
    this.logUrl('GET', 'GetCNCEndPrcDts', url);
    return this.http.get<ICncPrcEndDts[]>(url);
  }

  /** POST CNC/CncSubmit — controller returns Ok(result) as a text body. */
  postCNCSave(cncprcSave: IcncprcSave): Observable<string> {
    const url = `${this.baseUrl}CNC/CncSubmit`;
    this.logUrl('POST', 'postCNCSave', url, cncprcSave);
    return this.http.post(url, cncprcSave, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'text'
    }).pipe(catchError((err) => this.handleError(err)));
  }

}
