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

export interface CanopyProcessCheckPendingRow {
  PFBCode:          string;
  Dt:               string;
  ProductCode:      string;
  ProductDesc:      string;
  KVA:              number;
  Model:            string;
  BatchQty:         number;
  PrcQty:           number;
  MachineCode:      string;
  SerialNo:         string;
  MakerCode:        string;
  TotalUnitCount:   number;
  DecidedUnitCount: number;
  PendingUnitCount: number;
  Status:           string;   // "Pending" | "Authorized"
}

export interface CanopyProcessCheckHeader {
  PFBCode:      string;
  GroupPFBCode: string;
  PlanCode:     string;
  Dt:           string;
  MachineCode:  string;
  SerialNo:     string;
  ProductCode:  string;
  ProductDesc:  string;
  BOMCode:      string;
  KVA:          number;
  Model:        string;
  BatchQty:     number;
  PrcQty:       number;
  Rate:         number;
  WtPerUt:      number;
  SqftPerUt:    number;
  PCCode:       string;
  PCCode_Act:   string;
  MakerCode:    string;
  Remark:       string;
}

export interface CanopyProcessCheckKitLine {
  SrNo:     number;
  PartCode: string;
  PartDesc: string;
  KitQty:   number;
  TotQty:   number;
  Rate:     number;
}

export interface CanopyProcessCheckSerialUnit {
  SrNo:      number;
  SerialNo:  string;
  BFMSrNo:   string;
  FLKSrNo:   string;
  Status:    string;
  QPCStatus: string;
  RWStatus:  string;
}

export interface CanopyProcessCheckContext {
  Header:           CanopyProcessCheckHeader;
  KitLines:         CanopyProcessCheckKitLine[];
  AssemblyKitLines: CanopyProcessCheckKitLine[];
  Units:            CanopyProcessCheckSerialUnit[];
}

export type CanopyCheckDecision = 'Accept' | 'Rework' | 'Reject';

export interface CanopyProcessCheckUnitDecision {
  SerialNo: string;
  Decision: CanopyCheckDecision;
  SixM:     string;
  RaiseESP: string;
  Remark:   string;
}

export interface SaveCanopyProcessCheckRequest {
  EmpCode:     string;
  PCCode:      string;   // LineWisePC
  ParentDgPC:  string;
  CompanyCode: string;
  PFBCode:     string;
  ProductCode: string;
  PlanCode:    string;   // needed for Kanban trigger in checker save
  BatchQty:    number;   // needed for Kanban REQ.ActNo
  Decisions:   CanopyProcessCheckUnitDecision[];
}

export interface SaveCanopyProcessCheckResponse {
  Message:       string;
  PFBCode:       string;
  AcceptedCount: number;
  ReworkCount:   number;
  RejectedCount: number;
}

// One row in the date-range Report table.
export interface CanopyProcessCheckReportRow {
  PFBCode:          string;
  Dt:               string;
  ProductCode:      string;
  ProductDesc:      string;
  KVA:              number;
  Model:            string;
  BatchQty:         number;
  PrcQty:           number;
  MachineCode:      string;
  SerialNo:         string;
  MakerCode:        string;
  PlanCode:         string;
  BOMCode:          string;
  TotalUnitCount:   number;
  PendingUnitCount: number;
  AcceptedCount:    number;
  ReworkCount:      number;
  RejectedCount:    number;
  DecidedUnitCount: number;
  Status:           string;
}

@Injectable({ providedIn: 'root' })
export class CanopyAssemblyProcessCheckerService {
  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  getLineRights(prmCode: string): Observable<LineRight[]> {
    const url = `${this.baseUrl}DGAssemblly/GetLineRights?prmCode=${encodeURIComponent(prmCode)}`;
    return this.http.get<LineRight[]>(url);
  }

  getPendingList(pcCode: string): Observable<CanopyProcessCheckPendingRow[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyProcessCheckPendingList`
      + `?pcCode=${encodeURIComponent(pcCode)}`;
    return this.http.get<CanopyProcessCheckPendingRow[]>(url);
  }

  getContext(pfbCode: string): Observable<CanopyProcessCheckContext | null> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyProcessCheckContext`
      + `?pfbCode=${encodeURIComponent(pfbCode)}`;
    return this.http.get<CanopyProcessCheckContext | null>(url);
  }

  save(req: SaveCanopyProcessCheckRequest): Observable<SaveCanopyProcessCheckResponse> {
    return this.http.post<SaveCanopyProcessCheckResponse>(
      `${this.baseUrl}CanopyAssembly/SaveCanopyProcessCheck`, req);
  }

  getReport(pcCode: string, fromDate: string, toDate: string)
    : Observable<CanopyProcessCheckReportRow[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyProcessCheckReport`
      + `?pcCode=${encodeURIComponent(pcCode)}`
      + `&fromDate=${encodeURIComponent(fromDate)}`
      + `&toDate=${encodeURIComponent(toDate)}`;
    return this.http.get<CanopyProcessCheckReportRow[]>(url);
  }
}
