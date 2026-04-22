import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Jobcard2Service {
  private baseUrl = environment.apiURL;

  private apiUrl = `${this.baseUrl}Jobcard/GetJobCard2`;
  private apiCpDetailsUrl = `${this.baseUrl}Jobcard/GetCPDetails`;
  private apiSubmitUrl = `${this.baseUrl}DGAssemblly/SaveJobCard2Details`;

  constructor(private http: HttpClient) {}

  getJobCard2Data(compId: string, pcCode: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?CompId=${compId}&AssemblyLine=${pcCode}`);
  }

  getCPDetails(): Observable<any[]> {
    return this.http.get<any[]>(this.apiCpDetailsUrl);
  }

  submitJobcard2Details(payload: any): Observable<any> {
    return this.http.post(this.apiSubmitUrl, payload);
  }

  getCPStk(strKVA: any, ph: string, panelType: string, compId: string, assemblyLine: string): Observable<string> {
    return this.http.get(
      `${this.baseUrl}Jobcard/GetCPStk?strKVA=${strKVA}&ph=${ph}&panelType=${panelType}&compId=${compId}&assemblyLine=${assemblyLine}`,
      { responseType: 'text' }
    );
  }
}
