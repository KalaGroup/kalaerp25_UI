import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  GanttTaskFeedbackService,
  GanttFeedbackProject,
  GanttFeedbackTask,
  SaveGanttFeedbackRequest,
} from './gantt-task-feedback.service';

/**
 * Gantt Task Feedback
 * ------------------------------------------------------------------
 * Step 1  the employee's Gantt projects that still have pending feedback
 * Step 2  pick a project -> its tasks that are "ESP closed, feedback pending"
 * Step 3  tick several tasks, give ONE rating + Yes/No + remark, save
 *
 * The feedback is written to the ESP tables (CorporateRequisitionFeedback /
 * CorporateRequisition) via each task's ReqCode. No Gantt table is written to.
 *
 * PERFORMANCE NOTE
 * ------------------------------------------------------------------
 * filteredTasks / selectedCount / allVisibleSelected used to be getters. A getter
 * bound in a template re-runs on EVERY change-detection pass, and each of these
 * walked the whole task array -- with 200+ rows and half a dozen bindings that is
 * thousands of comparisons per keystroke, click or HTTP response. They are now
 * plain fields recomputed only when something actually changes, and the component
 * runs OnPush so change detection is not triggered by unrelated app activity.
 * Because of OnPush, every async callback must end with cdr.markForCheck().
 */
