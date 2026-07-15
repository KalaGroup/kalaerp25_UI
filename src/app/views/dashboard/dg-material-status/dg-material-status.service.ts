import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';

/* ---- Response / Request shapes ---- */

/** Department dropdown item = ProfitCenter (with line). */
export interface MaterialDept {
  deptCode: string;     // ProfitCenter.PCCode
  deptName: string;     // ProfitCenter.PCName  (e.g. "Unit 1 Line A BENDING")
}

/** KVA option for the Plan dropdown (from GetActivePartKVAList). */
export interface KvaOption {
  kva: number;
}

/** One saved material row (View grid). Identity = (MCode, SrNo). */
export interface MaterialRecord {
  mcode: string;
  srNo: number;
  date: string;
  companyCode: string;      // owning company (LEFT(PCCode,2)) — for the company picker
  deptCode: string;
  deptName: string;
  plan: string;
  planQuantity: number;     // renamed from quantity
  materialType: string;
  partCode: string;         // Raw: Part.PartCode; others blank
  partName: string;
  shortageQty: number;      // 0 = no shortage
  status: string;           // Open / Closed / InProcess
  remark: string;
  person: string;
  espReqCode: string;       // COR number if an ESP was raised; '' = not yet
}

/** One entry line to save. */
export interface MaterialEntryPayload {
  plan: string;
  planQuantity: number;
  materialType: string;     // Raw / Consumable / Spares / Tools
  partCode: string;
  partName: string;
  shortageQty: number;
  status: string;
  remark: string;
  person: string;
}

/** Company option for the picker (33 -> 01/03/28). */
export interface CompanyOption {
  companyCode: string;
  companyName: string;
  shortName: string;
}

/** Part option for the Raw part dropdown. */
export interface PartOption {
  partCode: string;
  partName: string;
}

/** Employee option for the person dropdown. */
export interface EmployeeOption {
  eCode: string;
  empName: string;
}

/** ESP target employee (from the ERP20 API, via our proxy). */
export interface EspEmployee {
  eCode: string;
  fullName: string;
  profitCenter: string;
  pcCode: string;
}

/** Raise-ESP request (proxied to ERP20 /Corporate/CorporateReq/Submit). */
export interface EspRaisePayload {
  empCode: string;       // raiser (session user)
  fromPCCode: string;    // requesting department (record's PC code)
  toEmpCode: string;
  toPCCode: string;
  priority: string;      // High Priority / Medium Priority / Low Priority
  reqMsg: string;
  companyCode: string;
  targetDate: string;    // "yyyy-MM-dd" — selected by the user
  mcode: string;         // material line to stamp
  srNo: number;
}

/** Dated shortage row for the charts. */
export interface MaterialTrendRow {
  date: string;
  companyCode: string;
  deptName: string;
  plan: string;
  materialType: string;
  partCode: string;
  partName: string;
  shortageQty: number;
  status: string;
  person: string;
}

/** Whole department's material for one date, saved in one transaction. */
export interface SaveMaterialBatchRequest {
  date: string;             // yyyy-MM-dd
  companyCode: string;
  deptCode: string;
  deptName: string;
  createdBy: string;
  entries: MaterialEntryPayload[];
}

@Injectable({ providedIn: 'root' })
export class DgMaterialStatusService {
  private baseUrl = environment.apiURL; // ends with .../api/

  private apiDepartments = `${this.baseUrl}Material/GetDepartments`;
  private apiKva         = `${this.baseUrl}Quality/GetActivePartKvaList`; // reuse existing SP
  private apiSaveBatch   = `${this.baseUrl}Material/SaveMaterialBatch`;
  private apiRecords     = `${this.baseUrl}Material/GetMaterialRecords`;
  private apiDelete      = `${this.baseUrl}Material/DeleteMaterialRecord`;
  private apiViewCompanies = `${this.baseUrl}Material/GetViewCompanies`;
  private apiParts       = `${this.baseUrl}Material/GetPartsByKva`;
  private apiEmployees   = `${this.baseUrl}Material/GetEmployees`;
  private apiTrend       = `${this.baseUrl}Material/GetTrend`;
  private apiEspEmps     = `${this.baseUrl}Material/GetEspEmployees`;
  private apiEspRaise    = `${this.baseUrl}Material/RaiseEsp`;

  constructor(private http: HttpClient) {}

  /** Company code from the logged-in session. */
  get companyCode(): string {
    return localStorage.getItem('companyId') || '';
  }

  /** User id from the logged-in session (for CreatedBy/ModifiedBy). */
  get sessionUser(): string {
    return localStorage.getItem('APP_USER_ID') || '';
  }

  /** Company name for export headers (falls back if the key isn't set). */
  get companyName(): string {
    return (
      localStorage.getItem('companyName') ||
      localStorage.getItem('CompanyName') ||
      'Kala Genset Pvt Ltd'
    );
  }

