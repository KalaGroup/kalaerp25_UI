import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface LineRight {
  LineWisePC: string;
  LineDesc:   string;
  ParentDgPC: string;
}

/**
 * Each row from usp_GetTestReportStatus.
 * The fixed columns are typed; the per-row `ControlPanelSrNoN` and `BatterySrNoN`
 * keys are dynamic (the SP emits as many as the largest record has) so we
 * model them via the index signature.
 */
export interface TestReportStatusRow {
  PFBCode:        string;
  MachineCode:    string;
  DGPartCode:     string;
  ProcessStart:   string;
  ProcessEnd:     string;
  PrcBOMCode:     string;
  'Test Report':  string;
  EngineSrNo:     string;
  AlternatorSrNo: string;
  CanopySrNo:     string;
  [key: string]:  any;   // ControlPanelSrNo1..N, BatterySrNo1..N
}

@Injectable({
  providedIn: 'root',
})
export class DgTestReportService {
  private baseUrl = environment.apiURL;

  // private apiGetTestReportDetailsurl = 'https://localhost:5001/api/DGAssemblly/GetTestReportDetails';
  // private apiSubmitTestReportDataurl = 'https://localhost:5001/api/DGAssemblly/SubmitTestReportDetails';
  // private apiSelect6Murl = 'https://localhost:5001/api/DGAssemblly/GetSelect6MData';
  // private apiGetProcessCheckPoints = 'https://localhost:5001/api/DGAssemblly/GetProcessCheckPoints';
  // private apiGetTRDGKitDetails = 'https://localhost:5001/api/DGAssemblly/GetTRKitDetails';

  private apiGetTestReportDetailsUrl = `${this.baseUrl}DGAssemblly/GetTestReportDetails`;
  private apiSubmitTestReportDataUrl = `${this.baseUrl}DGAssemblly/SubmitTestReportDetails`;
  private apiSelect6MUrl = `${this.baseUrl}DGAssemblly/GetSelect6MData`;
  private apiGetProcessCheckPoints = `${this.baseUrl}DGAssemblly/GetProcessCheckPoints`;
  private apiGetTRDGKitDetails = `${this.baseUrl}DGAssemblly/GetTRKitDetails`;

  constructor(private http: HttpClient) {}

  getDGScanDetails(payload: any): Observable<any> {
    return this.http.post(this.apiGetTestReportDetailsUrl, payload);
  }

  submitTestReportData(formData: any): Observable<any> {
    return this.http.post(this.apiSubmitTestReportDataUrl, formData);
  }

  // GET — lines this position role is entitled to post against
  getLineRights(prmCode: string): Observable<LineRight[]> {
    const url = `${this.baseUrl}DGAssemblly/GetLineRights?prmCode=${encodeURIComponent(prmCode)}`;
    return this.http.get<LineRight[]>(url);
  }

  // GET — Test Report Status report (usp_GetTestReportStatus). Schema is
  // dynamic for CP/Battery serials, so we type it loosely as a record bag.
  getTestReportStatus(
    assemblyLine: string,
    fromDate: string,   // 'YYYY-MM-DD'
    toDate: string,     // 'YYYY-MM-DD'
  ): Observable<TestReportStatusRow[]> {
    const url = `${this.baseUrl}DGAssemblly/GetTestReportStatus`
      + `?assemblyLine=${encodeURIComponent(assemblyLine)}`
      + `&fromDate=${encodeURIComponent(fromDate)}`
      + `&toDate=${encodeURIComponent(toDate)}`;
    return this.http.get<TestReportStatusRow[]>(url);
  }

  fetchSelect6MData(): Observable<any> {
    return this.http.get(this.apiSelect6MUrl);
  }

  getProcessCheckPoints(
    stageName: string,
    statusName: string
  ): Observable<any> {
    const url = `${this.apiGetProcessCheckPoints}/${stageName}/${statusName}`;
    return this.http.get(url);
  }

  getDGKitDetails(
    strPartcode: string,
    strDGSrNo: string,
    strPfbCode: string
  ): Observable<any> {
    const url = `${this.apiGetTRDGKitDetails}/${strPartcode}/${strDGSrNo}/${strPfbCode}`;
    return this.http.get(url);
  }
}
