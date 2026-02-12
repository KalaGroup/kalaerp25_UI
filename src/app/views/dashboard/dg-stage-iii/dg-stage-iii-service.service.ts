import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DgStageIIIService {
  private baseUrl = environment.apiURL;

  // private apiScanUrl = 'https://localhost:5001/api/DGAssemblly/GetStageScanDetails';
  // private apiSubmiturl = 'https://localhost:5001/api/DGAssemblly/SubmitDGStage4Details';
  // private apiSelect6Murl = 'https://localhost:5001/api/DGAssemblly/GetSelect6MData';
  // private apiGetProcessCheckPoints = 'https://localhost:5001/api/DGAssemblly/GetProcessCheckPoints';
  // private apiGetDGKitDetails = 'https://localhost:5001/api/DGAssemblly/GetDGKitDetails';

  private apiScanUrl = `${this.baseUrl}DGAssemblly/GetStageScanDetails`;
  private apiSubmitUrl = `${this.baseUrl}DGAssemblly/SubmitDGStage4Details`;
  private apiSelect6MUrl = `${this.baseUrl}DGAssemblly/GetSelect6MData`;
  private apiGetProcessCheckPoints = `${this.baseUrl}DGAssemblly/GetProcessCheckPoints`;
  private apiGetDGKitDetails = `${this.baseUrl}DGAssemblly/GetDGKitDetails`;

  constructor(private http: HttpClient) {}

  getAssemblyDetails(payload: any): Observable<any> {
    return this.http.post(this.apiScanUrl, payload);
  }

  submitStage4Data(formData: any): Observable<any> {
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

  getDGKitDetails(PrdPartCode: string, PCCode: string): Observable<any> {
    const url = `${this.apiGetDGKitDetails}/${PrdPartCode}/${PCCode}`;
    return this.http.get(url);
  }
}
