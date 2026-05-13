import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface PCNameForMTFScanDTO {
  PCName: string;
  PCCode: string;
}

export interface MTFCodeAndMTFNoDTO {
  MTFCode: string;
  MTFNo: string;
}

export interface ReqCodeForMTFDTO {
  ReqCode: string;
  ReqNo: string;
}

export interface GetReqDetailsRequest {
  PCCode: string;
  StrBomCode: string;
  StrReqCode: string;
  StrReqQty: number;
  StrMTFQty: number;
}

export interface ReqDetailsForMTFDTO {
  PartDesc: string;
  PartCode: string;
  UName: string;
  Uid: string;
  KitQty: number;
  ReqQty: number;
  PQty: number;
  Stk: number;
  MTFQty: number;
  QtyAfterMTF: number;
  Rate: number;
  Amt: number;
  SheetQty: number;
  ConvUOMCode: string;
  Length: number;
  Width: number;
  Thickness: number;
  MOB: string;
}

export interface SubmitMTFWipInternalRequest {
  FromPCCode: string;
  ToPCCode: string;
  ReqCode: string;
  ProdPartCode: string;
  ReqBalQty: number;
  MTFQty: number;
  MTFDetails: string;
  Remark: string;
  UserID: string;
  CompID: string;
}

export interface PartDescDTO {
  BOMCode: string;
  ReqCode: string;
  KitPartDesc: string;
  KitPartCode: string;
  ReqQty: number;
  MTFQty: number;
  BalReqQty: number;
}

export interface MTFSerialNoDtl {
  Partcode: string;
  SerialNo: string;
}

export interface MTFScanSubmitRequest {
  MtfCode: string;
  MTFSerialNoDts: MTFSerialNoDtl[];
}

@Injectable({
  providedIn: 'root',
})
export class LogisticService {
  //private baseUrl = 'https://localhost:5001/api/';
  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  getPCNameList(
    PCCode: string,
    ReqType: string
  ): Observable<PCNameForMTFScanDTO[]> {
    const url = `${this.baseUrl}Logistic/GetPCodeAll/${PCCode}/${ReqType}`;
    return this.http.get<PCNameForMTFScanDTO[]>(url);
  }

  getMTFCodeList(
    FPCCode: string,
    TPCCode: string
  ): Observable<MTFCodeAndMTFNoDTO[]> {
    const url = `${this.baseUrl}Logistic/GetMTFCode/${FPCCode}/${TPCCode}`;
    return this.http.get<MTFCodeAndMTFNoDTO[]>(url);
  }

  getReqCodeForMTF(
    TPCCode: string,
    FPCCode: string
  ): Observable<ReqCodeForMTFDTO[]> {
    const url = `${this.baseUrl}Logistic/GetReqCodeForMTF/${TPCCode}/${FPCCode}`;
    return this.http.get<ReqCodeForMTFDTO[]>(url);
  }

  getPartDesc(mtfNo: string): Observable<PartDescDTO[]> {
    const encodedMtfNo = encodeURIComponent(mtfNo);
    return this.http.get<PartDescDTO[]>(
      `${this.baseUrl}Logistic/GetPartDescByMTFCode/${encodedMtfNo}`
    );
  }

  getReqDetails(request: GetReqDetailsRequest): Observable<ReqDetailsForMTFDTO[]> {
    const url = `${this.baseUrl}Logistic/GetReqDetails`;
    return this.http.post<ReqDetailsForMTFDTO[]>(url, request);
  }

  submitMTFWipInternal(request: SubmitMTFWipInternalRequest): Observable<string> {
    const url = `${this.baseUrl}Logistic/SubmitMTFWipInternal`;
    // Backend returns a plain string (MTFCode on success, or a validation message)
    return this.http.post(url, request, { responseType: 'text' });
  }

  getMTFSrNoDtl(mtfNo: string): Observable<any> {
    const encodedMtfNo = encodeURIComponent(mtfNo);
    return this.http.get(
      `${this.baseUrl}Logistic/GetMTFSrNoDtl/${encodedMtfNo}`
    );
  }

  submitMTFScanDetails(payload: MTFScanSubmitRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}Logistic/SubmitMTFScanDetails`, payload);
  }
}
