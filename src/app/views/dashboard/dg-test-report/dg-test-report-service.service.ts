import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

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
