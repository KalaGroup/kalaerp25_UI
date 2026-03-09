import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class KalaService {
  private baseUrl = environment.apiURL;
  private cachedSiteVisits: any[] | null = null;
  private cachedData: any[] | null = null;
  private cachedEmployeeCode: string | null = null;

  constructor(private http: HttpClient) {}
  // Cache management methods
  clearCache(): void {
    this.cachedData = null;
    this.cachedEmployeeCode = null;
  }

  getCachedSiteVisits(employeeCode: string): any[] | null {
    // Return cache ONLY if it belongs to the same user
    if (this.cachedData && this.cachedEmployeeCode === employeeCode) {
      return this.cachedData;
    }
    return null;
  }

  setCachedSiteVisits(data: any[], ecode: string): void {
    this.cachedSiteVisits = data;
    this.cachedEmployeeCode = ecode;
  }
  // API methods
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
