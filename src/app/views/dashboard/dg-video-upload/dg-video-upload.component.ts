import { Component, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'environments/environment';
import { HttpClient, HttpEventType, HttpRequest, HttpResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-dg-video-upload',
    templateUrl: './dg-video-upload.component.html',
    styleUrl: './dg-video-upload.component.scss',
    standalone: false
})
export class DgVideoUploadComponent {
  private baseUrl = environment.apiURL;

  // Form fields
  uploadFor: string = 'TestReport';
  engineSrNo: string = '';
  selectedFile: File | null = null;
  selectedFileName: string = '';
  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';
  currentUser: string = '';

  // File chooser state
  showFileChooser: boolean = false;

  // Upload progress state
  isUploading: boolean = false;
  uploadProgress: number = 0;          // 0-100
  uploadedBytes: number = 0;
  totalBytes: number = 0;
  uploadSpeed: number = 0;              // bytes/sec
  uploadETA: number = 0;                // seconds remaining
  private uploadStartTime: number = 0;
  private uploadSubscription: Subscription | null = null;

  // Accepted file types
  acceptedFileTypes: string =
    'image/jpg,image/jpeg,image/png,audio/mp3,audio/mpeg,video/mp4,video/quicktime,application/pdf';

  // File size limit (500MB)
  maxFileSize: number = 500 * 1024 * 1024;

