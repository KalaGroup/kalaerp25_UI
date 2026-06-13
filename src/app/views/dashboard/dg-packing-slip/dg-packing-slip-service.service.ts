import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface LineRight {
  LineWisePC: string;
  LineDesc:   string;
  ParentDgPC: string;
}

@Injectable({
  providedIn: 'root',
})
export class DgPackingSlipService {
  private baseUrl = environment.apiURL;

  // private apiGetPackingSlipDetailsurl = 'https://localhost:5001/api/DGAssemblly/GetPackingSlipDetails';
  // private apiSubmitPackingSlipDataurl = 'https://localhost:5001/api/DGAssemblly/SubmitPackingSlipDetails';
  // private apiGetMOFPartDetails = 'https://localhost:5001/api/DGAssemblly/GetMOFAddPartDts';

  private apiGetPackingSlipDetailsUrl = `${this.baseUrl}DGAssemblly/GetPackingSlipDetails`;
  private apiSubmitPackingSlipDataUrl = `${this.baseUrl}DGAssemblly/SubmitPackingSlipDetails`;
  private apiGetMOFPartDetails = `${this.baseUrl}DGAssemblly/GetMOFAddPartDts`;

  constructor(private http: HttpClient) {}

  getDGScanDetails(payload: any): Observable<any> {
    return this.http.post(this.apiGetPackingSlipDetailsUrl, payload);
  }

  submitPackingSlipData(formData: any): Observable<any> {
    return this.http.post(this.apiSubmitPackingSlipDataUrl, formData);
  }

  // GET — lines this position role is entitled to post against
  getLineRights(prmCode: string): Observable<LineRight[]> {
    const url = `${this.baseUrl}DGAssemblly/GetLineRights?prmCode=${encodeURIComponent(prmCode)}`;
    return this.http.get<LineRight[]>(url);
  }

  getMOFPartDetails(strMOFCode: string, AssemblyLine: string): Observable<any> {
    const url = `${this.apiGetMOFPartDetails}/${strMOFCode}/${AssemblyLine}`;
    return this.http.get(url);
  }
}
