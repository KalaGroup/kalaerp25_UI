import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

// One row in the hardcoded Line dropdown — mirrors the shape used across the
// other reports even though this dropdown isn't backend-driven.
export interface LineRight {
  LineWisePC: string;
  LineDesc:   string;
  ParentDgPC: string;
}

// Report rows are dynamic (SP returns 100+ columns depending on the searchCode
// stage). We keep it as an open dictionary so the grid can render whatever the
// server sends without a type-level change every time the SP is tweaked.
export type JobcardMttrRow = Record<string, any>;

@Injectable({ providedIn: 'root' })
export class JobcardMttrReportService {
  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  // Lines this user is entitled to see — same shared endpoint used across
  // canopy-assembly-plan / canopy-assembly-process / dg-stage-* forms.
  // Backed by PositionLineRights ⨝ LinePcmst on the API side.
  getLineRights(prmCode: string): Observable<LineRight[]> {
    const url = `${this.baseUrl}DGAssemblly/GetLineRights?prmCode=${encodeURIComponent(prmCode)}`;
    return this.http.get<LineRight[]>(url);
  }

  // GET /api/Jobcard/GetJobCardMttrReport
  //   ?companyCode=<CompId derived from LineWisePC>
  //   &assemblyLine=<LineWisePC>
  //   &searchCode=<dropdown option>
  //   &fromDate=yyyy-MM-dd
  //   &toDate=yyyy-MM-dd
  getMttrReport(
    companyCode: string,
    assemblyLine: string,
    searchCode: string,
    fromDate: string,
    toDate: string,
  ): Observable<JobcardMttrRow[]> {
    const params = new HttpParams()
      .set('companyCode',  companyCode)
      .set('assemblyLine', assemblyLine)
      .set('searchCode',   searchCode)
      .set('fromDate',     fromDate)
      .set('toDate',       toDate);

    return this.http.get<JobcardMttrRow[]>(
      `${this.baseUrl}Jobcard/GetJobCardMttrReport`,
      { params },
    );
  }
}
