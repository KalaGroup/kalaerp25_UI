import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface InvoiceScanDts {
  INVID: string;
  Dt: string;
  INVCode: number;
  CustName: string;
  CustAddress: string;
  IndName: string;
  IndAddress: string;
  PartCode: string;
  PartDesc: string;
  UOM: string;
  Qty: number;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  getInvoiceScanDts(invId: string): Observable<InvoiceScanDts[]> {
    return this.http.get<InvoiceScanDts[]>(
      `${this.baseUrl}InvoiceScan/GetInvoiceScanDts/${encodeURIComponent(invId)}`
    );
  }
}
