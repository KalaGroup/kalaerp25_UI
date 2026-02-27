import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  QualityService,
  DivisionResponse,
  DepartmentResponse,
  WorkstationResponse,
} from '../quality.service';

@Component({
    selector: 'app-kaizen',
    templateUrl: './kaizen.component.html',
    styleUrls: ['./kaizen.component.scss'],
    standalone: false
})
export class KaizenComponent implements OnInit {
 kaizenForm!: FormGroup;
  isProblemSectionOpen = false;
  isVisualSectionOpen = false;
  isAnalysisSectionOpen = false;
  isBenefitsSectionOpen = false;
  isSustenanceSectionOpen = false;
  showPreview = false;

  errorMessage = '';
  successMessage = '';
  warningMessage = '';

  divisions: DivisionResponse[] = [];
  departments: DepartmentResponse[] = [];
  workstations: WorkstationResponse[] = [];
  kaizenThemes: any[] = [];
  resultOptions: any[] = [];
  pqcdsmOptions: any[] = [];

  // Multi-select tracking for Result, PQCDSM, Benefit
  selectedResultIds: string[] = [];
  selectedPqcdsmIds: string[] = [];
  selectedBenefitIds: string[] = [];

  // Photo upload
  beforePhoto: File | null = null;
  afterPhoto: File | null = null;
  impactGraph: File | null = null;
  beforePhotoPreview: string | null = null;
  afterPhotoPreview: string | null = null;
  impactGraphPreview: string | null = null;
  attachments: File[] = [];
  graphFullscreen = false;
  maxFileSize = 25 * 1024 * 1024; // 25MB in bytes

  // Table & Edit
  kaizenRecords: any[] = [];
  editingId: number | null = null;
  editingRow: any = null;
  showForm = false;
  isChecker = true; // Toggle: false = Maker, true = Checker (for testing auth flow)
  previewSheetNo = '';
  previewRecord: any = null;
  isGeneratingPdf = false;

  constructor(
    private fb: FormBuilder,
    private qualityService: QualityService
  ) {}

  ngOnInit(): void {
    this.kaizenForm = this.fb.group({
      divisionId: ['', Validators.required],
      departmentCode: ['', Validators.required],
      workstationCode: [''],
      kaizenTheme: [''],
      // 5W2H Problem Description fields
      what: ['', Validators.required],
      when: ['', Validators.required],
      where: ['', Validators.required],
      who: ['', Validators.required],
      why: ['', Validators.required],
      how: ['', Validators.required],
      howMuch: ['', Validators.required],
      // 5 Why Analysis & Countermeasure
      why1: [''],
      why2: [''],
      why3: [''],
      why4: [''],
      why5: [''],
      // Idea & Countermeasure
      idea: [''],
      ideaRemark: [''],
      countermeasureComment: [''],
      kaizenInitiationDate: ['', Validators.required],
      completionDate: [''],
      result: [''],
      improvement: [''],
      benefit: [''],
      investmentArea: [''],
      savingArea: [''],
      horizontalDeployment: [''],
      whatToDo: [''],
      howToDo: [''],
      frequency: [''],
      dataSubmittedBy: [''],
      dataSubmittedOn: [''],
    });

    this.kaizenThemes = [
      { id: 'Reduce', name: '↓ Reduce' },
      { id: 'Eliminate', name: '● Eliminate' },
      { id: 'Increase', name: '↑ Increase' },
    ];

    this.resultOptions = [
      { id: 'Reduce Time', name: 'Reduce Time', icon: '⏱️', colorClass: 'result-reduce-time' },
      { id: 'Reduce Frequency', name: 'Reduce Frequency', icon: '📉', colorClass: 'result-reduce-freq' },
      { id: 'Eliminate', name: 'Eliminate', icon: '🚫', colorClass: 'result-eliminate' },
      { id: 'Increase Life', name: 'Increase Life', icon: '♻️', colorClass: 'result-increase-life' },
    ];

    this.pqcdsmOptions = [
      { id: 'P', letter: 'P', name: 'Productivity', color: '#e74c3c' },
      { id: 'Q', letter: 'Q', name: 'Quality', color: '#3498db' },
      { id: 'C', letter: 'C', name: 'Cost', color: '#f39c12' },
      { id: 'D', letter: 'D', name: 'Delivery', color: '#2ecc71' },
      { id: 'S', letter: 'S', name: 'Safety', color: '#9b59b6' },
      { id: 'M', letter: 'M', name: 'Morale', color: '#1abc9c' },
    ];

    this.loadDivisions();
    this.loadWorkstations();
    this.loadKaizenRecords();
  }