  /** Departments (profit centers with lines) for the company. */
  getDepartments(companyCode: string): Observable<MaterialDept[]> {
    const params = new HttpParams().set('companyCode', companyCode);
    return this.http.get<any[]>(this.apiDepartments, { params }).pipe(
      map((rows) => (rows || []).map((x) => ({ deptCode: x.DeptCode, deptName: x.DeptName }))),
    );
  }

  /** KVA list for the Plan dropdown (reuses Quality/GetActivePartKvaList → column KVA). */
  getKvaList(): Observable<KvaOption[]> {
    return this.http.get<any[]>(this.apiKva).pipe(
      map((rows) => (rows || []).map((x) => ({ kva: x.KVA }))),
    );
  }

  /** Saved records for a date (+ optional department). */
  getMaterialRecords(date: string | null, deptCode: string | null): Observable<MaterialRecord[]> {
    let params = new HttpParams().set('companyCode', this.companyCode);
    if (date) params = params.set('date', date);
    if (deptCode) params = params.set('deptCode', deptCode);
    return this.http.get<any[]>(this.apiRecords, { params }).pipe(
      map((rows) =>
        (rows || []).map((x) => ({
          mcode: x.MCode,
          srNo: x.SrNo,
          date: x.Date,
          companyCode: x.CompanyCode || '',
          deptCode: x.DeptCode,
          deptName: x.DeptName,
          plan: x.Plan,
          planQuantity: x.PlanQuantity,
          materialType: x.MaterialType,
          partCode: x.PartCode || '',
          partName: x.PartName || '',
          shortageQty: x.ShortageQty || 0,
          status: x.Status,
          remark: x.Remark || '',
          person: x.Person,
          espReqCode: x.EspReqCode || '',
        })),
      ),
    );
  }

  /** Companies the login may view for (33 -> 01/03/28, else self). */
  getViewCompanies(): Observable<CompanyOption[]> {
    const params = new HttpParams().set('companyCode', this.companyCode);
    return this.http.get<any[]>(this.apiViewCompanies, { params }).pipe(
      map((res) => (res || []).map((c) => ({ companyCode: c.CompanyCode, companyName: c.CompanyName, shortName: c.ShortName }))),
    );
  }

  /** Parts for a Plan (KVA) — the Raw part dropdown. */
  getPartsByKva(kva: string): Observable<PartOption[]> {
    const params = new HttpParams().set('kva', kva);
    return this.http.get<any[]>(this.apiParts, { params }).pipe(
      map((res) => (res || []).map((p) => ({ partCode: p.PartCode, partName: p.PartName }))),
    );
  }

  /** Employees for the person-to-communicate dropdown. */
  getEmployees(): Observable<EmployeeOption[]> {
    return this.http.get<any[]>(this.apiEmployees).pipe(
      map((res) => (res || []).map((e) => ({ eCode: e.ECode, empName: e.EmpName }))),
    );
  }

  /** ESP target employees (with PC codes). */
  getEspEmployees(): Observable<EspEmployee[]> {
    return this.http.get<any[]>(this.apiEspEmps).pipe(
      map((res) => (res || []).map((e) => ({
        eCode: e.ECode, fullName: e.FullName,
        profitCenter: e.ProfitCenter, pcCode: e.Pccode,
      }))),
    );
  }

  /** Raise the ESP for a shortage line. */
  raiseEsp(p: EspRaisePayload): Observable<any> {
    return this.http.post(this.apiEspRaise, {
      EmpCode: p.empCode, FromPCCode: p.fromPCCode,
      ToEmpCode: p.toEmpCode, ToPCCode: p.toPCCode,
      Priority: p.priority, ReqMsg: p.reqMsg, CompanyCode: p.companyCode,
      TargetDate: p.targetDate,
      MCode: p.mcode, SrNo: p.srNo,
    });
  }

  /** Dated shortage rows across a range for the charts. */
  getTrend(fromDate: string, toDate: string): Observable<MaterialTrendRow[]> {
    const params = new HttpParams()
      .set('companyCode', this.companyCode)
      .set('fromDate', fromDate)
      .set('toDate', toDate);
    return this.http.get<any[]>(this.apiTrend, { params }).pipe(
      map((res) =>
        (res || []).map((x) => ({
          date: x.Date,
          companyCode: x.CompanyCode || '',
          deptName: x.DeptName,
          plan: x.Plan,
          materialType: x.MaterialType,
          partCode: x.PartCode || '',
          partName: x.PartName || '',
          shortageQty: x.ShortageQty || 0,
          status: x.Status || '',
          person: x.Person || '',
        })),
      ),
    );
  }

  /** Save the whole batch in one transaction (upsert on the server). */
  saveMaterialBatch(payload: SaveMaterialBatchRequest): Observable<any> {
    return this.http.post(this.apiSaveBatch, payload);
  }

  /** Soft-delete one material line by its MCode + SrNo. */
  deleteMaterialRecord(mcode: string, srNo: number): Observable<any> {
    const params = new HttpParams()
      .set('mcode', mcode)
      .set('srNo', String(srNo))
      .set('modifiedBy', this.sessionUser);
    return this.http.delete(this.apiDelete, { params });
  }
}