import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';

/* ---- Response/Request shapes ---- */
export interface DepartmentOption {
  pcId: number;        // ProfitCenter.PC_ID  (GDD master keys on PC_ID)
  pcCode: string;      // ProfitCenter.PCCode
  pcName: string;      // ProfitCenter.PCName
}

export interface StationOption {
  wkCode: string;              // WorkStation.WKCode
  workStationName: string;
  sancSkilled: number;         // W3 (from master)
  sancSemi: number;            // W2
  sancUnskilled: number;       // W1
}

export interface ManpowerEntry {
  wkCode: string;
  workStationName: string;
  sancSkilled: number;
  sancSemi: number;
  sancUnskilled: number;
  availSkilled: number;
  availSemi: number;
  availUnskilled: number;
  absent: number;
  remark: string;
}

export interface SaveManpowerBatchRequest {
  date: string;            // 'yyyy-MM-dd'
  shift: string;           // 'F' / 'S'
  companyCode: string;
  pcId: number;            // matches .NET PcId
  pcCode: string;          // matches .NET PcCode
  createdBy: string;
  entries: ManpowerEntry[];
}

export interface ManpowerRecord {
  mcode: string;           // 6MManpowerStatus.MCode  (delete key, part 1)
  srNo: number;            // 6MManpowerStatusDetails.SrNo  (delete key, part 2)
  date: string;
  companyCode: string;     // owning company (LEFT(PCCode,2)) — for the chart company picker
  shift: string;           // 'F' / 'S'
  pcId: number;
  pcName: string;
  wkCode: string;
  workStationName: string;
  sancSkilled: number;
  sancSemi: number;
  sancUnskilled: number;
  availSkilled: number;
  availSemi: number;
  availUnskilled: number;
  shortSkilled: number;
  shortSemi: number;
  shortUnskilled: number;
  absent: number;
  remark: string;
}

export interface ShortageTrendRow {
  date: string;
  companyCode: string;      // owning company (for the chart company picker)
  pcName: string;
  workStationName: string;
  shortTotal: number;
  absent: number;
}

export interface CompanyOption {
  companyCode: string;      // '01' / '03' / '28'
  companyName: string;
  shortName: string;
}

@Injectable({
  providedIn: 'root',
})
export class DgManpowerStatusService {
  private baseUrl = environment.apiURL; // ends with .../api/

  private apiViewCompanies = `${this.baseUrl}ManpowerStatus/GetViewCompanies`;
  private apiDepartments = `${this.baseUrl}ManpowerStatus/GetDepartments`;
  private apiStations    = `${this.baseUrl}ManpowerStatus/GetStations`;
  private apiRecords     = `${this.baseUrl}ManpowerStatus/GetManpowerRecords`;
  private apiSaveBatch   = `${this.baseUrl}ManpowerStatus/SaveManpowerBatch`;
  private apiDelete      = `${this.baseUrl}ManpowerStatus/DeleteManpowerRecord`;
  private apiTrend       = `${this.baseUrl}ManpowerStatus/GetShortageTrend`;

  constructor(private http: HttpClient) {}

  /** Company code from the logged-in session. */
  get companyCode(): string {
    return localStorage.getItem('companyId') || '';
  }

  /** Company name for export headers (falls back if the key isn't set). */
  get companyName(): string {
    return (
      localStorage.getItem('companyName') ||
      localStorage.getItem('CompanyName') ||
      localStorage.getItem('company_name') ||
      'Kala Genset Pvt Ltd'
    );
  }

  /** User id from the logged-in session (for CreatedBy/ModifiedBy). */
  get sessionUser(): string {
    return localStorage.getItem('APP_USER_ID') || '';
  }

  /** Companies the login may view charts for (33 -> 01/03/28, else self). */
  getViewCompanies(): Observable<CompanyOption[]> {
    const params = new HttpParams().set('companyCode', this.companyCode);
    return this.http.get<any[]>(this.apiViewCompanies, { params }).pipe(
      map((res) =>
        (res || []).map((c) => ({
          companyCode: c.CompanyCode,
          companyName: c.CompanyName,
          shortName: c.ShortName,
        })),
      ),
    );
  }

  /** Departments dropdown — ProfitCenters that have W1/W2/W3 sanctioned stations. */
  getDepartments(): Observable<DepartmentOption[]> {
    const params = new HttpParams().set('companyCode', this.companyCode);
    return this.http.get<any[]>(this.apiDepartments, { params }).pipe(
      map((res) =>
        (res || []).map((d) => ({
          pcId: d.PcId,
          pcCode: d.PcCode,
          pcName: d.PcName,
        })),
      ),
    );
  }

