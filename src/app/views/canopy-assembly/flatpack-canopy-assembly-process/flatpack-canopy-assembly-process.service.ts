import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

// Mirrors LineDto returned by DGAssemblly/GetLineRights — one authorized
// line for the logged-in user under their login PC. Same shape used across
// canopy-assembly-plan / canopy-assembly-process / *-checker pages.
export interface LineRight {
  LineWisePC: string;
  LineDesc:   string;
  ParentDgPC: string;
}

// One row in the Canopy Part Desc dropdown.
export interface CanopyOption {
  PartCode: string;
  PartDesc: string;   // "<desc>--><partcode>"
  Kva:      string;
  Model:    string;
  Phase:    string;
  Type:     string;
}

// Server response of the cascade from (canopy, processType) → Part Desc.
export interface BindPrimaryResponse {
  PartDesc: string;
  PartCode: string;
  Heading:  string;
}

// One row of the Part Details grid.
export interface FlatPackPartRow {
  PartCode:        string;   // "<desc>--><partcode>"
  Qty:             number;
  UName:           string;
  Rate:            number;
  TotalQty:        number;
  Stk:             number;
  QtyAfterProcess: number;
  Amount:          number;
}

// Full payload returned by Search.
export interface ProcessDetailsResponse {
  BomCode:        string;
  OverallRate:    number;
  OverallAmount:  number;
  Wt:             number;
  SqFt:           number;
  CRWt:           number;
  HRWt:           number;
  CRRate:         number;
  HRRate:         number;
  PartDetails:    FlatPackPartRow[];
}

export interface ProcessDetailsRequest {
  PCCode:         string;
  CanopyPartCode: string;
  PartCode:       string;
  ProcessType:    string;   // "CPY" | "CPY(BF_FT)"
  ProcessQty:     number;
}

export interface SubmitRequest {
  PCCode:         string;    // LineWisePC → ProcessFeedBack.PCCode_Act
  ParentDgPC:     string;    // ParentDgPC of the selected line → ProcessFeedBack.ProfitCenterCode
  CompanyCode:    string;
  EmpCode:        string;
  ProcessType:    string;
  CanopyPartCode: string;
  PartCode:       string;
  ProcessQty:     number;
  BomCode:        string;
  Heading:        string;
  OverallRate:    number;
  Wt:             number;
  SqFt:           number;
  CRWt:           number;
  HRWt:           number;
  CRRate:         number;
  HRRate:         number;
  PartDetails:    FlatPackPartRow[];
}

export interface SubmitResponse {
  Message: string;
  PFBCode: string;
}

@Injectable({ providedIn: 'root' })
export class FlatpackCanopyAssemblyProcessService {
  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  // Canopy dropdown — pcCode is the selected line's LineWisePC. The API
  // uses it to apply the per-line KVA band (see service comment).
  getCanopyOptions(pcCode: string): Observable<CanopyOption[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetFlatPackCanopyOptions`
      + `?pcCode=${encodeURIComponent(pcCode || '')}`;
    return this.http.get<CanopyOption[]>(url);
  }

  // Cascade: (canopy, processType) → PartDesc
  getBindPrimary(
    canopyPartCode: string,
    processType: string,
    heading: string,
  ): Observable<BindPrimaryResponse> {
    const url = `${this.baseUrl}CanopyAssembly/GetFlatPackBindPrimary`
      + `?canopyPartCode=${encodeURIComponent(canopyPartCode)}`
      + `&processType=${encodeURIComponent(processType)}`
      + `&heading=${encodeURIComponent(heading || '')}`;
    return this.http.get<BindPrimaryResponse>(url);
  }

  // Search → grid + master rate/wt/sqft/CR/HR
  getProcessDetails(req: ProcessDetailsRequest): Observable<ProcessDetailsResponse> {
    return this.http.post<ProcessDetailsResponse>(
      `${this.baseUrl}CanopyAssembly/GetFlatPackProcessDetails`, req);
  }

  // Save → full transaction
  submit(req: SubmitRequest): Observable<SubmitResponse> {
    return this.http.post<SubmitResponse>(
      `${this.baseUrl}CanopyAssembly/SubmitFlatPackProcess`, req);
  }
}
