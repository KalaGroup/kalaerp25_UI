import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';

// Mirrors LineDto returned by DGAssemblly/GetLineRights.
// Kept in the service for now — the component no longer uses it since the
// dropdown was switched to KVA-based selection, but downstream code (submit
// payload) still passes PCCode. Left in the service surface for flexibility.
export interface LineRight {
  LineWisePC: string;
  LineDesc:   string;
  ParentDgPC: string;
}

// One row returned by Quality/GetActivePartKvaList — the same source the
// dg-material-status form uses. Parameterless GET, returns a list of KVAs
// currently active on the Part master.
export interface KvaOption {
  KVA: number;
}

// One row returned by ControlPanelBox/GetPlanRowsByKva — the new backend
// endpoint that filters Control Panel Box BOMs by KVA.
export interface ControlPanelBoxPlanRow {
  BOMCode:  string;
  PartDesc: string;   // "<desc>-->--<KitCode>" — already formatted server-side
  KitCode:  string;
  UName:    string;
}

// Payload for POST ControlPanelBox/SubmitPlan. PCCode / CompanyCode /
// PCCode_Act / Checker1 are all hardcoded server-side — do not send them.
export interface SubmitControlPanelBoxPlanRow {
  Dt:       string;    // 'YYYY-MM-DD'
  PartCode: string;    // KitCode
  PartDesc: string;
  BomCode:  string;
  Qty:      number;
}
export interface SubmitControlPanelBoxPlanRequest {
  EmpCode: string;
  FromDt:  string;     // 'YYYY-MM-DD'
  ToDt:    string;     // 'YYYY-MM-DD'
  Rows:    SubmitControlPanelBoxPlanRow[];
}
export interface SubmitControlPanelBoxPlanResponse {
  Message: string;
  CPCode:  string;
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

// NOTE: The endpoint URLs below still point at the CanopyAssembly controller.
// UI-first phase — the Control Panel Plan backend is not wired yet. Once the
// server-side controller is added, swap the base paths to
// `ControlPanelPlan/...` (or whatever the final controller is named).
@Injectable({ providedIn: 'root' })
export class ControlPanelPlanService {
  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  // Lines this position role is entitled to plan against — reuses the
  // existing endpoint on DGAssemblyController.
  // Kept for compatibility; the control-panel-plan UI now uses KVA-based
  // selection instead, but downstream save paths may still consume it.
  getLineRights(prmCode: string): Observable<LineRight[]> {
    const url = `${this.baseUrl}DGAssemblly/GetLineRights?prmCode=${encodeURIComponent(prmCode)}`;
    return this.http.get<LineRight[]>(url);
  }

  // KVA dropdown source — the same parameterless endpoint the
  // dg-material-status "Plan (KVA)" dropdown uses (Quality/GetActivePartKvaList
  // → column `KVA`). Reused verbatim so we don't spin up a redundant SP.
  getKvaList(): Observable<KvaOption[]> {
    const url = `${this.baseUrl}Quality/GetActivePartKvaList`;
    return this.http.get<any[]>(url).pipe(
      map(rows => (rows || []).map(r => ({ KVA: Number(r?.KVA ?? 0) }))),
    );
  }

  // Candidate Control Panel Box BOMs filtered by the picked KVA.
  // Backed by the new ControlPanelBox controller (TOP 25 rows, ordered by PartDesc).
  getPlanRowsByKva(kva: string): Observable<ControlPanelBoxPlanRow[]> {
    const url = `${this.baseUrl}ControlPanelBox/GetPlanRowsByKva?kva=${encodeURIComponent(kva)}`;
    return this.http.get<ControlPanelBoxPlanRow[]>(url);
  }

  // Save the manual Control Panel Plan — header-only insert for now
  // (step 1). CanopyPlanDetails per-row insert comes in step 2, when the
  // backend adds a details-insert branch to SubmitPlanAsync.
  submitPlan(req: SubmitControlPanelBoxPlanRequest): Observable<SubmitControlPanelBoxPlanResponse> {
    return this.http.post<SubmitControlPanelBoxPlanResponse>(
      `${this.baseUrl}ControlPanelBox/SubmitPlan`, req);
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
