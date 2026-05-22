import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface ReverseTransOption {
  TransName: string;
  TransID: number;
}

export interface KvaOption {
  KVA: string;
  KVA1: string;
}

export interface ModelOption {
  Model: string;
  Model1: string;
}

export interface ReverseTransRow {
  EngSrNo: string | null;
  JobCode: string | null;
  J2Priority: string | null;
  Partcode: string | null;
  JobCard1: string | null;
  PanelType: string | null;
  Stage4Code: string | null;
  TRCode: string | null;
}

export interface ReverseTransSubmitRequest {
  PCCode: string;
  RevTransFor: number;
  Remark: string;
  Rows: ReverseTransRow[];
}

export interface ReverseTransSearchResult {
  Stage4Code: string | null;
  TRCode: string | null;
  SelectR: number;
  KVA: string | null;
  Phase: string | null;
  Model: string | null;
  Panel: string | null;
  EngSrNo: string | null;
  AltSrno: string | null;
  CpySrno: string | null;
  BatSrNo: string | null;
  Bat2SrNo: string | null;
  Bat3SrNo: string | null;
  Bat4SrNo: string | null;
  CPSrNo: string | null;
  CP2SrNo: string | null;
  KRMSrNo: string | null;
  Partcode: string | null;
  JobCode: string | null;
  J2Priority: string | null;
  Dt: string | null;
  JobCard1: string | null;
  PanelType: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class DgReverseProcessService {
  private baseUrl = environment.apiURL;
  private apiReverseTransMstUrl = `${this.baseUrl}Jobcard/GetReverseTransMst`;
  private apiReverseKvaListUrl = `${this.baseUrl}Jobcard/GetReverseKvaList`;
  private apiReverseModelListUrl = `${this.baseUrl}Jobcard/GetReverseModelList`;
  private apiGetRevTransDtsUrl = `${this.baseUrl}Jobcard/GetRevTransDts`;
  private apiSubmitReverseTransUrl = `${this.baseUrl}Jobcard/SubmitReverseTrans`;

  constructor(private http: HttpClient) {}

  getReverseTransMst(pcCode: string): Observable<ReverseTransOption[]> {
    const params = new HttpParams().set('pcCode', pcCode);
    return this.http.get<ReverseTransOption[]>(this.apiReverseTransMstUrl, {
      params,
    });
  }

  getReverseKvaList(
    transType: number,
    pcCode: string
  ): Observable<KvaOption[]> {
    const params = new HttpParams()
      .set('transType', transType.toString())
      .set('pcCode', pcCode);
    return this.http.get<KvaOption[]>(this.apiReverseKvaListUrl, { params });
  }

  getReverseModelList(
    transType: number,
    pcCode: string,
    kva: string
  ): Observable<ModelOption[]> {
    const params = new HttpParams()
      .set('transType', transType.toString())
      .set('pcCode', pcCode)
      .set('kva', kva);
    return this.http.get<ModelOption[]>(this.apiReverseModelListUrl, {
      params,
    });
  }

  getRevTransDts(
    transType: number,
    pcCode: string,
    kva: string,
    model: string
  ): Observable<ReverseTransSearchResult[]> {
    const params = new HttpParams()
      .set('transType', transType.toString())
      .set('pcCode', pcCode)
      .set('kva', kva)
      .set('model', model);
    return this.http.get<ReverseTransSearchResult[]>(
      this.apiGetRevTransDtsUrl,
      { params }
    );
  }

  submitReverseTrans(payload: ReverseTransSubmitRequest): Observable<string> {
    // Server returns plain text (comma-joined RTCodes on success, error string
    // on failure) — responseType:'text' avoids JSON-parse errors.
    return this.http.post(this.apiSubmitReverseTransUrl, payload, {
      responseType: 'text',
    });
  }
}