  // ViewChild references for file inputs
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') galleryInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    const employeeCode = localStorage.getItem('employeeCode');
    this.currentUser = employeeCode;
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/dg-assembly']);
  }

  // File Chooser Methods
  openFileChooser(): void {
    this.showFileChooser = true;
    document.body.style.overflow = 'hidden';
  }

  closeFileChooser(): void {
    this.showFileChooser = false;
    document.body.style.overflow = 'auto';
  }

  openCamera(): void {
    this.closeFileChooser();
    setTimeout(() => {
      this.cameraInput.nativeElement.click();
    }, 300);
  }

  openGallery(): void {
    this.closeFileChooser();
    setTimeout(() => {
      this.galleryInput.nativeElement.click();
    }, 300);
  }

  openFileBrowser(): void {
    this.closeFileChooser();
    setTimeout(() => {
      this.fileInput.nativeElement.click();
    }, 300);
  }

  // File Selection Handler
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type
      if (!this.isValidFileType(file)) {
        this.errorMessage =
          'Invalid file type. Please select JPG, PNG, JPEG, MP3, MP4, or PDF file.';
        this.resetFileInputs();
        return;
      }

      // Validate file size
      if (file.size > this.maxFileSize) {
        this.errorMessage =
          'File size exceeds 500MB limit. Please select a smaller file.';
        this.resetFileInputs();
        return;
      }

      this.selectedFile = file;
      this.selectedFileName = file.name;
    }

    // Reset input value to allow re-selection of same file
    input.value = '';
  }

  // File Validation
  isValidFileType(file: File): boolean {
    const validTypes = [
      'image/jpg',
      'image/jpeg',
      'image/png',
      'audio/mp3',
      'audio/mpeg',
      'video/mp4',
      'video/quicktime',
      'application/pdf',
    ];

    // Check MIME type
    if (validTypes.includes(file.type)) {
      return true;
    }

    // Check file extension as fallback
    const extension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = [
      'jpg', 'jpeg', 'png', 'mp3', 'mp4', 'mov', 'pdf',
      'wmv', 'flv', 'avi', 'mpg', 'wav', 'mpeg', 'dat',
    ];

    return validExtensions.includes(extension || '');
  }

  // Remove selected file
  removeFile(): void {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.resetFileInputs();
  }

  // Reset all file inputs
  resetFileInputs(): void {
    if (this.cameraInput) this.cameraInput.nativeElement.value = '';
    if (this.galleryInput) this.galleryInput.nativeElement.value = '';
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
  }

  // Get file icon based on type
  getFileIcon(): string {
    if (!this.selectedFile) return 'fas fa-file';

    const type = this.selectedFile.type;

    if (type.startsWith('image/')) return 'fas fa-file-image';
    if (type.startsWith('video/')) return 'fas fa-file-video';
    if (type.startsWith('audio/')) return 'fas fa-file-audio';
    if (type === 'application/pdf') return 'fas fa-file-pdf';

    return 'fas fa-file';
  }

  // Get formatted file size
  getFileSize(): string {
    if (!this.selectedFile) return '';

    const bytes = this.selectedFile.size;

    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // Form validation
  isFormValid(): boolean {
    return !!(
      this.engineSrNo &&
      this.engineSrNo.length >= 10 &&
      this.selectedFile
    );
  }

  // Upload file with progress tracking
  uploadFile(): void {
    if (!this.engineSrNo || this.engineSrNo.length < 10) {
      this.warningMessage = 'Engine Sr No must be at least 10 characters.';
      return;
    }

    if (!this.selectedFile) {
      this.warningMessage = 'Please select a file.';
      return;
    }

    const formData = new FormData();
    formData.append('UploadFor', this.uploadFor);
    formData.append('EngSrNo', this.engineSrNo);
    formData.append('File', this.selectedFile as File);
    formData.append('EmpCode', this.currentUser);

    // Init progress state
    this.isUploading      = true;
    this.uploadProgress   = 0;
    this.uploadedBytes    = 0;
    this.totalBytes       = this.selectedFile.size;
    this.uploadSpeed      = 0;
    this.uploadETA        = 0;
    this.uploadStartTime  = Date.now();
    this.clearMessages();

    const req = new HttpRequest(
      'POST',
      `${this.baseUrl}DGAssemblly/UploadTestReportAndPDIRVideo`,
      formData,
      { reportProgress: true, responseType: 'text' }
    );

    this.uploadSubscription = this.http.request(req).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total || this.totalBytes;
          this.uploadedBytes  = event.loaded;
          this.totalBytes     = total;
          this.uploadProgress = Math.min(100, Math.round((event.loaded / total) * 100));

          const elapsedSec = (Date.now() - this.uploadStartTime) / 1000;
          if (elapsedSec > 0.2) {
            this.uploadSpeed = event.loaded / elapsedSec;
            const remaining  = total - event.loaded;
            this.uploadETA   = this.uploadSpeed > 0 ? remaining / this.uploadSpeed : 0;
          }
        } else if (event instanceof HttpResponse) {
          this.isUploading = false;
          this.uploadSubscription = null;
          const response = (event.body as string) || '';
          if (response.toLowerCase().includes('successfully')) {
            this.successMessage = response;
            this.resetForm();
          } else {
            this.errorMessage = response;
          }
        }
      },
      error: (error) => {
        this.isUploading = false;
        this.uploadSubscription = null;
        console.error('Upload error:', error);
        this.errorMessage = 'Failed to upload file. Please check your connection and try again.';
      },
    });
  }

  // Cancel an in-progress upload
  cancelUpload(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = null;
    }
    this.isUploading = false;
    this.uploadProgress = 0;
    this.warningMessage = 'Upload cancelled.';
  }

  // Format helpers used by the progress modal
  formatBytes(bytes: number): string {
    if (!bytes || bytes < 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  formatSpeed(bytesPerSec: number): string {
    if (!bytesPerSec || bytesPerSec <= 0) return '...';
    return this.formatBytes(bytesPerSec) + '/s';
  }

  formatETA(seconds: number): string {
    if (!isFinite(seconds) || seconds <= 0) return '...';
    if (seconds < 60) return Math.round(seconds) + 's';
    if (seconds < 3600) {
      const m = Math.floor(seconds / 60);
      const s = Math.round(seconds % 60);
      return `${m}m ${s}s`;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  // Reset form
  resetForm(): void {
    this.engineSrNo = '';
    this.selectedFile = null;
    this.selectedFileName = '';
    this.resetFileInputs();
  }
}
