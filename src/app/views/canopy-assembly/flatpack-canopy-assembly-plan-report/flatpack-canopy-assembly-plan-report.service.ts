import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

// Mirrors the LineDto returned by DGAssemblly/GetLineRights.
export interface LineRight {
  LineWisePC: string;
  LineDesc:   string;
  ParentDgPC: string;
}

// One report row from CanopyAssembly/GetFlatPackCanopyPlanReport.
// Fields mirror the SELECT in CanopyAssemblyServices.GetFlatPackCanopyPlanReportAsync.
export interface FlatpackCanopyPlanRow {
  PFBCode:         string;
  PrcDt:           string;   // dd/MM/yyyy (formatted server-side)
  KVA:             string;
  Phase:           string;
  Model:           string;
  CanopyPartCode:  string;
  NestingPartCode: string;
  ProfitCenter:    string;
  BOMCode:         string;
  ProcessQty:      number;
  Rate:            number;
  Amount:          number;
  [key: string]:   any;
}

@Injectable({
  providedIn: 'root'
})
export class FlatpackCanopyAssemblyPlanReportService {
  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  // GET — lines this position is entitled to query.
  // Reuses the existing endpoint exposed by DGAssemblyController so we don't
  // duplicate the LineRights query here.
  getLineRights(prmCode: string): Observable<LineRight[]> {
    const url = `${this.baseUrl}DGAssemblly/GetLineRights?prmCode=${encodeURIComponent(prmCode)}`;
    return this.http.get<LineRight[]>(url);
  }

  // GET — Flat Pack Canopy Plan Report
  getFlatPackCanopyPlanReport(
    pcCode: string,
    fromDate: string,   // 'YYYY-MM-DD'
    toDate: string,     // 'YYYY-MM-DD'
  ): Observable<FlatpackCanopyPlanRow[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetFlatPackCanopyPlanReport`
      + `?pcCode=${encodeURIComponent(pcCode)}`
      + `&fromDate=${encodeURIComponent(fromDate)}`
      + `&toDate=${encodeURIComponent(toDate)}`;
    return this.http.get<FlatpackCanopyPlanRow[]>(url);
  }
}
