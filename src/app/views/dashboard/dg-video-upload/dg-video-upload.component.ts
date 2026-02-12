import { Component, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dg-video-upload',
  templateUrl: './dg-video-upload.component.html',
  styleUrl: './dg-video-upload.component.scss',
})
export class DgVideoUploadComponent {
  private baseUrl = environment.apiURL;
  // Form fields
  uploadFor: string = '';
  engineSrNo: string = '';
  selectedFile: File | null = null;
  selectedFileName: string = '';
  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';
  currentUser: string = '';

  // File chooser state
  showFileChooser: boolean = false;

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
      'jpg',
      'jpeg',
      'png',
      'mp3',
      'mp4',
      'mov',
      'pdf',
      '.wmv',
      '.flv',
      'avi',
      '.mpg',
      '.wav',
      '.mpeg',
      '.dat',
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
      this.uploadFor &&
      this.engineSrNo &&
      this.engineSrNo.length >= 10 &&
      this.selectedFile
    );
  }

  // Upload file
  uploadFile(): void {
    if (!this.uploadFor) {
      this.warningMessage = 'Please select Upload For type.';
      return;
    }

    if (!this.engineSrNo || this.engineSrNo.length < 10) {
      this.warningMessage = 'Engine Sr No must be at least 10 characters.';
      return;
    }

    if (!this.selectedFile) {
      this.warningMessage = 'Please select a file.';
      return;
    }
    // Create FormData for upload
    const formData = new FormData();
    formData.append('UploadFor', this.uploadFor);
    formData.append('EngSrNo', this.engineSrNo);
    formData.append('File', this.selectedFile as File);
    formData.append('EmpCode', this.currentUser);

    console.log('Uploading file:', {
      uploadFor: this.uploadFor,
      engineSrNo: this.engineSrNo,
      fileName: this.selectedFileName,
      fileSize: this.getFileSize(),
    });

    this.http
      .post(
        `${this.baseUrl}DGAssemblly/UploadTestReportAndPDIRVideo`,
        formData,
        { responseType: 'text' }
      )
      .subscribe({
        next: (response: string) => {
          if (response === 'File uploaded successfully!') {
            this.successMessage = response;
            this.resetForm();
          } else {
            this.errorMessage = response;
          }
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.errorMessage = 'Failed to upload file. Please try again.';
        },
      });
    // this.resetForm();
  }

  // Reset form
  resetForm(): void {
    this.uploadFor = '';
    this.engineSrNo = '';
    this.selectedFile = null;
    this.selectedFileName = '';
    this.resetFileInputs();
  }
}
