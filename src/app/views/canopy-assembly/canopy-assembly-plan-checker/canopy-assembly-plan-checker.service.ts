import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

// Mirrors LineDto returned by DGAssemblly/GetLineRights.
export interface LineRight {
  LineWisePC: string;
  LineDesc:   string;
  ParentDgPC: string;
}

export interface CanopyPlanCheckPendingRow {
  CPCode:         string;
  Dt:             string;
  FromDt:         string;
  ToDt:           string;
  PlanPCCode:     string;
  PlanType:       string;
  PlanStatus:     string;
  MakerCode:      string;
  CompanyCode:    string;
  DetailRowCount: number;
  TotalPlanQty:   number;
  KVAs:           string;   // distinct KVAs across the plan's parts, e.g. "10, 15, 25"
  PartCodes:      string;   // distinct Partcodes across the plan's detail rows
  Status:         string;   // "Pending" or "Authorized"
}

export interface CanopyPlanCheckHeader {
  CPCode:      string;
  Dt:          string;
  FromDt:      string;
  ToDt:        string;
  PlanPCCode:  string;
  PCCode_Act:  string;
  CompanyCode: string;
  PlanType:    string;
  PlanStatus:  string;
  MakerCode:   string;
  Yr:          string;
}

export interface CanopyPlanCheckDetailRow {
  SrNo:         number;
  Dt:           string;
  Partcode:     string;
  PartDesc:     string;
  BomCode:      string;
  PartCodeWOP:  string;
  Qty:          number;
  CpyWIPQty:    number;
  CpyWOPQty:    number;
  CpyWIPStatus: string;
  CpyWOPStatus: string;
}

export interface CanopyPlanCheckContext {
  Header:  CanopyPlanCheckHeader;
  Details: CanopyPlanCheckDetailRow[];
}

export type CanopyPlanCheckDecision = 'Accept' | 'Rework' | 'Reject';

export interface SaveCanopyPlanCheckRequest {
  EmpCode:     string;
  PCCode:      string;
  ParentDgPC:  string;
  CompanyCode: string;
  CPCode:      string;
  Decision:    CanopyPlanCheckDecision;
  Remark:      string;
}

export interface SaveCanopyPlanCheckResponse {
  Message:    string;
  CPCode:     string;
  PlanStatus: string;
}

export interface CanopyPlanCheckReportRow {
  CPCode:         string;
  Dt:             string;
  FromDt:         string;
  ToDt:           string;
  PlanPCCode:     string;
  PlanType:       string;
  PlanStatus:     string;
  MakerCode:      string;
  CompanyCode:    string;
  DetailRowCount: number;
  TotalPlanQty:   number;
  TotalWIPQty:    number;
  KVAs:           string;
  PartCodes:      string;
  Status:         string;
}

@Injectable({ providedIn: 'root' })
export class CanopyAssemblyPlanCheckerService {
  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  getLineRights(prmCode: string): Observable<LineRight[]> {
    const url = `${this.baseUrl}DGAssemblly/GetLineRights?prmCode=${encodeURIComponent(prmCode)}`;
    return this.http.get<LineRight[]>(url);
  }

  getPendingList(pcCode: string): Observable<CanopyPlanCheckPendingRow[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyPlanCheckPendingList`
      + `?pcCode=${encodeURIComponent(pcCode)}`;
    return this.http.get<CanopyPlanCheckPendingRow[]>(url);
  }

  getContext(cpCode: string): Observable<CanopyPlanCheckContext | null> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyPlanCheckContext`
      + `?cpCode=${encodeURIComponent(cpCode)}`;
    return this.http.get<CanopyPlanCheckContext | null>(url);
  }

  save(req: SaveCanopyPlanCheckRequest): Observable<SaveCanopyPlanCheckResponse> {
    return this.http.post<SaveCanopyPlanCheckResponse>(
      `${this.baseUrl}CanopyAssembly/SaveCanopyPlanCheck`, req);
  }

  getReport(pcCode: string, fromDate: string, toDate: string)
    : Observable<CanopyPlanCheckReportRow[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyPlanCheckReport`
      + `?pcCode=${encodeURIComponent(pcCode)}`
      + `&fromDate=${encodeURIComponent(fromDate)}`
      + `&toDate=${encodeURIComponent(toDate)}`;
    return this.http.get<CanopyPlanCheckReportRow[]>(url);
  }
}
