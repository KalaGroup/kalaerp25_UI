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

export interface PartDescDTO {
  KitPartDesc: string;
  KitPartCode: string;
  MTFQty: number;
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

  getPartDesc(mtfNo: string): Observable<any> {
    const encodedMtfNo = encodeURIComponent(mtfNo);
    return this.http.get(
      `${this.baseUrl}Logistic/GetPartDescByMTFCode/${encodedMtfNo}`
    );
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
