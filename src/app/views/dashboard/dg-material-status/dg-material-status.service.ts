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
  deptCode: string;
  deptName: string;
  plan: string;
  materialType: string;
  quantity: number;
  status: string;
  person: string;
}

/** One entry line to save. */
export interface MaterialEntryPayload {
  plan: string;
  materialType: string;     // Raw / Consumable / Spares / Tools
  quantity: number;
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
          deptCode: x.DeptCode,
          deptName: x.DeptName,
          plan: x.Plan,
          materialType: x.MaterialType,
          quantity: x.Quantity,
          status: x.Status,
          person: x.Person,
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