@Component({
  selector: 'app-gantt-task-feedback',
  templateUrl: './gantt-task-feedback.component.html',
  styleUrls: ['./gantt-task-feedback.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GanttTaskFeedbackComponent implements OnInit, OnDestroy {
  // ---- data ----
  projects: GanttFeedbackProject[] = [];
  tasks: GanttFeedbackTask[] = [];

  /** Rows currently visible under the search box. Recomputed by applyFilter(). */
  filteredTasks: GanttFeedbackTask[] = [];

  selectedProject: GanttFeedbackProject | null = null;

  // ---- feedback inputs (one set applied to every ticked task) ----
  rating = 0;                 // 1..5, 0 = not chosen
  feedbackStatus = 'Yes';     // 'Yes' -> 'A', 'No' -> 'R'
  feedbackText = '';

  readonly stars = [1, 2, 3, 4, 5];
  readonly statusOptions = ['Yes', 'No'];

  // ---- ui state ----
  isLoading = false;
  isSaving = false;
  projectsLoaded = false;
  successMessage = '';
  errorMessage = '';
  taskFilter = '';

  /** Recomputed by refreshSelectionState() -- never derived in the template. */
  selectedCount = 0;
  allVisibleSelected = false;

  private successTimer: any = null;

  constructor(
    private service: GanttTaskFeedbackService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.clearSuccessTimer();
  }

  // ------------------------------------------------------------------
  // trackBy -- lets Angular reuse existing rows instead of tearing down and
  // rebuilding 200+ <tr> elements whenever the list is reassigned.
  // ------------------------------------------------------------------
  trackByProjectId(_: number, p: GanttFeedbackProject): number {
    return p.projectId;
  }

  trackByTaskId(_: number, t: GanttFeedbackTask): number {
    return t.taskId;
  }

  /** Label under the stars, same wording as the ERP20 feedback form. */
  get ratingHead(): string {
    switch (this.rating) {
      case 1: return 'Below Average';
      case 2: return 'Average';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return '';
    }
  }

  // ------------------------------------------------------------------
  // filtering + selection state
  // ------------------------------------------------------------------
  onFilterChange(value: string): void {
    this.taskFilter = value;
    this.applyFilter();
    this.refreshSelectionState();
  }

  private applyFilter(): void {
    const q = this.taskFilter.trim().toLowerCase();
    this.filteredTasks = q
      ? this.tasks.filter((t) => t.searchBlob.includes(q))
      : this.tasks;
  }

  /**
   * One pass over the task list produces both counters, instead of the template
   * asking for them separately half a dozen times per change-detection cycle.
   */
  private refreshSelectionState(): void {
    let selected = 0;
    for (const t of this.tasks) {
      if (t.selected) selected++;
    }
    this.selectedCount = selected;

    const visible = this.filteredTasks;
    let allSelected = visible.length > 0;
    for (const t of visible) {
      if (!t.selected) {
        allSelected = false;
        break;
      }
    }
    this.allVisibleSelected = allSelected;
  }

  private selectedTasks(): GanttFeedbackTask[] {
    return this.tasks.filter((t) => t.selected);
  }

  // ------------------------------------------------------------------
  // load
  // ------------------------------------------------------------------
  loadProjects(): void {
    this.isLoading = true;
    this.clearMessages();
    this.service.getProjects().subscribe({
      next: (rows) => {
        this.projects = rows;
        this.projectsLoaded = true;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.projects = [];
        this.projectsLoaded = true;
        this.isLoading = false;
        this.errorMessage = 'Could not load your projects. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }

  openProject(project: GanttFeedbackProject): void {
    this.selectedProject = project;
    this.resetForm();
    this.loadTasks();
  }

  backToProjects(): void {
    this.selectedProject = null;
    this.tasks = [];
    this.filteredTasks = [];
    this.resetForm();
    this.clearMessages();
    this.loadProjects();   // refresh pending counts after a save
  }

  /**
   * @param keepMessages leave the banner alone -- set after a save so the success
   *        message survives the reload that follows it.
   */
  private loadTasks(keepMessages = false): void {
    if (!this.selectedProject) return;
    this.isLoading = true;
    if (!keepMessages) this.clearMessages();

    this.service.getPendingTasks(this.selectedProject.projectId).subscribe({
      next: (rows) => {
        this.tasks = rows;
        this.applyFilter();
        this.refreshSelectionState();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.tasks = [];
        this.filteredTasks = [];
        this.refreshSelectionState();
        this.isLoading = false;
        this.errorMessage = 'Could not load the tasks for this project.';
        this.cdr.markForCheck();
      },
    });
  }

  // ------------------------------------------------------------------
  // selection
  // ------------------------------------------------------------------
  toggleTask(task: GanttFeedbackTask): void {
    task.selected = !task.selected;
    this.refreshSelectionState();
  }

  /** Select/clear every row currently visible under the filter. */
  toggleSelectAll(): void {
    const target = !this.allVisibleSelected;
    for (const t of this.filteredTasks) {
      t.selected = target;
    }
    this.refreshSelectionState();
  }

  clearSelection(): void {
    for (const t of this.tasks) {
      t.selected = false;
    }
    this.refreshSelectionState();
  }

  setRating(value: number): void {
    this.rating = value;
  }

  // ------------------------------------------------------------------
  // save
  // ------------------------------------------------------------------
  submitFeedback(): void {
    this.clearMessages();

    if (!this.selectedProject) return;

    if (this.selectedCount === 0) {
      this.errorMessage = 'Please select at least one task.';
      return;
    }
    if (!this.feedbackStatus) {
      this.errorMessage = 'Please select the feedback complete status.';
      return;
    }
    if (this.rating < 1 || this.rating > 5) {
      this.errorMessage = 'Please select a rating.';
      return;
    }
    if (!this.feedbackText.trim()) {
      this.errorMessage = 'Please fill in the feedback.';
      return;
    }

    const payload: SaveGanttFeedbackRequest = {
      empCode: this.service.employeeCode,
      companyCode: this.service.companyCode,
      projectId: this.selectedProject.projectId,
      rating: String(this.rating),
      feedbackStatus: this.feedbackStatus === 'Yes' ? 'A' : 'R',
      feedback: this.feedbackText.trim(),
      taskIds: this.selectedTasks().map((t) => t.taskId),
    };

    const sentCount = payload.taskIds.length;

    this.isSaving = true;
    this.service.saveFeedbackBatch(payload).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.success) {
          this.resetForm();
          const saved = res.savedCount || sentCount;
          this.showSuccess(
            res.message || `Feedback saved successfully for ${saved} task(s).`,
          );
          // keepMessages: the reload below must not wipe the banner we just set
          this.loadTasks(true);
        } else {
          this.errorMessage = res.message || 'Could not save the feedback.';
          this.loadTasks(true);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSaving = false;
        this.errorMessage = 'Could not save the feedback. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }

  // ------------------------------------------------------------------
  // messages
  // ------------------------------------------------------------------
  /** Show the green banner and retire it on its own after a few seconds. */
  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    this.clearSuccessTimer();
    this.successTimer = setTimeout(() => {
      this.successMessage = '';
      this.successTimer = null;
      this.cdr.markForCheck();   // OnPush: a bare timer will not refresh the view
    }, 8000);
  }

  dismissSuccess(): void {
    this.clearSuccessTimer();
    this.successMessage = '';
  }

  private clearSuccessTimer(): void {
    if (this.successTimer) {
      clearTimeout(this.successTimer);
      this.successTimer = null;
    }
  }

  private resetForm(): void {
    this.rating = 0;
    this.feedbackStatus = 'Yes';
    this.feedbackText = '';
    this.taskFilter = '';
    this.applyFilter();
    this.clearSelection();
  }

  private clearMessages(): void {
    this.clearSuccessTimer();
    this.successMessage = '';
    this.errorMessage = '';
  }
}