  /** Stations for the chosen department, each with sanctioned headcount by skill. */
  getStations(pcId: number): Observable<StationOption[]> {
    const params = new HttpParams()
      .set('pcId', String(pcId))
      .set('companyCode', this.companyCode);
    return this.http.get<any[]>(this.apiStations, { params }).pipe(
      map((res) =>
        (res || []).map((s) => ({
          wkCode: s.WkCode,
          workStationName: s.WorkStationName,
          sancSkilled: s.SancSkilled,
          sancSemi: s.SancSemi,
          sancUnskilled: s.SancUnskilled,
        })),
      ),
    );
  }

  /** Map an API record (PascalCase) to the UI model. */
  private toRecord = (x: any): ManpowerRecord => ({
    mcode: x.MCode,
    srNo: x.SrNo,
    date: x.Date,
    companyCode: x.CompanyCode || '',
    shift: x.Shift,
    pcId: x.PcId,
    pcName: x.PcName,
    wkCode: x.WkCode,
    workStationName: x.WorkStationName,
    sancSkilled: x.SancSkilled,
    sancSemi: x.SancSemi,
    sancUnskilled: x.SancUnskilled,
    availSkilled: x.AvailSkilled,
    availSemi: x.AvailSemi,
    availUnskilled: x.AvailUnskilled,
    shortSkilled: x.ShortSkilled,
    shortSemi: x.ShortSemi,
    shortUnskilled: x.ShortUnskilled,
    absent: x.Absent,
    remark: x.Remark,
  });

  /** Saved records for the View grid (filtered by date / shift / department). */
  getManpowerRecords(date: string, shift: string, pcId: number | null): Observable<ManpowerRecord[]> {
    let params = new HttpParams().set('companyCode', this.companyCode);
    if (date) params = params.set('date', date);
    if (shift) params = params.set('shift', shift);
    if (pcId) params = params.set('pcId', String(pcId));
    return this.http.get<any[]>(this.apiRecords, { params }).pipe(
      map((res) => (res || []).map(this.toRecord)),
    );
  }

  /** Values already saved for this date+shift+department — used to pre-fill the Edit form.
   *  Carries the FROZEN sanctioned snapshot so history isn't rewritten by master changes. */
  getManpowerByDate(date: string, shift: string, pcId: number): Observable<ManpowerEntry[]> {
    return this.getManpowerRecords(date, shift, pcId).pipe(
      map((rows) =>
        rows.map((r) => ({
          wkCode: r.wkCode,
          workStationName: r.workStationName,
          sancSkilled: r.sancSkilled,
          sancSemi: r.sancSemi,
          sancUnskilled: r.sancUnskilled,
          availSkilled: r.availSkilled,
          availSemi: r.availSemi,
          availUnskilled: r.availUnskilled,
          absent: r.absent,
          remark: r.remark,
        })),
      ),
    );
  }

  /** Records across a date range for the Daily / Weekly / Monthly shortage charts. */
  getShortageTrend(fromDate: string, toDate: string): Observable<ShortageTrendRow[]> {
    const params = new HttpParams()
      .set('companyCode', this.companyCode)
      .set('fromDate', fromDate)
      .set('toDate', toDate);
    return this.http.get<any[]>(this.apiTrend, { params }).pipe(
      map((res) =>
        (res || []).map((x) => ({
          date: x.Date,
          companyCode: x.CompanyCode || '',
          pcName: x.PcName,
          workStationName: x.WorkStationName,
          shortTotal: x.ShortTotal,
          absent: x.Absent,
        })),
      ),
    );
  }

  /** Save the whole batch in one transaction (upsert on the server; sanctioned frozen). */
  saveManpowerBatch(payload: SaveManpowerBatchRequest): Observable<any> {
    return this.http.post(this.apiSaveBatch, payload);
  }

  /** Soft-delete one station line, identified by its MCode + SrNo. */
  deleteManpowerRecord(mcode: string, srNo: number): Observable<any> {
    const params = new HttpParams()
      .set('mcode', mcode)
      .set('srNo', String(srNo))
      .set('modifiedBy', this.sessionUser);
    return this.http.delete(this.apiDelete, { params });
  }
}

/** Display label for a shift code. */
export function shiftLabel(code: string): string {
  if (code === 'F') return 'Ist';
  if (code === 'S') return 'IInd';
  return code || '';
}