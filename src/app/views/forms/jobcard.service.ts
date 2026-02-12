import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class JobcardService {

  constructor(private http: HttpClient) {}

  private apiUrl = 'https://localhost:5001/api/DGAssemblly/GetJobCardDGDetails';

  private apiurlSubmitJobcard = 'https://localhost:5001/api/DGAssemblly/SaveJobCard2Details';


  getJobCardDGDetails(strJobCardType: string, strcompID: string): Observable<any[]> {
    const url = `${this.apiUrl}/${strJobCardType}/${strcompID}`;
    return this.http.get<any[]>(url);
  }

  submitJobcard2Details(payload: any): Observable<any> {
    return this.http.post(this.apiurlSubmitJobcard, payload);
  }
}
