import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';

import { IJobcardCpyChekerDts } from '../../canopy-process/sheet-metal-jobcard-checker/Model/jobCard_Cpy_chekerDts';
import { IRejectPayload } from '../../canopy-process/sheet-metal-jobcard-checker/Model/jobcard_Cpy_chekerSave';

@Injectable({
  providedIn: 'root'
})
export class ControlPanelJobcardCheckerService {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) { }

  private handleError(error: HttpErrorResponse) {
    console.error('Status:', error.status);
    console.error('Body:', error.error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }

  /** GET: Control Panel checker plan-code list. */
  GetCheckerCPPlanLoad(): Observable<any[]> {
    const url = `${this.baseUrl}ControlPanelJobCard/GetCheckerCPLoad`;
    console.log('[ControlPanelJobcardCheckerService] GET GetCheckerCPPlanLoad →', url);
    return this.http.get<any[]>(url)
      .pipe(catchError(this.handleError));
  }

  /** GET: checker part-code details for the selected company + plan code. */
  GetJobCardCpychecker(compId: string, planCode: string): Observable<any[]> {
    const url = `${this.baseUrl}ControlPanelJobCard/GetJobCardCpychecker/${compId}/${planCode}`;
    console.log('[ControlPanelJobcardCheckerService] GET GetJobCardCpychecker →', url);
    return this.http.get<any[]>(url)
      .pipe(catchError(this.handleError));
  }

  /** GET: checker-done plans for the report grid. */
  GetJobCardCpyCheckerDone(): Observable<IJobcardCpyChekerDts[]> {
    const url = `${this.baseUrl}ControlPanelJobCard/GetJobCardCpyCheckerDone`;
    console.log('[ControlPanelJobcardCheckerService] GET GetJobCardCpyCheckerDone →', url);
    return this.http.get<IJobcardCpyChekerDts[]>(url)
      .pipe(catchError(this.handleError));
  }

  /** POST: submit the checker Auth / Reject decision. */
  postControlPanelJobcardCheckerSave(payload: IRejectPayload): Observable<string> {
    const url = `${this.baseUrl}ControlPanelJobCard/CPSaveChecker`;
    console.log('[ControlPanelJobcardCheckerService] POST postControlPanelJobcardCheckerSave →', url, payload);
    return this.http.post(url, payload, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      responseType: 'text'
    }).pipe(catchError(this.handleError));
  }
}
