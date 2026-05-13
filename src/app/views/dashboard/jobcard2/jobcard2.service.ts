import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface JobCard2ReportRow {
  JobCard2Code:       string;
  JobCard1Code:       string;
  JobDate:            string;
  FinancialYear:      string;
  AssemblyLine:       string;
  CompanyCode:        string;
  Remark:             string;
  JobCardStatus:      string;
  JobCardAuthStatus:  string;
  PlanSrNo:           number;
  PlanNo:             number;
  DGProductCode:      string;
  DGProductDesc:      string;
  Model:              string;
  KVA:                number;
  Phase:              string;
  PanelType:          number | string;
  PlannedQty:         number;
  BOMCode:            string;
  Engine:             number;
  Alternator:         number;
  Batteries:          number;
  Canopy:             number;
  KRM:                number;
  ControlPanelCount:  number;
  TotalComponents:    number;
  EngineSrNo:         string;
  EngineDesc:         string;
  AlternatorSrNo:     string;
  AlternatorDesc:     string;
  Battery1SrNo:       string;
  Battery1Desc:       string;
  Battery2SrNo:       string;
  Battery2Desc:       string;
  Battery3SrNo:       string;
  Battery3Desc:       string;
  Battery4SrNo:       string;
  Battery4Desc:       string;
  CanopySrNo:         string;
  CanopyDesc:         string;
  ControlPanel1SrNo:  string | null;
  ControlPanel1Desc:  string | null;
  ControlPanel2SrNo:  string | null;
  ControlPanel2Desc:  string | null;
  KRMSrNo:            string | null;
  KRMDesc:            string | null;
  ControlPanel:       string;
  Stage3:             string;
  TRStatus:           string;
  PDIRStatus:         string;
}

@Injectable({
  providedIn: 'root'
})
export class Jobcard2Service {
  private baseUrl = environment.apiURL;

  private apiUrl = `${this.baseUrl}Jobcard/GetJobCard2`;
  private apiCpDetailsUrl = `${this.baseUrl}Jobcard/GetCPDetails`;
  private apiSubmitUrl = `${this.baseUrl}DGAssemblly/SaveJobCard2Details`;

  constructor(private http: HttpClient) {}

  // GET — JobCard 2 production report (status + per-plan component serials)
  getJobCard2Report(
    compCode: string,
    assemblyLine: string,
    fromDate: string,
    toDate: string
  ): Observable<JobCard2ReportRow[]> {
    const url = `${this.baseUrl}Jobcard/GetJobCard2Report`
      + `?CompanyCode=${encodeURIComponent(compCode)}`
      + `&AssemblyLine=${encodeURIComponent(assemblyLine)}`
      + `&FromDate=${encodeURIComponent(fromDate)}`
      + `&ToDate=${encodeURIComponent(toDate)}`;
    return this.http.get<JobCard2ReportRow[]>(url);
  }

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