  loadDivisions(): void {
    this.qualityService.getDivisionCodeAndName().subscribe({
      next: (data) => {
        this.divisions = data;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load divisions.';
        console.error('Error loading divisions:', err);
      },
    });
  }

  loadWorkstations(): void {
    this.qualityService.getWorkstationCodeAndName().subscribe({
      next: (data) => {
        this.workstations = data;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load workstations.';
        console.error('Error loading workstations:', err);
      },
    });
  }

  onDivisionChange(): void {
    const divisionId = this.kaizenForm.get('divisionId')?.value;
    this.kaizenForm.get('departmentCode')?.reset('');
    this.departments = [];

    if (divisionId) {
      this.qualityService.getDepartmentsByDivisionId(divisionId).subscribe({
        next: (data) => {
          this.departments = data;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load departments.';
          console.error('Error loading departments:', err);
        },
      });
    }
  }

  // Photo upload handlers
  onBeforePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (this.validateFile(file)) {
        this.beforePhoto = file;
        this.generatePreview(file, 'before');
      } else {
        input.value = '';
      }
    }
  }

  onAfterPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (this.validateFile(file)) {
        this.afterPhoto = file;
        this.generatePreview(file, 'after');
      } else {
        input.value = '';
      }
    }
  }

  validateFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Only JPG and PNG files are allowed.';
      return false;
    }
    if (file.size > this.maxFileSize) {
      this.errorMessage = 'File size must be less than 25MB.';
      return false;
    }
    return true;
  }

  generatePreview(file: File, type: 'before' | 'after'): void {
    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'before') {
        this.beforePhotoPreview = reader.result as string;
      } else {
        this.afterPhotoPreview = reader.result as string;
      }
    };
    reader.readAsDataURL(file);
  }

  removeBeforePhoto(): void {
    this.beforePhoto = null;
    this.beforePhotoPreview = null;
  }

  removeAfterPhoto(): void {
    this.afterPhoto = null;
    this.afterPhotoPreview = null;
  }

  onImpactGraphSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > this.maxFileSize) {
        alert('File size exceeds 25MB limit');
        return;
      }
      this.impactGraph = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.impactGraphPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
      input.value = '';
    }
  }

  removeImpactGraph(): void {
    this.impactGraph = null;
    this.impactGraphPreview = null;
  }

  downloadImpactGraph(): void {
    if (this.impactGraph && this.impactGraphPreview) {
      const link = document.createElement('a');
      link.href = this.impactGraphPreview;
      link.download = this.impactGraph.name;
      link.click();
    }
  }

  openGraphFullscreen(): void {
    if (this.impactGraphPreview) {
      window.open(this.impactGraphPreview, '_blank');
    }
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > this.maxFileSize) {
        alert('File size exceeds 25MB limit');
        return;
      }
      this.attachments.push(file);
      input.value = '';
    }
  }

  removeAttachment(index: number): void {
    this.attachments.splice(index, 1);
  }

  downloadAttachment(index: number): void {
    const file = this.attachments[index];
    if (file) {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    }
  }

  getFileSize(file: File | null): string {
    if (!file) return '';
    const bytes = file.size;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getFileIcon(file: File): string {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return '📄';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return '📗';
    if (['doc', 'docx'].includes(ext)) return '📘';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
    return '📎';
  }

  // Section toggles
  toggleProblemSection(): void {
    this.isProblemSectionOpen = !this.isProblemSectionOpen;
  }
  toggleVisualSection(): void {
    this.isVisualSectionOpen = !this.isVisualSectionOpen;
  }
  toggleAnalysisSection(): void {
    this.isAnalysisSectionOpen = !this.isAnalysisSectionOpen;
  }
  toggleBenefitsSection(): void {
    this.isBenefitsSectionOpen = !this.isBenefitsSectionOpen;
  }
  toggleSustenanceSection(): void {
    this.isSustenanceSectionOpen = !this.isSustenanceSectionOpen;
  }

  // Preview helpers
  getSelectedDivisionName(): string {
    const id = this.kaizenForm.get('divisionId')?.value;
    const found = this.divisions.find((d) => d.DivisionId == id);
    return found ? found.DivisionName : '';
  }

  getSelectedDepartmentName(): string {
    const code = this.kaizenForm.get('departmentCode')?.value;
    const found = this.departments.find((d) => d.DepartmentCode == code);
    return found ? found.DepartmentName : '';
  }

  getSelectedWorkstationName(): string {
    const code = this.kaizenForm.get('workstationCode')?.value;
    const found = this.workstations.find((w) => w.WorkstationCode === code);
    return found ? found.WorkstationName : '';
  }

  getSelectedThemeName(): string {
    const id = this.kaizenForm.get('kaizenTheme')?.value;
    const found = this.kaizenThemes.find((t) => t.id == id);
    return found ? found.name : '';
  }

  getSelectedResultName(): string {
    return this.selectedResultIds.join(', ');
  }

  // ── Result multi-select ──
  toggleResult(id: string): void {
    const index = this.selectedResultIds.indexOf(id);
    if (index > -1) {
      this.selectedResultIds.splice(index, 1);
    } else {
      this.selectedResultIds.push(id);
    }
    this.kaizenForm.get('result')?.setValue(this.selectedResultIds.join(','));
  }

  isResultSelected(id: string): boolean {
    return this.selectedResultIds.includes(id);
  }

  // ── PQCDSM multi-select ──
  togglePqcdsm(id: string): void {
    const index = this.selectedPqcdsmIds.indexOf(id);
    if (index > -1) {
      this.selectedPqcdsmIds.splice(index, 1);
    } else {
      this.selectedPqcdsmIds.push(id);
    }
    this.kaizenForm.get('improvement')?.setValue(this.selectedPqcdsmIds.join(','));
  }

  isPqcdsmSelected(id: string): boolean {
    return this.selectedPqcdsmIds.includes(id);
  }

  getSelectedPqcdsmNames(): string {
    return this.selectedPqcdsmIds
      .map((id) => {
        const found = this.pqcdsmOptions.find((p: any) => p.id === id);
        return found ? `${found.letter} - ${found.name}` : '';
      })
      .filter((n) => n)
      .join(', ');
  }

  // ── Benefit multi-select ──
  toggleBenefit(id: string): void {
    const index = this.selectedBenefitIds.indexOf(id);
    if (index > -1) {
      this.selectedBenefitIds.splice(index, 1);
    } else {
      this.selectedBenefitIds.push(id);
    }
    this.kaizenForm.get('benefit')?.setValue(this.selectedBenefitIds.join(','));
  }

  isBenefitSelected(id: string): boolean {
    return this.selectedBenefitIds.includes(id);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  openPreview(): void {
    this.previewRecord = null;
    this.previewSheetNo = '';
    this.showPreview = true;
  }

  closePreview(): void {
    this.showPreview = false;
    this.previewRecord = null;
  }

  onSubmit(): void {
    if (this.kaizenForm.valid) {
      const fd = this.buildFormData();

      if (this.editingId) {
        // UPDATE
        this.qualityService.updateKaizenSheet(this.editingId, fd).subscribe({
          next: (res) => {
            this.successMessage = `Kaizen sheet updated successfully!`;
            this.onCloseForm();
            this.loadKaizenRecords();
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Failed to update Kaizen sheet.';
          },
        });
      } else {
        // CREATE
        this.qualityService.saveKaizenSheet(fd).subscribe({
          next: (res) => {
            this.successMessage = `Kaizen sheet created successfully!`;
            this.onCloseForm();
            this.loadKaizenRecords();
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Failed to save Kaizen sheet.';
          },
        });
      }
    } else {
      this.kaizenForm.markAllAsTouched();
      this.errorMessage = 'Please fill all required fields.';
    }
  }

  buildFormData(): FormData {
    const fd = new FormData();
    const v = this.kaizenForm.value;

    fd.append('DivisionId', v.divisionId || '');
    fd.append('DivisionName', this.getSelectedDivisionName());
    fd.append('DepartmentCode', v.departmentCode || '');
    fd.append('DepartmentName', this.getSelectedDepartmentName());
    fd.append('WorkstationCode', v.workstationCode || '');
    fd.append('WorkstationName', this.getSelectedWorkstationName());
    fd.append('KaizenTheme', v.kaizenTheme || '');
    fd.append('KaizenInitiationDate', v.kaizenInitiationDate || '');
    fd.append('CompletionDate', v.completionDate || '');

    fd.append('ProblemWhat', v.what || '');
    fd.append('ProblemWhen', v.when || '');
    fd.append('ProblemWhere', v.where || '');
    fd.append('ProblemWho', v.who || '');
    fd.append('ProblemWhy', v.why || '');
    fd.append('ProblemHow', v.how || '');
    fd.append('ProblemHowMuch', v.howMuch || '');

    fd.append('RcaWhy1', v.why1 || '');
    fd.append('RcaWhy2', v.why2 || '');
    fd.append('RcaWhy3', v.why3 || '');
    fd.append('RcaWhy4', v.why4 || '');
    fd.append('RcaWhy5', v.why5 || '');

    fd.append('Idea', v.idea || '');
    fd.append('IdeaRemark', v.ideaRemark || '');
    fd.append('CountermeasureRemark', v.countermeasureComment || '');

    fd.append('Result', this.selectedResultIds.join(','));
    fd.append('Improvement', this.selectedPqcdsmIds.join(','));
    fd.append('Benefit', this.selectedBenefitIds.join(','));
    fd.append('InvestmentArea', v.investmentArea || '');
    fd.append('SavingArea', v.savingArea || '');
    fd.append('HorizontalDeployment', v.horizontalDeployment || '');

    fd.append('SustenanceWhatToDo', v.whatToDo || '');
    fd.append('SustenanceHowToDo', v.howToDo || '');
    fd.append('SustenanceFrequency', v.frequency || '');

    fd.append('DataSubmittedBy', v.dataSubmittedBy || '');
    fd.append('DataSubmittedOn', v.dataSubmittedOn || '');

    if (this.beforePhoto) {
      fd.append('beforePhoto', this.beforePhoto, this.beforePhoto.name);
    }
    if (this.afterPhoto) {
      fd.append('afterPhoto', this.afterPhoto, this.afterPhoto.name);
    }
    if (this.impactGraph) {
      fd.append('impactGraph', this.impactGraph, this.impactGraph.name);
    }

    // For update: send existing file paths if no new file selected
    // This prevents backend from nulling out existing files
    if (this.editingId && this.editingRow) {
      if (!this.beforePhoto && this.editingRow.BeforePhotoPath) {
        fd.append('BeforePhotoPath', this.editingRow.BeforePhotoPath);
        fd.append('BeforePhotoName', this.editingRow.BeforePhotoName || '');
      }
      if (!this.afterPhoto && this.editingRow.AfterPhotoPath) {
        fd.append('AfterPhotoPath', this.editingRow.AfterPhotoPath);
        fd.append('AfterPhotoName', this.editingRow.AfterPhotoName || '');
      }
      if (!this.impactGraph && this.editingRow.ImpactGraphPath) {
        fd.append('ImpactGraphPath', this.editingRow.ImpactGraphPath);
        fd.append('ImpactGraphName', this.editingRow.ImpactGraphName || '');
      }
    }

    return fd;
  }

  // ── Table Methods ──

  loadKaizenRecords(): void {
    this.qualityService.getAllKaizenSheets().subscribe({
      next: (data) => {
        this.kaizenRecords = data;
      },
      error: () => {
        this.kaizenRecords = [];
      },
    });
  }

  onAddKaizen(): void {
    this.editingId = null;
    this.onReset();
    this.showForm = true;
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  }

  onCloseForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.onReset();
  }

  onEditRecord(row: any): void {
    this.editingId = row.Id;
    this.showForm = true;

    // Load departments for selected division first
    if (row.DivisionId) {
      this.qualityService.getDepartmentsByDivisionId(row.DivisionId).subscribe({
        next: (depts) => {
          this.departments = depts;
          this.patchForm(row);
        },
        error: () => {
          this.patchForm(row);
        },
      });
    } else {
      this.patchForm(row);
    }
  }

  patchForm(row: any): void {
    // Find kaizenTheme id from name
    const themeMatch = this.kaizenThemes.find((t: any) =>
      row.KaizenTheme?.includes(t.id)
    );

    this.kaizenForm.patchValue({
      divisionId: row.DivisionId || '',
      departmentCode: row.DepartmentCode || '',
      workstationCode: row.WorkstationCode || '',
      kaizenTheme: themeMatch ? themeMatch.id : '',
      kaizenInitiationDate: row.KaizenInitiationDate || '',
      completionDate: row.CompletionDate || '',
      what: row.ProblemWhat || '',
      when: row.ProblemWhen || '',
      where: row.ProblemWhere || '',
      who: row.ProblemWho || '',
      why: row.ProblemWhy || '',
      how: row.ProblemHow || '',
      howMuch: row.ProblemHowMuch || '',
      why1: row.RcaWhy1 || '',
      why2: row.RcaWhy2 || '',
      why3: row.RcaWhy3 || '',
      why4: row.RcaWhy4 || '',
      why5: row.RcaWhy5 || '',
      idea: row.Idea || '',
      ideaRemark: row.IdeaRemark || '',
      countermeasureComment: row.CountermeasureRemark || '',
      investmentArea: row.InvestmentArea || '',
      savingArea: row.SavingArea || '',
      horizontalDeployment: row.HorizontalDeployment || '',
      whatToDo: row.SustenanceWhatToDo || '',
      howToDo: row.SustenanceHowToDo || '',
      frequency: row.SustenanceFrequency || '',
      dataSubmittedBy: row.DataSubmittedBy || '',
      dataSubmittedOn: row.DataSubmittedOn || '',
    });

    // Restore multi-selects from comma-separated strings
    this.selectedResultIds = row.Result ? row.Result.split(',').filter((s: string) => s) : [];
    this.selectedPqcdsmIds = row.Improvement ? row.Improvement.split(',').filter((s: string) => s) : [];
    this.selectedBenefitIds = row.Benefit ? row.Benefit.split(',').filter((s: string) => s) : [];

    // Load existing server images as previews for edit mode
    this.beforePhoto = null;
    this.afterPhoto = null;
    this.impactGraph = null;
    this.beforePhotoPreview = row.BeforePhotoPath
      ? this.qualityService.getKaizenFileUrl(row.BeforePhotoPath) : null;
    this.afterPhotoPreview = row.AfterPhotoPath
      ? this.qualityService.getKaizenFileUrl(row.AfterPhotoPath) : null;
    this.impactGraphPreview = row.ImpactGraphPath
      ? this.qualityService.getKaizenFileUrl(row.ImpactGraphPath) : null;

    // Store editing row for reference (file names etc.)
    this.editingRow = row;

    // Open all sections so user can see data
    this.isProblemSectionOpen = true;
    this.isVisualSectionOpen = true;
    this.isAnalysisSectionOpen = true;
    this.isBenefitsSectionOpen = true;
    this.isSustenanceSectionOpen = true;

    // Scroll to form
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  }

  // ── Generic Confirmation Modal ──
  confirmModal = {
    show: false,
    type: '' as 'delete' | 'authorize',
    message: '',
    confirmText: '',
    row: null as any,
  };

  onDeleteRecord(row: any): void {
    this.confirmModal = {
      show: true,
      type: 'delete',
      message: `Are you sure you want to delete ${row.KaizenSheetNo}?`,
      confirmText: 'Yes, Delete',
      row: row,
    };
  }

  onAuthorizeRecord(row: any): void {
    this.confirmModal = {
      show: true,
      type: 'authorize',
      message: `Are you sure you want to authorize Kaizen Sheet "${row.KaizenSheetNo}"? This action cannot be undone.`,
      confirmText: 'Yes, Authorize',
      row: row,
    };
  }

  onConfirmAction(): void {
    if (!this.confirmModal.row) return;
    if (this.confirmModal.type === 'delete') {
      this.executeDelete(this.confirmModal.row);
    } else if (this.confirmModal.type === 'authorize') {
      this.executeAuthorize(this.confirmModal.row);
    }
    this.resetConfirmModal();
  }

  onCancelAction(): void {
    this.resetConfirmModal();
  }

  private resetConfirmModal(): void {
    this.confirmModal = { show: false, type: '' as any, message: '', confirmText: '', row: null };
  }

  private executeDelete(row: any): void {
    this.qualityService.deleteKaizenSheet(row.Id).subscribe({
      next: () => {
        this.successMessage = `${row.KaizenSheetNo} deleted successfully.`;
        this.loadKaizenRecords();
        if (this.editingId === row.Id) {
          this.onCloseForm();
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete.';
      },
    });
  }

  private executeAuthorize(row: any): void {
    this.qualityService.authorizeKaizenSheet(row.Id).subscribe({
      next: () => {
        this.successMessage = `${row.KaizenSheetNo} authorized successfully.`;
        this.loadKaizenRecords();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to authorize.';
      },
    });
  }

  // Preview — only open modal, don't open form or show editing message
  onPreviewRecord(row: any): void {
    this.previewSheetNo = row.KaizenSheetNo || '';
    this.previewRecord = row;
    if (row.DivisionId) {
      this.qualityService.getDepartmentsByDivisionId(row.DivisionId).subscribe({
        next: (depts) => {
          this.departments = depts;
          this.patchFormSilent(row);
          setTimeout(() => { this.showPreview = true; }, 100);
        },
        error: () => {
          this.patchFormSilent(row);
          setTimeout(() => { this.showPreview = true; }, 100);
        },
      });
    } else {
      this.patchFormSilent(row);
      setTimeout(() => { this.showPreview = true; }, 100);
    }
  }

  // Patch form without opening form or showing messages
  patchFormSilent(row: any): void {
    const themeMatch = this.kaizenThemes.find((t: any) =>
      row.KaizenTheme?.includes(t.id)
    );
    this.kaizenForm.patchValue({
      divisionId: row.DivisionId || '',
      departmentCode: row.DepartmentCode || '',
      workstationCode: row.WorkstationCode || '',
      kaizenTheme: themeMatch ? themeMatch.id : '',
      kaizenInitiationDate: row.KaizenInitiationDate || '',
      completionDate: row.CompletionDate || '',
      what: row.ProblemWhat || '',
      when: row.ProblemWhen || '',
      where: row.ProblemWhere || '',
      who: row.ProblemWho || '',
      why: row.ProblemWhy || '',
      how: row.ProblemHow || '',
      howMuch: row.ProblemHowMuch || '',
      why1: row.RcaWhy1 || '',
      why2: row.RcaWhy2 || '',
      why3: row.RcaWhy3 || '',
      why4: row.RcaWhy4 || '',
      why5: row.RcaWhy5 || '',
      idea: row.Idea || '',
      ideaRemark: row.IdeaRemark || '',
      countermeasureComment: row.CountermeasureRemark || '',
      investmentArea: row.InvestmentArea || '',
      savingArea: row.SavingArea || '',
      horizontalDeployment: row.HorizontalDeployment || '',
      whatToDo: row.SustenanceWhatToDo || '',
      howToDo: row.SustenanceHowToDo || '',
      frequency: row.SustenanceFrequency || '',
      dataSubmittedBy: row.DataSubmittedBy || '',
      dataSubmittedOn: row.DataSubmittedOn || '',
    });
    this.selectedResultIds = row.Result ? row.Result.split(',').filter((s: string) => s) : [];
    this.selectedPqcdsmIds = row.Improvement ? row.Improvement.split(',').filter((s: string) => s) : [];
    this.selectedBenefitIds = row.Benefit ? row.Benefit.split(',').filter((s: string) => s) : [];
  }

  splitImprovement(improvement: string | null): string[] {
    return improvement ? improvement.split(',').filter(s => s.trim()) : [];
  }

  // Build full URL for server-stored images via API
  getServerImageUrl(path: string | null): string {
    if (!path) return '';
    return this.qualityService.getKaizenFileUrl(path);
  }

  // Download preview as PDF (direct download, no print dialog)
  async downloadPreviewPdf(): Promise<void> {
    const previewBody = document.querySelector('.preview-modal-body') as HTMLElement;
    const previewModal = document.querySelector('.preview-modal') as HTMLElement;
    const overlay = document.querySelector('.preview-overlay') as HTMLElement;
    if (!previewBody || !previewModal) return;

    this.isGeneratingPdf = true;

    // Dynamically load html2canvas and jsPDF if not already loaded
    if (!(window as any).html2canvas) {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    }
    if (!(window as any).jspdf) {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }

    const html2canvas = (window as any).html2canvas;
    const jsPDF = (window as any).jspdf.jsPDF;

    if (!html2canvas || !jsPDF) {
      alert('PDF libraries failed to load. Please try again.');
      this.isGeneratingPdf = false;
      return;
    }

    // Convert logo to base64 before capturing
    const logoImg = previewBody.querySelector('.company-logo') as HTMLImageElement;
    if (logoImg && !logoImg.src.startsWith('data:')) {
      try {
        const base64 = await this.imageToBase64(logoImg.src);
        logoImg.src = base64;
      } catch (e) {
        console.warn('Logo conversion failed:', e);
      }
    }

    // ── Save original styles ──
    const savedStyles = {
      modalMaxHeight: previewModal.style.maxHeight,
      modalOverflow: previewModal.style.overflow,
      bodyOverflow: previewBody.style.overflow,
      bodyMaxHeight: previewBody.style.maxHeight,
      bodyFlex: previewBody.style.flex,
      bodyHeight: previewBody.style.height,
      overlayOverflow: overlay ? overlay.style.overflow : '',
      overlayAlignItems: overlay ? overlay.style.alignItems : '',
    };

    // ── Temporarily expand to full content height ──
    previewModal.style.maxHeight = 'none';
    previewModal.style.overflow = 'visible';
    previewBody.style.overflow = 'visible';
    previewBody.style.maxHeight = 'none';
    previewBody.style.flex = 'none';
    previewBody.style.height = 'auto';
    if (overlay) {
      overlay.style.overflow = 'visible';
      overlay.style.alignItems = 'flex-start';
    }

    // Wait for layout reflow + images
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const canvas = await html2canvas(previewBody, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 5000,
        scrollX: 0,
        scrollY: -window.scrollY,
        width: previewBody.scrollWidth,
        height: previewBody.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const usableWidth = pdfWidth - margin * 2;

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = usableWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      if (scaledHeight <= pdfHeight - margin * 2) {
        pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, scaledHeight);
      } else {
        let yOffset = 0;
        const pageContentHeight = (pdfHeight - margin * 2) / ratio;

        while (yOffset < imgHeight) {
          const sourceHeight = Math.min(pageContentHeight, imgHeight - yOffset);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = imgWidth;
          pageCanvas.height = sourceHeight;
          const ctx = pageCanvas.getContext('2d')!;
          ctx.drawImage(canvas, 0, yOffset, imgWidth, sourceHeight, 0, 0, imgWidth, sourceHeight);

          const pageData = pageCanvas.toDataURL('image/png');
          const pageScaledHeight = sourceHeight * ratio;

          if (yOffset > 0) pdf.addPage();
          pdf.addImage(pageData, 'PNG', margin, margin, usableWidth, pageScaledHeight);
          yOffset += sourceHeight;
        }
      }

      const fileName = `Kaizen_Sheet_${this.previewSheetNo || 'Preview'}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      // ── Restore original styles ──
      previewModal.style.maxHeight = savedStyles.modalMaxHeight;
      previewModal.style.overflow = savedStyles.modalOverflow;
      previewBody.style.overflow = savedStyles.bodyOverflow;
      previewBody.style.maxHeight = savedStyles.bodyMaxHeight;
      previewBody.style.flex = savedStyles.bodyFlex;
      previewBody.style.height = savedStyles.bodyHeight;
      if (overlay) {
        overlay.style.overflow = savedStyles.overlayOverflow;
        overlay.style.alignItems = savedStyles.overlayAlignItems;
      }
      this.isGeneratingPdf = false;
    }
  }

  // Load external script dynamically
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  }

  // Convert image URL to base64
  private imageToBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // Download all Kaizen records as Excel
  async downloadKaizenExcel(): Promise<void> {
    if (!this.kaizenRecords.length) return;

    // Load SheetJS (xlsx) from CDN
    if (!(window as any).XLSX) {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    }
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      alert('Excel library failed to load.');
      return;
    }

    // Build data rows (exclude image/graph paths)
    const headers = [
      'Sr.', 'Kaizen Sheet No', 'Division', 'Department', 'Workstation',
      'Theme', 'Initiation Date', 'Completion Date',
      'What', 'When', 'Where', 'Who', 'Why', 'How', 'How Much',
      'RCA Why 1', 'RCA Why 2', 'RCA Why 3', 'RCA Why 4', 'RCA Why 5',
      'Idea', 'Idea Remark', 'Countermeasure',
      'Result', 'Improvement', 'Benefit',
      'Investment Area', 'Saving Area', 'Horizontal Deployment',
      'Sustenance What', 'Sustenance How', 'Frequency',
      'Submitted By', 'Submitted On', 'Status'
    ];

    const rows = this.kaizenRecords.map((r: any, i: number) => [
      i + 1, r.KaizenSheetNo, r.DivisionName, r.DepartmentName, r.WorkstationName,
      r.KaizenTheme, r.KaizenInitiationDate, r.CompletionDate,
      r.ProblemWhat, r.ProblemWhen, r.ProblemWhere, r.ProblemWho, r.ProblemWhy, r.ProblemHow, r.ProblemHowMuch,
      r.RcaWhy1, r.RcaWhy2, r.RcaWhy3, r.RcaWhy4, r.RcaWhy5,
      r.Idea, r.IdeaRemark, r.CountermeasureRemark,
      r.Result, r.Improvement, r.Benefit,
      r.InvestmentArea, r.SavingArea, r.HorizontalDeployment,
      r.SustenanceWhatToDo, r.SustenanceHowToDo, r.SustenanceFrequency,
      r.DataSubmittedBy, r.DataSubmittedOn, r.IsAuth ? 'Authorized' : 'Pending'
    ]);

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-fit column widths
    const colWidths = headers.map((h: string, ci: number) => {
      let max = h.length;
      rows.forEach((row: any[]) => {
        const val = row[ci] != null ? String(row[ci]) : '';
        if (val.length > max) max = val.length;
      });
      return { wch: Math.min(max + 2, 35) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kaizen Sheets');
    XLSX.writeFile(wb, `Kaizen_Sheets_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  onReset(): void {
    this.kaizenForm.reset();
    this.editingId = null;
    this.editingRow = null;
    this.departments = [];
    this.selectedResultIds = [];
    this.selectedPqcdsmIds = [];
    this.selectedBenefitIds = [];
    this.beforePhoto = null;
    this.afterPhoto = null;
    this.impactGraph = null;
    this.beforePhotoPreview = null;
    this.afterPhotoPreview = null;
    this.impactGraphPreview = null;
    this.attachments = [];
    this.isProblemSectionOpen = false;
    this.isVisualSectionOpen = false;
    this.isAnalysisSectionOpen = false;
    this.isBenefitsSectionOpen = false;
    this.isSustenanceSectionOpen = false;
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
  }

  onBack(): void {
    console.log('Back clicked');
  }
}
