import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface MOFAPIResponse {
  MOFCode: string;
  Mofdate: string;
  PCCode: string;
  PCName: string;
  KVA: number;
  Phase: string;
  Model: string;
  Panel: string;
  IName: string;
  CCName: string;
  orderby: string;
  BasicPrice: number;
  MktPl: number;
  ActualPrice: number;
  diff: number;
  BOMCode: string;
  BOMPrice: number;
  CPBOMCode: string;
  CPBOMAmt: number;
  TotBOMAmt: number;
  NFANo: string;
  Qty: number;
  NfaBalQty: number;
  NFAKoel: number;
  NFAKala: number;
  NFAOther: number;
  Remark: string;
  AuthRemark1: string;
  AuthRemark2: string;
}

export interface MOFAuthPayload {
  MOFNo: string;
  SaveType: string;
  UserID: string;
  AuthRemark: string;
}

@Injectable({
  providedIn: 'root'
})
export class MarketingService {

  private baseUrl = environment.apiURL;

   private getPendingMOFNFAUrl = `${this.baseUrl}Marketing/GetPendingMOFNFA`;

   private authorizeMOFUrl = `${this.baseUrl}Marketing/SubmitMOFNFALevel`;

  constructor(private http: HttpClient) { }

  getPendingMOFNFA(): Observable<MOFAPIResponse[]> {
    return this.http.get<MOFAPIResponse[]>(this.getPendingMOFNFAUrl);
  }

  // authorizeMOF(payload: MOFAuthPayload): Observable<any> {
  //   return this.http.post<any>(this.authorizeMOFUrl, payload);
  // }

   authorizeMOF(payload: MOFAuthPayload): Observable<any> {
    return this.http.post(this.authorizeMOFUrl, payload, {
      responseType: 'text'
    });
  }
}
