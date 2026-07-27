import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'environments/environment';
import { HttpClient, HttpEventType, HttpRequest, HttpResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

// State machine for the in-app recorder overlay.
//   closed     — overlay hidden; existing "Choose File" flow only
//   requesting — asking browser for camera permission / stream
//   ready      — camera feed live in the preview, waiting for Record
//   recording  — MediaRecorder is capturing chunks
//   stopping   — user clicked Stop; MediaRecorder is flushing its final chunks
//                (short-lived transient state — usually ~50-200 ms). Renders
//                the Stop button disabled + labelled "Stopping…" so a second
//                click can't slip through and the transition feels immediate.
//   preview    — recording stopped, user is reviewing the take
//   error      — permission denied / no camera / MediaRecorder unsupported
type RecorderState = 'closed' | 'requesting' | 'ready' | 'recording' | 'stopping' | 'preview' | 'error';

// One video-input device — populated from mediaDevices.enumerateDevices().
interface CameraDevice {
  deviceId: string;
  label:    string;
}

@Component({
    selector: 'app-dg-video-upload',
    templateUrl: './dg-video-upload.component.html',
    styleUrl: './dg-video-upload.component.scss',
    standalone: false
})
export class DgVideoUploadComponent implements OnInit, OnDestroy {
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

  // File chooser bottom-sheet state
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

  // Accepted file types — WebM added so recorded takes (which browsers
  // typically encode as video/webm) pass the same validator as picked files.
  acceptedFileTypes: string =
    'image/jpg,image/jpeg,image/png,audio/mp3,audio/mpeg,video/mp4,video/webm,video/quicktime,application/pdf';

  // File size limit (500MB) — also enforced live during recording.
  maxFileSize: number = 500 * 1024 * 1024;

  // ── In-app video recorder ──────────────────────────────────────
  recorderState: RecorderState = 'closed';
  recorderError: string = '';
  cameras: CameraDevice[] = [];
  selectedCameraId: string = '';           // bound to the camera-picker <select>
  recordingSize: number = 0;               // running total bytes captured
  recordingDuration: number = 0;           // running seconds elapsed
  recordedVideoUrl: string = '';           // object URL for in-recorder playback

  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordedBlob: Blob | null = null;
  private recordedMimeType: string = '';
  private recordingTimerId: any = null;
  private recordingStartedAt: number = 0;

  // Preview URL for the file preview area (playback of the "selected" video).
  // Kept separate from recordedVideoUrl so we can revoke each independently.
  previewUrl: string = '';

  // ── Custom confirm dialog (replaces window.confirm for a consistent UX) ──
  // Follows the same visual idiom as the warning/error/success modals — a
  // question, a Yes button and a Cancel button. The stored callback runs
  // when the user picks Yes; picking Cancel just closes the dialog.
  confirmMessage: string = '';
  confirmYesLabel: string = 'Yes';
  confirmNoLabel:  string = 'Cancel';
  private pendingConfirmAction: (() => void) | null = null;

  // ViewChild references for file inputs
  @ViewChild('galleryInput') galleryInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput')    fileInput!:    ElementRef<HTMLInputElement>;
  @ViewChild('livePreview')  livePreview!:  ElementRef<HTMLVideoElement>;

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    const employeeCode = localStorage.getItem('employeeCode');
    this.currentUser = employeeCode ?? '';
  }

  ngOnDestroy(): void {
    // Belt-and-braces cleanup — stops the camera light, cancels any timer,
    // frees blob URLs so nothing lingers if the user navigates away mid-flow.
    this.closeRecorder(true);
    this.revokePreviewUrl();
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/dg-assembly']);
  }

  // ═════════════════════════════════════════════════════════════════
  //  Bottom-sheet chooser (Camera / Photos-videos / Browse)
  // ═════════════════════════════════════════════════════════════════
  openFileChooser(): void {
    this.showFileChooser = true;
    document.body.style.overflow = 'hidden';
  }

  closeFileChooser(): void {
    this.showFileChooser = false;
    document.body.style.overflow = 'auto';
  }

  // Sheet → Camera → opens the in-app recorder (replaces the old
  // OS-native <input type="file" capture>) so the user can preview,
  // review, and re-take before committing.
  openCamera(): void {
    this.closeFileChooser();
    setTimeout(() => this.openRecorder(), 300);
  }

  openGallery(): void {
    this.closeFileChooser();
    setTimeout(() => this.galleryInput.nativeElement.click(), 300);
  }

  openFileBrowser(): void {
    this.closeFileChooser();
    setTimeout(() => this.fileInput.nativeElement.click(), 300);
  }

  // ═════════════════════════════════════════════════════════════════
  //  File selection (from Photos or Browse) + validation
  // ═════════════════════════════════════════════════════════════════
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!this.isValidFileType(file)) {
        this.errorMessage =
          'Invalid file type. Please select JPG, PNG, JPEG, MP3, MP4, WebM, MOV, or PDF file.';
        this.resetFileInputs();
        return;
      }
      if (file.size > this.maxFileSize) {
        this.errorMessage =
          `File size exceeds 500MB limit (chosen: ${this.formatBytes(file.size)}). Please select a smaller file.`;
        this.resetFileInputs();
        return;
      }

      this.setSelectedFile(file);
    }

    // Reset input value to allow re-selection of same file
    input.value = '';
  }

  isValidFileType(file: File): boolean {
    const validTypes = [
      'image/jpg', 'image/jpeg', 'image/png',
      'audio/mp3', 'audio/mpeg',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf',
    ];
    if (validTypes.includes(file.type)) return true;
    // MediaRecorder often reports MIME as "video/webm;codecs=vp8,opus" —
    // check the "type/subtype" prefix so we accept those too.
    if (file.type.startsWith('video/webm')) return true;
    if (file.type.startsWith('video/mp4'))  return true;

    // Extension fallback for files whose MIME isn't recognized.
    const extension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = [
      'jpg', 'jpeg', 'png', 'mp3', 'mp4', 'mov', 'pdf',
      'webm', 'wmv', 'flv', 'avi', 'mpg', 'wav', 'mpeg', 'dat',
    ];
    return validExtensions.includes(extension || '');
  }

  // Assigns the file, refreshes the preview URL for video playback,
  // and clears any prior blob URL. Called from both the file picker
  // and the recorder's "Use this recording" path.
  private setSelectedFile(file: File): void {
    this.selectedFile     = file;
    this.selectedFileName = file.name;

    this.revokePreviewUrl();
    if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
      this.previewUrl = URL.createObjectURL(file);
    }
  }

  removeFile(): void {
    this.selectedFile     = null;
    this.selectedFileName = '';
    this.revokePreviewUrl();
    this.resetFileInputs();
  }

  private revokePreviewUrl(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = '';
    }
  }

  resetFileInputs(): void {
    if (this.galleryInput) this.galleryInput.nativeElement.value = '';
    if (this.fileInput)    this.fileInput.nativeElement.value    = '';
  }

  clearMessages(): void {
    this.errorMessage   = '';
    this.successMessage = '';
    this.warningMessage = '';
  }

  // ── Custom confirm helpers ──
  // Callers use this instead of window.confirm(). The Yes callback fires
  // only after the user actively picks Yes; picking Cancel closes silently.
  private askConfirm(message: string, onYes: () => void, yesLabel = 'Yes', noLabel = 'Cancel'): void {
    this.confirmMessage       = message;
    this.confirmYesLabel      = yesLabel;
    this.confirmNoLabel       = noLabel;
    this.pendingConfirmAction = onYes;
  }
  onConfirmYes(): void {
    const action = this.pendingConfirmAction;
    this.confirmMessage       = '';
    this.pendingConfirmAction = null;
    if (action) action();
  }
  onConfirmNo(): void {
    this.confirmMessage       = '';
    this.pendingConfirmAction = null;
  }

  getFileIcon(): string {
    if (!this.selectedFile) return 'fas fa-file';
    const type = this.selectedFile.type;
    if (type.startsWith('image/')) return 'fas fa-file-image';
    if (type.startsWith('video/')) return 'fas fa-file-video';
    if (type.startsWith('audio/')) return 'fas fa-file-audio';
    if (type === 'application/pdf') return 'fas fa-file-pdf';
    return 'fas fa-file';
  }

  getFileSize(): string {
    if (!this.selectedFile) return '';
    return this.formatBytes(this.selectedFile.size);
  }

  // For the video-preview element — needs a video/* file to render.
  isVideoSelected(): boolean {
    return !!this.selectedFile && this.selectedFile.type.startsWith('video/');
  }

  isFormValid(): boolean {
    return !!(this.engineSrNo && this.engineSrNo.length >= 10 && this.selectedFile);
  }

  // ═════════════════════════════════════════════════════════════════
  //  Upload (existing) — recorder file uploads through the same path.
  // ═════════════════════════════════════════════════════════════════
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
    formData.append('EngSrNo',   this.engineSrNo);
    formData.append('File',      this.selectedFile as File);
    formData.append('EmpCode',   this.currentUser);

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

  cancelUpload(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = null;
    }
    this.isUploading = false;
    this.uploadProgress = 0;
    this.warningMessage = 'Upload cancelled.';
  }

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

  resetForm(): void {
    this.engineSrNo = '';
    this.selectedFile = null;
    this.selectedFileName = '';
    this.revokePreviewUrl();
    this.resetFileInputs();
  }

  // ═════════════════════════════════════════════════════════════════
  //  In-app video recorder
  // ═════════════════════════════════════════════════════════════════

  /** Called from the sheet's Camera button. */
  async openRecorder(): Promise<void> {
    // Front-load the compatibility check so the user gets a friendly message
    // instead of a silent failure.
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      this.recorderState = 'error';
      this.recorderError = 'Video recording is not supported by this browser. Please try the latest Chrome, Edge, or Safari.';
      return;
    }
    if (!window.isSecureContext) {
      this.recorderState = 'error';
      this.recorderError = 'Camera access requires HTTPS. Please open this page over a secure connection.';
      return;
    }

    this.recorderError = '';
    this.recorderState = 'requesting';

    // Prefer the back camera on mobile; ignored on desktop. The stream MUST
    // be requested first before enumerateDevices() will surface real labels.
    const started = await this.startCameraStream();
    if (!started) return;   // startCameraStream already set the error state

    await this.refreshCameraList();
    this.recorderState = 'ready';
  }

  /** Enumerate available video-input devices. Requires an active grant. */
  private async refreshCameraList(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs  = devices.filter(d => d.kind === 'videoinput');
      this.cameras  = inputs.map((d, i) => ({
        deviceId: d.deviceId,
        // Fallback label — Windows sometimes returns empty until the second
        // enumerate call (post-permission), so we always guarantee a name.
        label: d.label?.trim() || `Camera ${i + 1}`,
      }));

      // Sync the picker with whatever device the active stream is using.
      const active = this.mediaStream?.getVideoTracks()[0];
      const activeId = active?.getSettings().deviceId ?? '';
      this.selectedCameraId = activeId || this.cameras[0]?.deviceId || '';
    } catch (err) {
      // Non-fatal — the stream is already up; the picker just won't list options.
      console.warn('[dg-video-upload] enumerateDevices failed', err);
      this.cameras = [];
    }
  }

  /**
   * Kick off (or restart) a getUserMedia stream. Returns true on success and
   * sets `recorderState = 'error'` on failure so the caller can bail out.
   *
   * If a specific deviceId is passed, that camera is preferred. Otherwise we
   * ask for the back camera via facingMode — the browser picks a sensible
   * default on desktop.
   */
  private async startCameraStream(deviceId?: string): Promise<boolean> {
    this.stopMediaStream();

    // Try the ideal constraint first; if the device doesn't have a back
    // camera we retry with a fallback so desktop / front-only phones still work.
    const constraints: MediaStreamConstraints = deviceId
      ? { video: { deviceId: { exact: deviceId } }, audio: true }
      : { video: { facingMode: { ideal: 'environment' } }, audio: true };

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: any) {
      // First attempt failed — retry with plain video:true so we still get *some* camera.
      if (!deviceId) {
        try {
          this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (err2: any) {
          this.recorderState = 'error';
          this.recorderError = this.explainCameraError(err2);
          return false;
        }
      } else {
        this.recorderState = 'error';
        this.recorderError = this.explainCameraError(err);
        return false;
      }
    }

    // Angular hasn't rendered the <video> element yet on first open; wait a
    // tick so the ViewChild is bound before we attach the stream.
    setTimeout(() => {
      if (this.livePreview?.nativeElement && this.mediaStream) {
        this.livePreview.nativeElement.srcObject = this.mediaStream;
        // Chrome/Safari require an explicit play() call after srcObject change.
        this.livePreview.nativeElement.play().catch(() => { /* autoplay guard */ });
      }
    }, 0);
    return true;
  }

  /** User picked a different camera from the dropdown mid-preview. */
  async onCameraChange(): Promise<void> {
    if (this.recorderState === 'recording' || this.recorderState === 'stopping') {
      // Guard against losing the current take mid-record.
      this.warningMessage = 'Please stop the current recording before switching cameras.';
      return;
    }
    if (!this.selectedCameraId) return;
    this.recorderState = 'requesting';
    const ok = await this.startCameraStream(this.selectedCameraId);
    if (ok) this.recorderState = 'ready';
  }

  /** Translate the raw getUserMedia error into something an operator can act on. */
  private explainCameraError(err: any): string {
    const name = err?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError')
      return 'Camera / microphone permission was denied. Please allow access in your browser settings and try again.';
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
      return 'No camera was found on this device. Please connect a camera and try again.';
    if (name === 'NotReadableError' || name === 'TrackStartError')
      return 'The camera is already in use by another app. Please close it and try again.';
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError')
      return 'The selected camera does not support the requested settings. Please pick a different camera.';
    return `Unable to open the camera (${name || 'unknown error'}). Please try again.`;
  }

  /** Start writing chunks. Uses the best MIME type the browser advertises. */
  startRecording(): void {
    if (!this.mediaStream) return;
    this.recordedChunks = [];
    this.recordedBlob   = null;
    this.recordingSize  = 0;
    this.recordingDuration = 0;
    if (this.recordedVideoUrl) { URL.revokeObjectURL(this.recordedVideoUrl); this.recordedVideoUrl = ''; }

    const mimeType = this.pickPreferredMimeType();
    this.recordedMimeType = mimeType;

    try {
      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.mediaStream, { mimeType })
        : new MediaRecorder(this.mediaStream);
    } catch (err) {
      this.recorderState = 'error';
      this.recorderError = 'This browser cannot start a recording. Please try Chrome, Edge, or Safari.';
      return;
    }

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (!e.data || e.data.size === 0) return;
      this.recordedChunks.push(e.data);
      this.recordingSize += e.data.size;

      // Hard-stop at 500 MB so we never build a blob that fails the upload.
      if (this.recordingSize >= this.maxFileSize) {
        this.warningMessage = 'Recording stopped — the 500 MB size limit was reached.';
        this.stopRecording();
      }
    };
    this.mediaRecorder.onerror = () => {
      this.recorderState = 'error';
      this.recorderError = 'The recording failed unexpectedly. Please try again.';
      this.cleanupRecorder();
    };
    this.mediaRecorder.onstop  = () => this.finalizeRecording();

    // 1-second timeslice — gives us frequent ondataavailable so the size cap
    // check fires reliably, without a tight loop.
    this.mediaRecorder.start(1000);
    this.recordingStartedAt = Date.now();
    this.recorderState = 'recording';
    this.recordingTimerId = setInterval(() => this.tick(), 250);
  }

  /** Best MediaRecorder MIME the browser supports. Order matters. */
  private pickPreferredMimeType(): string {
    const candidates = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',   // Safari
      'video/mp4',                                 // Safari (loose)
      'video/webm;codecs=vp9,opus',                // Chrome/Firefox modern
      'video/webm;codecs=vp8,opus',                // Chrome older
      'video/webm',                                // last resort
    ];
    for (const mime of candidates) {
      if (typeof MediaRecorder !== 'undefined' &&
          typeof MediaRecorder.isTypeSupported === 'function' &&
          MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return '';   // browser picks a default
  }

  /** Called every 250ms while recording — updates the elapsed timer. */
  private tick(): void {
    if (this.recorderState !== 'recording') return;
    this.recordingDuration = Math.floor((Date.now() - this.recordingStartedAt) / 1000);
  }

  stopRecording(): void {
    // Idempotent — if the user rage-clicks Stop, only the first one does
    // anything. Also short-circuits if we've already moved on to preview.
    if (this.recorderState !== 'recording') return;

    // Immediate visual feedback: hide the timer/size overlays' pulse and
    // flip the action button to a disabled "Stopping…" pill so the operator
    // knows the tap registered even before MediaRecorder finishes flushing.
    this.recorderState = 'stopping';
    if (this.recordingTimerId) {
      clearInterval(this.recordingTimerId);
      this.recordingTimerId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        // Force any buffered chunks to flush via ondataavailable before stop —
        // small optimization for browsers that hold data until stop is called.
        if (typeof this.mediaRecorder.requestData === 'function' &&
            this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.requestData();
        }
        this.mediaRecorder.stop();        // fires onstop → finalizeRecording()
      } catch {
        // If the underlying MediaRecorder throws, transition anyway so the
        // user isn't stranded on the Stopping… view forever.
        this.finalizeRecording();
        return;
      }

      // Safety net — some Android browsers occasionally delay onstop by
      // hundreds of ms or never emit it if the stream had an issue.
      // If we're still in 'stopping' after 2 s, force the transition.
      setTimeout(() => {
        if (this.recorderState === 'stopping') this.finalizeRecording();
      }, 2000);
    } else {
      this.finalizeRecording();
    }
  }

  /** Bundle chunks into a single Blob + object URL for review. */
  private finalizeRecording(): void {
    if (this.recordingTimerId) { clearInterval(this.recordingTimerId); this.recordingTimerId = null; }

    if (this.recordedChunks.length === 0) {
      // Recording started and stopped without any data — very short takes on
      // some browsers behave this way. Return to ready so the operator can retry.
      this.recorderState = 'ready';
      return;
    }

    const type = this.recordedMimeType || 'video/webm';
    this.recordedBlob = new Blob(this.recordedChunks, { type });
    this.recordedVideoUrl = URL.createObjectURL(this.recordedBlob);
    this.recorderState = 'preview';
  }

  /**
   * Preview → Retake — throw away this take and reopen the live view.
   *
   * The `<video #livePreview>` element was destroyed by *ngIf while we were
   * on the preview view, so the fresh one Angular re-creates when we go
   * back to 'ready' has no srcObject and would show a blank screen. Two
   * cases to handle:
   *   1) The mediaStream tracks are still live — just reattach.
   *   2) The tracks were killed (unusual but possible on some Android
   *      browsers after a MediaRecorder run) — request a new stream.
   */
  async retakeRecording(): Promise<void> {
    if (this.recordedVideoUrl) { URL.revokeObjectURL(this.recordedVideoUrl); this.recordedVideoUrl = ''; }
    this.recordedBlob = null;
    this.recordedChunks = [];
    this.recordingSize = 0;
    this.recordingDuration = 0;

    const isActive = !!this.mediaStream
      && this.mediaStream.getTracks().some(t => t.readyState === 'live');

    if (!isActive) {
      // Stream is dead — spin up a fresh one on the same camera the user picked.
      this.recorderState = 'requesting';
      const ok = await this.startCameraStream(this.selectedCameraId || undefined);
      if (ok) this.recorderState = 'ready';
      return;
    }

    // Stream is fine; go straight back to ready and re-attach.
    this.recorderState = 'ready';
    this.attachLiveStream();
  }

  /**
   * Bind the active mediaStream to the (possibly just-created) <video>
   * element, then start playback. setTimeout(0) waits one tick so Angular
   * finishes rendering the *ngIf'd .recorder-live block before we look up
   * the ViewChild reference.
   */
  private attachLiveStream(): void {
    setTimeout(() => {
      if (this.livePreview?.nativeElement && this.mediaStream) {
        this.livePreview.nativeElement.srcObject = this.mediaStream;
        // Some browsers pause autoplay after srcObject change without a gesture.
        this.livePreview.nativeElement.play().catch(() => { /* autoplay guard */ });
      }
    }, 0);
  }

  /** Preview → Use this recording — hand the blob off to the upload form. */
  useRecording(): void {
    if (!this.recordedBlob) return;

    const type = this.recordedBlob.type || this.recordedMimeType || 'video/webm';
    const ext  = this.extensionForMimeType(type);
    const safeEng = (this.engineSrNo || 'video').replace(/[\\/:*?"<>|]/g, '-').substring(0, 40);
    const name = `${this.uploadFor}_${safeEng || 'video'}_${this.timestampStamp()}.${ext}`;

    const file = new File([this.recordedBlob], name, { type, lastModified: Date.now() });

    // Same validation the picker path runs — belt and braces.
    if (file.size > this.maxFileSize) {
      this.warningMessage = `Recording is ${this.formatBytes(file.size)} — over the 500 MB limit.`;
      return;
    }

    this.setSelectedFile(file);
    this.closeRecorder(true);
  }

  private extensionForMimeType(mime: string): string {
    if (mime.includes('mp4'))  return 'mp4';
    if (mime.includes('webm')) return 'webm';
    if (mime.includes('ogg'))  return 'ogv';
    return 'webm';
  }

  private timestampStamp(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  /**
   * Close the recorder overlay + release the camera.
   * @param force skip the "discard current take?" confirm — used by useRecording()
   *              (we're keeping the file, no confirm needed) and by ngOnDestroy.
   */
  closeRecorder(force: boolean = false): void {
    if (!force) {
      if (this.recorderState === 'recording') {
        this.askConfirm(
          'Stop and discard the current recording?',
          () => this.cleanupRecorder(),
          'Yes, Discard',
          'Keep Recording',
        );
        return;
      } else if (this.recorderState === 'preview' && this.recordedBlob) {
        this.askConfirm(
          'Discard the recorded video without using it?',
          () => this.cleanupRecorder(),
          'Yes, Discard',
          'Keep Video',
        );
        return;
      }
    }
    this.cleanupRecorder();
  }

  /** Release every resource the recorder owns. Safe to call repeatedly. */
  private cleanupRecorder(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch { /* already stopping */ }
    }
    this.mediaRecorder = null;
    if (this.recordingTimerId) { clearInterval(this.recordingTimerId); this.recordingTimerId = null; }
    this.stopMediaStream();
    if (this.recordedVideoUrl) { URL.revokeObjectURL(this.recordedVideoUrl); this.recordedVideoUrl = ''; }
    this.recordedBlob = null;
    this.recordedChunks = [];
    this.recordingSize = 0;
    this.recordingDuration = 0;
    this.recorderState = 'closed';
    this.recorderError = '';
  }

  /** Stop all tracks so the camera light turns off. */
  private stopMediaStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.livePreview?.nativeElement) {
      this.livePreview.nativeElement.srcObject = null;
    }
  }

  /** For the recorder timer display (mm:ss). */
  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /** Progress bar within the recorder — how full the 500 MB budget is. */
  get recordingSizePct(): number {
    return Math.min(100, Math.round((this.recordingSize / this.maxFileSize) * 100));
  }

  /** For "Try again" button on the error state. */
  async retryRecorder(): Promise<void> {
    this.recorderError = '';
    await this.openRecorder();
  }
}
