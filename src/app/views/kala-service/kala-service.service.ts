import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class KalaService {
  private baseUrl = environment.apiURL;
  constructor(private http: HttpClient) {}

  getKalaServiceData(ecode: string): Observable<any> {
    const url = `${this.baseUrl}KalaService/GetPendingSiteVisits?Ecode=${ecode}`;
    return this.http.get<any>(url);
  }

  submitCustomerFeedback(feedbackData: FormData): Observable<any> {
    const url = `${this.baseUrl}KalaService/SubmitCustomerFeedback`;
    return this.http.post(url, feedbackData, {
      responseType: 'text',
    });
  }

  submitSiteVisitDetails(siteVisitData: FormData): Observable<any> {
    const url = `${this.baseUrl}KalaService/SubmitSiteVisitDetails`;
    return this.http.post(url, siteVisitData, {
      responseType: 'text',
    });
  }
}
