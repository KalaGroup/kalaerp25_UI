import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';

/* ---- Response/Request shapes ---- */

/** A Gantt project the employee created that still has tasks pending feedback. */
export interface GanttFeedbackProject {
  projectId: number;
  projectName: string;
  projectStartDate: string;   // dd/MM/yyyy
  projectEndDate: string;     // dd/MM/yyyy
  pendingCount: number;       // tasks awaiting feedback
}

/** A task that is ESP-closed but pending at feedback — one checkbox row. */
export interface GanttFeedbackTask {
  taskId: number;             // GanttTasks.ID — the selection key
  taskName: string;
  reqCode: string;            // the ESP requisition behind the task
  actNo: number;
  taskStart: string;
  taskFinish: string;
  reqDtTime: string;
  actionDtTime: string;
  reqMsg: string;
  actionTaken: string;
  assignedToName: string;
  actionByName: string;
  selected?: boolean;         // UI-only: checkbox state
  /**
   * UI-only: taskName + reqCode + assignedToName pre-lowercased once at map time.
   * The search box tests this single string instead of calling toLowerCase() three
   * times per row on every keystroke.
   */
  searchBlob: string;
}

export interface SaveGanttFeedbackRequest {
  empCode: string;
  companyCode: string;
  projectId: number;
  rating: string;             // '1'..'5'
  feedbackStatus: string;     // 'A' (Yes) / 'R' (No)
  feedback: string;
  taskIds: number[];
}

export interface GanttFeedbackSaveResult {
  success: boolean;
  savedCount: number;
  requestedCount: number;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class GanttTaskFeedbackService {
  private baseUrl = environment.apiURL; // ends with .../api/

  private apiProjects     = `${this.baseUrl}GanttFeedback/GetProjects`;
  private apiPendingTasks = `${this.baseUrl}GanttFeedback/GetPendingTasks`;
  private apiSaveBatch    = `${this.baseUrl}GanttFeedback/SaveFeedbackBatch`;

  constructor(private http: HttpClient) {}

  /** Employee code (ECode) from the logged-in session — matches GanttProject.ProjectCreatedBy. */
  get employeeCode(): string {
    return localStorage.getItem('employeeCode') || localStorage.getItem('APP_USER_ID') || '';
  }

  /** Company code from the logged-in session (for the audit row). */
  get companyCode(): string {
    return localStorage.getItem('companyId') || '';
  }

  /** Projects created by the session employee that still have pending-feedback tasks. */
  getProjects(): Observable<GanttFeedbackProject[]> {
    const params = new HttpParams().set('empCode', this.employeeCode);
    return this.http.get<any[]>(this.apiProjects, { params }).pipe(
      map((res) =>
        (res || []).map((p) => ({
          projectId: p.ProjectID,
          projectName: p.ProjectName,
          projectStartDate: p.ProjectStartDate || '',
          projectEndDate: p.ProjectEndDate || '',
          pendingCount: p.PendingCount || 0,
        })),
      ),
    );
  }

  /** Tasks inside one project that are waiting for feedback. */
  getPendingTasks(projectId: number): Observable<GanttFeedbackTask[]> {
    const params = new HttpParams()
      .set('empCode', this.employeeCode)
      .set('projectId', String(projectId));
    return this.http.get<any[]>(this.apiPendingTasks, { params }).pipe(
      map((res) =>
        (res || []).map((t) => {
          const taskName = t.TaskName || '';
          const reqCode = t.ReqCode || '';
          const assignedToName = t.AssignedToName || '';
          return {
            taskId: t.TaskID,
            taskName,
            reqCode,
            actNo: t.ActNo || 0,
            taskStart: t.TaskStart || '',
            taskFinish: t.TaskFinish || '',
            reqDtTime: t.ReqDtTime || '',
            actionDtTime: t.ActionDtTime || '',
            reqMsg: t.ReqMsg || '',
            actionTaken: t.ActionTaken || '',
            assignedToName,
            actionByName: t.ActionByName || '',
            selected: false,
            searchBlob: `${taskName} ${reqCode} ${assignedToName}`.toLowerCase(),
          };
        }),
      ),
    );
  }

  /** One rating/status/remark applied to every ticked task, saved in one transaction. */
  saveFeedbackBatch(payload: SaveGanttFeedbackRequest): Observable<GanttFeedbackSaveResult> {
    return this.http.post<any>(this.apiSaveBatch, payload).pipe(
      map((r) => ({
        success: !!r?.Success,
        savedCount: r?.SavedCount ?? 0,
        requestedCount: r?.RequestedCount ?? 0,
        message: r?.Message || '',
      })),
    );
  }
}
