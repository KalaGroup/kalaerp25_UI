import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

// Mirrors LineDto returned by DGAssemblly/GetLineRights.
export interface LineRight {
  LineWisePC: string;
  LineDesc:   string;
  ParentDgPC: string;
}

export interface CanopyPlanPartOption {
  PartCode: string;
  PartDesc: string;          // "<desc>--><partcode>"
  BomCode:  string;
  UName:    string;
}

export interface CanopyPlanPartContext {
  PartCode: string;
  BomCode:  string;
  StkQty:   number;
  PendQty:  number;
}

// Row returned by SP getcpyplandts_checker_maker — already filtered by KVA
// tier for the selected line.
export interface CanopyPlanCheckerMakerRow {
  BOMCode:  string;
  PartDesc: string;
  PartCode: string;
  UName:    string;
  KVA:      number;
  StkQty:   number;
  PendQty:  number;
}

export interface CanopyPlanRow {
  Dt:       string;          // 'YYYY-MM-DD'
  PartCode: string;
  PartDesc: string;
  BomCode:  string;
  Qty:      number;
  StkQty:   number;
  PendQty:  number;
}

export interface SubmitCanopyPlanRequest {
  PCCode:      string;       // LineWisePC
  ParentDgPC:  string;       // ParentDgPC of the selected line (used as pcCode_Old)
  CompanyCode: string;
  EmpCode:     string;
  FromDt:      string;       // 'YYYY-MM-DD'
  ToDt:        string;       // 'YYYY-MM-DD'
  Rows:        CanopyPlanRow[];
}

export interface SubmitCanopyPlanResponse {
  Message: string;
  CPCode:  string;
}

@Injectable({ providedIn: 'root' })
export class CanopyAssemblyPlanService {
  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  // Lines this position role is entitled to plan against — reuses the
  // existing endpoint on DGAssemblyController.
  getLineRights(prmCode: string): Observable<LineRight[]> {
    const url = `${this.baseUrl}DGAssemblly/GetLineRights?prmCode=${encodeURIComponent(prmCode)}`;
    return this.http.get<LineRight[]>(url);
  }

  // Lazy-load part dropdown — server enforces minLength 2.
  getPartOptions(searchText: string, pcCode: string): Observable<CanopyPlanPartOption[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyPlanPartOptions`
      + `?searchText=${encodeURIComponent(searchText || '')}`
      + `&pcCode=${encodeURIComponent(pcCode)}`;
    return this.http.get<CanopyPlanPartOption[]>(url);
  }

  // SP getcpyplandts_checker_maker — fetches all candidate canopy parts for
  // the selected line (KVA tier applied inside the SP).
  getCheckerMakerRows(lineWisePC: string): Observable<CanopyPlanCheckerMakerRow[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyPlanCheckerMakerRows`
      + `?lineWisePC=${encodeURIComponent(lineWisePC)}`;
    return this.http.get<CanopyPlanCheckerMakerRow[]>(url);
  }

  // Auto-fill BOM Code + Stock Qty + Pending Qty after selection.
  getPartContext(partCode: string, pcCode: string): Observable<CanopyPlanPartContext> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyPlanPartContext`
      + `?partCode=${encodeURIComponent(partCode)}`
      + `&pcCode=${encodeURIComponent(pcCode)}`;
    return this.http.get<CanopyPlanPartContext>(url);
  }

  // Save plan — full transaction (master + N details + 2 auto-REQs per row).
  submit(req: SubmitCanopyPlanRequest): Observable<SubmitCanopyPlanResponse> {
    return this.http.post<SubmitCanopyPlanResponse>(
      `${this.baseUrl}CanopyAssembly/SubmitCanopyPlan`, req);
  }
}
