import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';

/* ---- Response/Request shapes ---- */
export interface DepartmentOption {
  departmentCode: string;   // = WorkStation.DeptCode (= ProfitCenter.PCCode)
  departmentName: string;   // = ProfitCenter.PCName
}

export interface MachineOption {
  machineCode: string;      // = WorkStation.WKCode
  machineName: string;      // = WorkStation.WorkStationName
}

export interface DownTimeEntry {
  machineCode: string;
  machineName: string;
  shift1Min: number;
  shift2Min: number;
  totalMin: number;
  lineShift1Min: number;
  lineShift2Min: number;
  lineTotalMin: number;
  status: string;          // 'Open' / 'Closed' / ''
  remark: string;
}

export interface SaveDownTimeBatchRequest {
  date: string;             // 'yyyy-MM-dd'
  companyCode: string;
  deptCode: string;         // must match the .NET DTO property DeptCode
  deptName: string;         // must match the .NET DTO property DeptName
  createdBy: string;
  entries: DownTimeEntry[];
}

export interface DownTimeRecord {
  mcode: string;            // 6MMachineDownTime.MCode  (delete key, part 1)
  srNo: number;             // 6MMachineDownTimeDetails.SrNo  (delete key, part 2)
  date: string;
  departmentCode: string;
  departmentName: string;
  machineCode: string;
  machineName: string;
  shift1Min: number;
  shift2Min: number;
  totalMin: number;
  lineShift1Min: number;
  lineShift2Min: number;
  lineTotalMin: number;
  status: string;
  remark: string;
}

export interface DownTimeTrendRow {
  date: string;             // yyyy-MM-dd
  departmentName: string;
  machineName: string;
  totalMin: number;
  lineTotalMin: number;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class DgMachineWiseDownTimeService {
  private baseUrl = environment.apiURL; // ends with .../api/

  private apiDepartments = `${this.baseUrl}MachineDownTime/GetDepartments`;
  private apiMachines    = `${this.baseUrl}MachineDownTime/GetMachines`;
  private apiRecords     = `${this.baseUrl}MachineDownTime/GetDownTimeRecords`;
  private apiTrend       = `${this.baseUrl}MachineDownTime/GetDownTimeTrend`;
  private apiSaveBatch   = `${this.baseUrl}MachineDownTime/SaveDownTimeBatch`;
  private apiDelete      = `${this.baseUrl}MachineDownTime/DeleteDownTimeRecord`;

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

  /** Departments dropdown — bound from WorkStation + ProfitCenter for the session company. */
  getDepartments(): Observable<DepartmentOption[]> {
    const params = new HttpParams().set('companyCode', this.companyCode);
    return this.http.get<any[]>(this.apiDepartments, { params }).pipe(
      map((res) =>
        (res || []).map((d) => ({
          departmentCode: d.DeptCode,
          departmentName: d.DeptName,
        })),
      ),
    );
  }

  /** Machines for the chosen department. */
  getMachines(departmentCode: string): Observable<MachineOption[]> {
    const params = new HttpParams().set('departmentCode', departmentCode);
    return this.http.get<any[]>(this.apiMachines, { params }).pipe(
      map((res) =>
        (res || []).map((m) => ({
          machineCode: m.MachineCode,
          machineName: m.MachineName,
        })),
      ),
    );
  }

  /** Map an API record (PascalCase) to the UI model. */
  private toRecord = (x: any): DownTimeRecord => ({
    mcode: x.MCode,
    srNo: x.SrNo,
    date: x.Date,
    departmentCode: x.DeptCode,
    departmentName: x.DeptName,
    machineCode: x.MachineCode,
    machineName: x.MachineName,
    shift1Min: x.Shift1Min,
    shift2Min: x.Shift2Min,
    totalMin: x.TotalMin,
    lineShift1Min: x.LineShift1Min,
    lineShift2Min: x.LineShift2Min,
    lineTotalMin: x.LineTotalMin,
    status: x.Status || '',
    remark: x.Remark,
  });

  /** Saved records for the View grid (filtered by date / department). */
  getDownTimeRecords(date: string, departmentCode: string): Observable<DownTimeRecord[]> {
    let params = new HttpParams().set('companyCode', this.companyCode);
    if (date) params = params.set('date', date);
    if (departmentCode) params = params.set('departmentCode', departmentCode);
    return this.http.get<any[]>(this.apiRecords, { params }).pipe(
      map((res) => (res || []).map(this.toRecord)),
    );
  }

  /** Values already saved for this date/department — used to pre-fill the Edit form. */
  getDownTimeByDate(date: string, departmentCode: string): Observable<DownTimeEntry[]> {
    return this.getDownTimeRecords(date, departmentCode).pipe(
      map((rows) =>
        rows.map((r) => ({
          machineCode: r.machineCode,
          machineName: r.machineName,
          shift1Min: r.shift1Min,
          shift2Min: r.shift2Min,
          totalMin: r.totalMin,
          lineShift1Min: r.lineShift1Min,
          lineShift2Min: r.lineShift2Min,
          lineTotalMin: r.lineTotalMin,
          status: r.status,
          remark: r.remark,
        })),
      ),
    );
  }

  /** Save the whole batch in one transaction (upsert on the server). */
  saveDownTimeBatch(payload: SaveDownTimeBatchRequest): Observable<any> {
    return this.http.post(this.apiSaveBatch, payload);
  }

  /** Records across a date range for the Daily / Weekly / Monthly charts. */
  getDownTimeTrend(fromDate: string, toDate: string): Observable<DownTimeTrendRow[]> {
    const params = new HttpParams()
      .set('companyCode', this.companyCode)
      .set('fromDate', fromDate)
      .set('toDate', toDate);
    return this.http.get<any[]>(this.apiTrend, { params }).pipe(
      map((res) =>
        (res || []).map((x) => ({
          date: x.Date,
          departmentName: x.DeptName,
          machineName: x.MachineName,
          totalMin: x.TotalMin,
          lineTotalMin: x.LineTotalMin,
          status: x.Status || '',
        })),
      ),
    );
  }

  /** Soft-delete one machine line, identified by its MCode + SrNo. */
  deleteDownTimeRecord(mcode: string, srNo: number): Observable<any> {
    const params = new HttpParams()
      .set('mcode', mcode)
      .set('srNo', String(srNo))
      .set('modifiedBy', this.sessionUser);
    return this.http.delete(this.apiDelete, { params });
  }
}