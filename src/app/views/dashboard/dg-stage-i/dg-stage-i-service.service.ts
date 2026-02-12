import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DgStageIService {
  private baseUrl = environment.apiURL; // Use environment URL

  // private apiScanUrl = 'https://localhost:5001/api/DGAssemblly/GetStageScanDetails';
  // private apiSubmiturl = 'https://localhost:5001/api/DGAssemblly/SubmitDGAssemblyDetails';
  // private apiSelect6Murl = 'https://localhost:5001/api/DGAssemblly/GetSelect6MData';
  // private apiGetProcessCheckPoints = 'https://localhost:5001/api/DGAssemblly/GetProcessCheckPoints';

  private apiScanUrl = `${this.baseUrl}DGAssemblly/GetStageScanDetails`;
  private apiSubmitUrl = `${this.baseUrl}DGAssemblly/SubmitDGAssemblyDetails`;
  private apiSelect6MUrl = `${this.baseUrl}DGAssemblly/GetSelect6MData`;
  private apiGetProcessCheckPoints = `${this.baseUrl}DGAssemblly/GetProcessCheckPoints`;

  constructor(private http: HttpClient) {}

  getAssemblyDetails(payload: any): Observable<any> {
    return this.http.post(this.apiScanUrl, payload);
  }

  submitAssemblyData(formData: any): Observable<any> {
    return this.http.post(this.apiSubmitUrl, formData);
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
}
