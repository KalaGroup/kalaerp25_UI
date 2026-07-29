import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'environments/environment';

import { IJobcard_CpDts } from './Model/Jobcard_CpDts';
import { IJobcard_CpSave } from './Model/Jobcard_CpSave';

@Injectable({
  providedIn: 'root'
})
export class ControlPanelJobcardService {

  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) { }

  private handleError(error: HttpErrorResponse) {
    console.error('Status:', error.status);
    console.error('Body:', error.error);
    return throwError(() => new Error('Something went wrong. Please try again.'));
  }

  /** GET: Control Panel primary-plan rows for the selected line (LineWisePC). */
  getJobCard_CpDetails(lineWisePC: string): Observable<IJobcard_CpDts[]> {
    const url = `${this.baseUrl}ControlPanelJobCard/GetControlPanel/${lineWisePC}`;
    console.log('[ControlPanelJobcardService] GET getJobCard_CpDetails →', url);
    return this.http.get<IJobcard_CpDts[]>(url)
      .pipe(catchError(this.handleError));
  }

  /** POST: submit the selected Control Panel job-card rows. */
  postjobcard_CpSave(payload: IJobcard_CpSave): Observable<string> {
    const url = `${this.baseUrl}ControlPanelJobCard/SubmitCP`;
    console.log('[ControlPanelJobcardService] POST postjobcard_CpSave →', url, payload);
    return this.http.post(url, payload, { responseType: 'text' })
      .pipe(catchError(this.handleError));
  }
}
