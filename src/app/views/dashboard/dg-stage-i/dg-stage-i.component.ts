import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, QueryList, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { BarcodeFormat } from '@zxing/browser';
import { ChangeDetectorRef } from '@angular/core';
import { DgStageIService, LineRight } from './dg-stage-i-service.service';
import { JwtAuthService } from 'app/shared/services/auth/jwt-auth.service';

@Component({
    selector: 'app-dg-stage-i',
    templateUrl: './dg-stage-i.component.html',
    styleUrl: './dg-stage-i.component.scss',
    standalone: false
})
export class DgStageIComponent implements OnInit, OnDestroy {
  userId: string = '';
  password: string = '';
  profitcenter_act: string = '';
  profitcenter_old: string = '';

  // ── Line-wise PC selector (replaces login-derived PC for save) ─
  prmCode: string = '';
  lineRights: LineRight[] = [];

  // Per-tab line selection — Scan Start and Scan End each keep their own
  // pick, so switching tabs doesn't lose the other side's choice. Resets
  // only on a full page refresh.
  private startTabLineWisePC: string = '';
  private endTabLineWisePC: string = '';

  /** Two-way binding for the header dropdown. Reads/writes the slot
   *  belonging to whichever tab is active. */
  get selectedLineWisePC(): string {
    return this.selectedTabIndex === 1 ? this.endTabLineWisePC : this.startTabLineWisePC;
  }
  set selectedLineWisePC(value: string) {
    if (this.selectedTabIndex === 1) this.endTabLineWisePC = value;
    else this.startTabLineWisePC = value;
  }

  selectedOption: string = '';
  selectedSixMItem: string | null = null;
  apiResponse: any;
  scannedQrResult: any;
  errorMessage: string = '';
  extractedJobcard: string = '';
  extractedEngSerial: string = '';
  successMessage: string = '';
  selectedTabIndex: number = 0;
  sixMOptions: any[] = []; // Stores select6M API response for dropdown
  processCheckpoints: any[] = []; // for assign process checkpoint to you dynamically
  isDropdownOpen = false;
  selectedItem: string = 'Select an option';
  recordedAudioFile: File | null = null;
  recordedVideoFile: File | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private dgAssemblyService: DgStageIService,
    private authService: JwtAuthService
  ) {}

  ngOnInit(): void {
    this.fetchSixMData();
    const pccode_Act = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    const pccode_Old = localStorage.getItem('ProfitCenter_old')?.trim() ?? '';
    if (pccode_Act) {
      this.profitcenter_act = pccode_Act;
      this.profitcenter_old = pccode_Old;
    }
    this.prmCode = localStorage.getItem('positionRoleId')?.trim() ?? '';
    this.loadLineRights();
    this.installZxingConsoleFilter();
    this.installDeviceChangeListener();
  }

  /** The line right object behind the current dropdown selection. */
  get selectedLineRight(): LineRight | undefined {
    return this.lineRights.find(l => l.LineWisePC === this.selectedLineWisePC);
  }

  /**
   * Tab switch (Scan Start <-> Scan End). Each tab maintains its own line
   * pick — switching to the other tab reveals that tab's previous selection
   * (or empty if never picked there). Selections only reset on a page reload.
   */
  onTabChange(idx: number): void {
    this.selectedTabIndex = idx;
  }

  // ── Fetch the lines this position is entitled to post against ──
  private loadLineRights(): void {
    if (!this.prmCode) {
      console.warn('[DgStageI] no positionRoleId in localStorage — skipping line rights fetch');
      this.lineRights = [];
      return;
    }
    this.dgAssemblyService.getLineRights(this.prmCode).subscribe({
      next: (rows) => {
        this.lineRights = Array.isArray(rows) ? rows : [];
        console.log('[DgStageI] line rights for', this.prmCode, '=>', this.lineRights);
        // Single-line position: auto-fill both tab slots with the only option
        // (only happens on initial load — switching tabs preserves per-tab picks).
        if (this.lineRights.length === 1) {
          const only = this.lineRights[0].LineWisePC;
          this.startTabLineWisePC = only;
          this.endTabLineWisePC   = only;
        }
      },
      error: (err) => {
        console.error('[DgStageI] line rights error', err);
        this.lineRights = [];
      },
    });
  }

  ngOnDestroy(): void {
    if (this.originalConsoleError) console.error = this.originalConsoleError;
    if (this.originalConsoleWarn) console.warn = this.originalConsoleWarn;
    if (this.deviceChangeHandler && navigator.mediaDevices?.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
    }
  }

  // Hot-swap support across desktop AND mobile: when camera hardware or
  // permission state changes (USB webcam plugged/unplugged, RUGTEK swapped
  // in/out, mobile OS revokes camera, external USB-C camera attached to a
  // phone), the browser fires 'devicechange' on navigator.mediaDevices. We
  // remount whichever scanner section is currently open so zxing
  // re-enumerates against the new device list — no page reload required.
  private deviceChangeHandler?: () => void;

  private installDeviceChangeListener(): void {
    if (!navigator.mediaDevices?.addEventListener) return;
    this.deviceChangeHandler = () => {
      console.log('[zxing-diag] devicechange - re-detecting cameras');
      this.cameraStatus = 'init';
      this.remountActiveScanner();
    };
    navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
  }

  private remountActiveScanner(): void {
    const wasOpen = {
      engStart: this.showQrScannerEngineStart,
      altStart: this.showQrScannerAlternatorStart,
      engEnd: this.showQrScannerEngineEnd,
      altEnd: this.showQrScannerAlternatorEnd,
    };
    if (!wasOpen.engStart && !wasOpen.altStart && !wasOpen.engEnd && !wasOpen.altEnd) {
      // nothing open; the next SCAN click will mount a fresh scanner anyway
      this.cdr.detectChanges();
      return;
    }
    this.showQrScannerEngineStart = false;
    this.showQrScannerAlternatorStart = false;
    this.showQrScannerEngineEnd = false;
    this.showQrScannerAlternatorEnd = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showQrScannerEngineStart = wasOpen.engStart;
      this.showQrScannerAlternatorStart = wasOpen.altStart;
      this.showQrScannerEngineEnd = wasOpen.engEnd;
      this.showQrScannerAlternatorEnd = wasOpen.altEnd;
      this.cdr.detectChanges();
      this.focusActiveHidInput();
    }, 150);
  }

  // <zxing-scanner> internally calls console.error / console.warn from
  // handlePermissionException when no camera is available. Those calls bypass
  // the (scanError) output, so the only way to keep DevTools clean on a
  // RUGTEK-only machine is to filter them at the console level. The filter is
  // surgical (matches the exact zxing prefix + message) and is uninstalled on
  // component destroy so nothing else in the app is affected.
  private installZxingConsoleFilter(): void {
    // zxing-ngx-scanner logs its permission errors as multiple console.error
    // arguments, e.g.:
    //   console.error('@zxing/ngx-scanner', 'Error when asking for permission.', err)
    // so we must scan EVERY argument, not just the first.
    const isZxingPermissionNoise = (args: unknown[]): boolean => {
      const joined = args
        .map((a) => {
          if (typeof a === 'string') return a;
          if (a instanceof Error) return `${a.name} ${a.message}`;
          try {
            return String(a);
          } catch {
            return '';
          }
        })
        .join(' ');
      if (!joined.includes('@zxing/ngx-scanner')) return false;
      return (
        joined.includes('Error when asking for permission') ||
        joined.includes('Requested device not found') ||
        joined.includes('NotFoundError')
      );
    };

    this.originalConsoleError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      if (isZxingPermissionNoise(args)) return;
      this.originalConsoleError!.apply(console, args as unknown[] as []);
    };

    this.originalConsoleWarn = console.warn.bind(console);
    console.warn = (...args: unknown[]) => {
      if (isZxingPermissionNoise(args)) return;
      this.originalConsoleWarn!.apply(console, args as unknown[] as []);
    };
  }

  // Existing QR Scanner Details
  //for Scan Start Section
  scanDetails: {
    qrSrNo: string;
    engDesc: string;
    engCode: string;
    stk: string;
  } = {
    qrSrNo: '',
    engDesc: '',
    engCode: '',
    stk: '',
  };
  //For Scan End Section
  scanDetails1: {
    qrSrNo: string;
    altDesc: string;
    altPart: string;
    stk: string;
    trStatus: string;
  } = {
    qrSrNo: '',
    altDesc: '',
    altPart: '',
    stk: '',
    trStatus: '',
  };

  //for Scan End Section
  scanDetails2: { qrSrNo: string; engDesc: string; engCode: string } = {
    qrSrNo: '',
    engDesc: '',
    engCode: '',
    // stk: ''
  };
  //For Scan End Section
  scanDetails3: {
    qrSrNo: string;
    altDesc: string;
    altPart: string;
    trStatus: string;
  } = {
    qrSrNo: '',
    altDesc: '',
    altPart: '',
    // stk: '',
    trStatus: '',
  };

  isSecondDropdownOpen: boolean = false;
  dropdownOptions: string[] = ['Rework', 'Accepted(OK)'];

  showQrScannerEngineStart: boolean = false;
  showQrScannerAlternatorStart: boolean = false;

  showQrScannerEngineEnd: boolean = false;
  showQrScannerAlternatorEnd: boolean = false;

  allowedFormats = [BarcodeFormat.QR_CODE];
  scannerType: 'engine' | 'alternator' | null = null;

  // RUGTEK HID barcode/QR scanner support.
  // RUGTEK acts as a USB keyboard: it types the decoded value then sends Enter.
  // A hidden auto-focused input next to each <zxing-scanner> captures that
  // keystream and routes it through the same handlers the camera already uses,
  // so both input methods work side-by-side without touching the camera path.
  @ViewChildren('hidScannerInput') hidScannerInputs!: QueryList<ElementRef<HTMLInputElement>>;

  // Saved references so the console filter installed in ngOnInit can be
  // restored when the component is destroyed.
  private originalConsoleError?: typeof console.error;
  private originalConsoleWarn?: typeof console.warn;

  // Audio Recording Variables
  isRecording = false;
  isAudioClipVisible = false;
  private mediaRecorder!: MediaRecorder;
  private audioChunks: Blob[] = [];
  audioBlob: Blob | null = null;
  audioUrl: string | null = null;
  showAudioPlayer: boolean = false;
  stream!: MediaStream;

  // Video Recording Variables
  isVideoRecording = false;
  isVideoClipVisible = false;
  private videoRecorder!: MediaRecorder;
  private videoChunks: Blob[] = [];
  videoBlob: Blob | null = null;
  videoUrl: string | null = null;

  planNo: string = '';
  date: string = '';
  dgPartCodeDesc: string = '';
  jobCardPriority: string = '';
  Dgstk: string = '';
  oldEngStk: string = '';
  oldAltStk: string = '';

  planNo_stageEnd: string = '';
  date_stageEnd: string = '';
  dgPartCodeDesc_stageEnd: string = '';
  jobCardPriority_stageEnd: string = '';
  Dgstk_stageEnd: string = '';

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    this.isSecondDropdownOpen = false;
    this.cdr.detectChanges();
  }

  toggleSecondDropdown() {
    this.isSecondDropdownOpen = !this.isSecondDropdownOpen;
    this.isDropdownOpen = false;
    this.cdr.detectChanges();
  }

  selectItem(item: any) {
    this.selectedItem = item.Name; // Display Name in the dropdown
    this.selectedSixMItem = item.Id; // Store selected ID
    this.isDropdownOpen = false;
    console.log('Selected SixMItem ID:', this.selectedSixMItem);
    this.cdr.detectChanges();
  }

  get stkAsNumber(): number {
    return parseInt(this.scanDetails.stk, 10);
  }

  // QR Code Scanning Methods for Stage(I) Scan Start Tab
  onScanEngineClick() {
    this.showQrScannerEngineStart = !this.showQrScannerEngineStart;
    if (this.showQrScannerEngineStart) {
      this.showQrScannerAlternatorStart = false;
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanAlternatorClick() {
    this.showQrScannerAlternatorStart = !this.showQrScannerAlternatorStart;
    if (this.showQrScannerAlternatorStart) {
      this.showQrScannerEngineStart = false;
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  // QR Code Scanning Methods for Stage(I) Scan End Tab
  onScanEngineClick1() {
    this.showQrScannerEngineEnd = !this.showQrScannerEngineEnd;
    if (this.showQrScannerEngineEnd) {
      this.showQrScannerAlternatorEnd = false;
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanAlternatorClick1() {
    this.showQrScannerAlternatorEnd = !this.showQrScannerAlternatorEnd;
    if (this.showQrScannerAlternatorEnd) {
      this.showQrScannerEngineEnd = false;
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  // Move keyboard focus to whichever hidden scanner input is currently in the DOM.
  // Why a setTimeout: the *ngIf inserts the input asynchronously after change detection.
  private focusActiveHidInput(): void {
    setTimeout(() => {
      const visible = this.hidScannerInputs?.find(
        (ref) => ref.nativeElement.offsetParent !== null
      );
      visible?.nativeElement.focus();
    }, 50);
  }

  // Triggered when RUGTEK (or any HID scanner) presses Enter after typing the
  // code while focus happens to be on the hidden input.
  onHidScan(
    input: HTMLInputElement,
    section: 'engine' | 'alternator',
    mode: 'start' | 'end'
  ): void {
    const value = (input.value || '').trim();
    input.value = '';
    console.log('[RUGTEK] hidden-input scan:', value, section, mode);
    if (!value) return;
    if (mode === 'start') {
      this.handleQrCodeResult(value, section);
    } else {
      this.handleQrCodeResult1(value, section);
    }
  }

  // Document-level keystroke buffer for the RUGTEK HID scanner.
  // The hidden input above only catches keys when focus actually lands on it,
  // which is fragile on Windows (the SCAN button may keep focus, modals may
  // steal it, etc.). This listener is focus-independent: while any scan
  // section is open, it accumulates rapid keystrokes and dispatches on Enter
  // or after a short idle gap, then routes the value to the same handlers
  // the camera path uses.
  private hidBuffer = '';
  private hidLastKeyAt = 0;
  private readonly HID_MAX_GAP_MS = 80; // RUGTEK types ~5-10ms/char; humans ~150ms+
  private readonly HID_MIN_LENGTH = 3;

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isAnyScannerOpen()) return;

    // Skip the dedicated hidden input — it has its own (keydown.enter) binding,
    // we must not double-process the same scan.
    const target = event.target as HTMLElement | null;
    if (target && (target as HTMLElement).classList?.contains('hid-scanner-input')) {
      return;
    }

    // Ignore typing inside other editable fields on the page (search bars etc.).
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as HTMLElement).isContentEditable)
    ) {
      return;
    }

    const now = Date.now();
    const gap = now - this.hidLastKeyAt;
    this.hidLastKeyAt = now;

    if (event.key === 'Enter') {
      const value = this.hidBuffer.trim();
      this.hidBuffer = '';
      console.log('[RUGTEK] document scan:', value);
      if (value.length >= this.HID_MIN_LENGTH) {
        this.dispatchHidScan(value);
        event.preventDefault();
      }
      return;
    }

    if (event.key.length === 1) {
      // Reset buffer if gap is too long (so a stray earlier keypress doesn't
      // contaminate a real scan that follows).
      if (gap > this.HID_MAX_GAP_MS) this.hidBuffer = '';
      this.hidBuffer += event.key;
    }
  }

  private isAnyScannerOpen(): boolean {
    return (
      this.showQrScannerEngineStart ||
      this.showQrScannerAlternatorStart ||
      this.showQrScannerEngineEnd ||
      this.showQrScannerAlternatorEnd
    );
  }

  private dispatchHidScan(value: string): void {
    if (this.showQrScannerEngineStart) {
      this.handleQrCodeResult(value, 'engine');
    } else if (this.showQrScannerAlternatorStart) {
      this.handleQrCodeResult(value, 'alternator');
    } else if (this.showQrScannerEngineEnd) {
      this.handleQrCodeResult1(value, 'engine');
    } else if (this.showQrScannerAlternatorEnd) {
      this.handleQrCodeResult1(value, 'alternator');
    }
  }

  // Silently swallow camera errors (e.g. NotFoundError on PCs without a webcam).
  // The HID scanner path continues to work via the document keydown listener.
  onScannerError(_err: unknown): void {}

  // Diagnostic listeners for the camera path. They log via console.log which
  // is NOT covered by our console.error/warn filter, so they remain visible
  // and help reveal why the scanner viewport stays blank (permission denial,
  // zero devices, etc.).
  // 'init'   - scanner just mounted, zxing hasn't reported yet
  // 'available'   - zxing found at least one camera
  // 'unavailable' - zxing found zero cameras (no hardware, permission blocked,
  //                 non-secure context, or device in use by another app)
  cameraStatus: 'init' | 'available' | 'unavailable' = 'init';

  onScannerPermission(granted: boolean): void {
    console.log('[zxing-diag] permission granted:', granted);
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    console.log('[zxing-diag] cameras found:', devices?.length ?? 0, devices);
    this.cameraStatus = (devices?.length ?? 0) > 0 ? 'available' : 'unavailable';
    this.cdr.detectChanges();
  }

  onCamerasNotFound(): void {
    console.log('[zxing-diag] no cameras found by zxing');
    this.cameraStatus = 'unavailable';
    this.cdr.detectChanges();
  }

  //for Scan Start Tab
  handleQrCodeResult(result: string, section: string) {
    if (section == 'engine') {
      const payload = {
        SerialNo: result, // Scanned result
        PartCode: '001',
        Category: '001',
        Stage: '0',
        //PCCode: '01.004',
         PCCode_Old: this.selectedLineRight?.ParentDgPC ?? '',
         PCCode_Act: this.selectedLineRight?.LineWisePC ?? '',
      };
      // Make the API call with the payload
      this.dgAssemblyService.getAssemblyDetails(payload).subscribe(
        (response) => {
          console.log('API Response:', response);
          const data = response.MakerCheckerResult || response;
          const oldData = response.OldResult || response;

          // Assigning the response values to scanDetails from MakerCheckerResult
          this.scanDetails = {
            qrSrNo: result,
            engDesc: data.EngPartDesc,
            engCode: data.EngPartCode,
            stk: data.EngStk,
          };

          const altDetails = data.AltDts.split('-->');
          this.scanDetails1 = {
            qrSrNo: altDetails[0],
            altPart: altDetails[1],
            altDesc: altDetails[2],
            trStatus: altDetails[3],
            stk: altDetails[4],
          };

          // Old stk values from OldResult
          this.oldEngStk = oldData.EngStk || '';
          const oldAltDetails = oldData.AltDts ? oldData.AltDts.split('-->') : [];
          this.oldAltStk = oldAltDetails[4] || '';

          this.planNo = data.JobCode || '';
          this.date = data.JobDt || '';
          this.dgPartCodeDesc =
            `${data.DgProductCode} & ${data.DgProductDesc}` || '';
          this.jobCardPriority = data.JPriority || '';
          this.showQrScannerEngineStart = false;
        },
        (error) => {
          console.error('Error in API call', error);
          // Handle error if necessary
        }
      );
    } else if (section == 'alternator') {
      this.scannedQrResult = '';
      this.scannedQrResult = result;
      this.showQrScannerAlternatorStart = false;

      if (this.scannedQrResult !== this.scanDetails1.qrSrNo) {
        alert('Alternator Serial code does not match! Please check.');
      }
    }
  }

  //For Scan End tab
  handleQrCodeResult1(result: string, section: string) {
    if (section == 'engine') {
      const payload = {
        SerialNo: result, // Scanned result
        PartCode: '001',
        Category: '001',
        Stage: '1',
        //PCCode: "01.004"
        PCCode_Old: this.selectedLineRight?.ParentDgPC ?? '',
        PCCode_Act: this.selectedLineRight?.LineWisePC ?? '',
        // this.userId === '0211'
        //   ? '01.004'
        //   : this.userId === '2236'
        //   ? '03.051'
        //   : this.userId === '110422'
        //   ? '28.001'
        //   : '',
      };
      this.scannedQrResult = '';
      this.dgAssemblyService.getAssemblyDetails(payload).subscribe(
        (response) => {
          console.log('API Response (Scan End):', response);
          const data = response.MakerCheckerResult || response;

          // Assigning the response values to scanDetails from MakerCheckerResult
          this.scanDetails2 = {
            qrSrNo: result,
            engDesc: data.EngPartDesc,
            engCode: data.EngPartCode,
            // stk: data.DGS1Stk
          };

          const altDetails = data.AltDts.split('-->');
          this.scanDetails3 = {
            qrSrNo: altDetails[0],
            altPart: altDetails[1],
            altDesc: altDetails[2],
            trStatus: altDetails[3],
            // stk: altDetails[4]
          };

          this.planNo_stageEnd = data.JobCode || '';
          this.date_stageEnd = data.JobDt || '';
          this.dgPartCodeDesc_stageEnd =
            `${data.DgProductCode} & ${data.DgProductDesc}` || '';
          this.jobCardPriority_stageEnd = data.JPriority || '';
          this.Dgstk_stageEnd = data.DGS1Stk;

          this.showQrScannerEngineEnd = false;
        },
        (error) => {
          console.error('Error in API call', error);
          // Handle error if necessary
        }
      );
    } else if (section == 'alternator') {
      this.scannedQrResult = '';
      this.scannedQrResult = result;
      this.showQrScannerAlternatorEnd = false;
      if (this.scannedQrResult !== this.scanDetails3.qrSrNo) {
        alert('Alternator Serial code does not match! Please check.');
      }
    }
  }

  // Audio Recording Methods
  onAudioClipClick() {
    this.isAudioClipVisible = true;
  }

  // Video Recording Methods
  onVideoClipClick() {
    this.isVideoClipVisible = true;
  }

  startRecording() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.start();
        this.isRecording = true;

        const audioChunks: Blob[] = [];
        this.mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
          this.audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
          this.audioUrl = URL.createObjectURL(this.audioBlob);
          this.recordedAudioFile = new File([this.audioBlob], 'recording.mp3', {
            type: 'audio/mp3',
          });
          this.cdr.detectChanges();
        };
      });
    }
  }

  stopRecording() {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      // Immediately set the flag to show the player (even if onstop is delayed)
      this.stream?.getTracks().forEach((track) => track.stop());
      // Trigger UI updates explicitly
      this.cdr.detectChanges();
    }
  }

  startVideoRecording() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          this.videoRecorder = new MediaRecorder(stream);
          this.videoRecorder.start();
          this.isVideoRecording = true;

          const videoChunks: Blob[] = [];
          this.videoRecorder.ondataavailable = (event) => {
            videoChunks.push(event.data);
          };

          this.videoRecorder.onstop = () => {
            this.videoBlob = new Blob(videoChunks, { type: 'video/mp4' });
            this.videoUrl = URL.createObjectURL(this.videoBlob);
            this.recordedVideoFile = new File(
              [this.videoBlob],
              'recording.mp4',
              { type: 'video/mp4' }
            );
            this.cdr.detectChanges();
          };
        });
    }
  }

  stopVideoRecording() {
    if (this.videoRecorder) {
      this.videoRecorder.stop();
      this.isVideoRecording = false;
      // Immediately set the flag to show the player (even if onstop is delayed)
      this.stream?.getTracks().forEach((track) => track.stop());
      // Trigger UI updates explicitly
      this.cdr.detectChanges();
    }
  }

  downloadRecording() {
    if (this.audioBlob) {
      const link = document.createElement('a');
      link.href = this.audioUrl!;
      link.download = 'recording.mp3';
      link.click();
    }
  }

  downloadVideoRecording() {
    if (this.videoBlob) {
      const link = document.createElement('a');
      link.href = this.videoUrl!;
      link.download = 'recording.mp4';
      link.click();
    }
  }

  toggleSelection(selectedPoint: any) {
    // Toggle the selected state of the clicked point
    console.log('toggleSelection called');
    console.log(`Selected Point: ${selectedPoint.title}`);
    selectedPoint.isSelected = !selectedPoint.isSelected;
  }

  onRemarkChange(event: Event, point: any) {
    const target = event.target as HTMLElement; // Type assertion
    point.remark = target.innerText; // Update the remark with innerText
  }

  submitData() {
    if (this.selectedTabIndex === 0) {
      this.submitStartStage();
    } else if (this.selectedTabIndex === 1) {
      this.submitEndStage();
    }
  }

  showError(message: string) {
    this.errorMessage = message;
  }
  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.extractedJobcard = '';
    this.extractedEngSerial = '';
  }

  isSaveDisabled(): boolean {
    if (this.selectedTabIndex === 0) {
      // Stage I Scan Start validation
      const engStkMismatch = this.oldEngStk && this.scanDetails.stk != this.oldEngStk;
      const altStkMismatch = this.oldAltStk && this.scanDetails1.stk != this.oldAltStk;
      return (
        this.stkAsNumber === 0 ||
        !this.scanDetails?.qrSrNo ||
        !this.scanDetails1?.qrSrNo ||
        !this.isEngineScannedSuccessfully() ||
        !this.isAlternatorScannedSuccessfully() ||
        !!engStkMismatch ||
        !!altStkMismatch
      );
    } else if (this.selectedTabIndex === 1) {
      // Stage I Scan End validation
      return (
        !this.scanDetails2?.qrSrNo ||
        !this.scanDetails3?.qrSrNo ||
        !this.isEngineScannedSuccessfullyEnd() ||
        !this.isAlternatorScannedSuccessfullyEnd()
      );
    }
    return true;
  }

  // Helper methods to check if scans are successful (green)
  isEngineScannedSuccessfully(): boolean {
    // Engine turns green when qrSrNo exists (based on your ngClass logic)
    return !!this.scanDetails?.qrSrNo;
  }

  isAlternatorScannedSuccessfully(): boolean {
    // Alternator turns green when scannedQrResult matches qrSrNo
    return (
      !!this.scanDetails1?.qrSrNo &&
      this.scannedQrResult === this.scanDetails1.qrSrNo
    );
  }

  isEngineScannedSuccessfullyEnd(): boolean {
    // Engine turns green when qrSrNo exists (based on your ngClass logic)
    return !!this.scanDetails2?.qrSrNo;
  }

  isAlternatorScannedSuccessfullyEnd(): boolean {
    // Alternator turns green when scannedQrResult matches qrSrNo
    return (
      !!this.scanDetails3?.qrSrNo &&
      this.scannedQrResult === this.scanDetails3.qrSrNo
    );
  }

  submitStartStage() {
    const dgProductCode = this.dgPartCodeDesc
      ? this.dgPartCodeDesc.split(' & ')[0]
      : '';
    // Get start play value
    const engStartPlayValue = (
      document.getElementById('startEngPlayInput') as HTMLElement
    ).innerText.trim();

    const formData = new FormData();

    formData.append('JBCode', this.planNo); // Assign Plan No value
    formData.append('EngSrNo', this.scanDetails.qrSrNo); // Engine Serial Number
    formData.append('AltSrno', this.scanDetails1.qrSrNo); // Alternator Serial Number
    formData.append('StageNo', '0'); // Convert number to string
    formData.append('ProductCode', dgProductCode);
    formData.append('PCCode_Act', this.selectedLineRight?.LineWisePC ?? '');//Line-wise PC
    formData.append('PCCode_Old', this.selectedLineRight?.ParentDgPC ?? '');//Parent DG PC
    // if (this.userId == '0211') {
    //   formData.append('PCCode', '01.004');
    // } else if (this.userId == '2236') {
    //   formData.append('PCCode', '03.051');
    // } else {
    //   formData.append('PCCode', '28.001');
    // }
    formData.append('EngPlay', engStartPlayValue);
    formData.append('EngPartCode', this.scanDetails.engCode);
    formData.append('AltPartcode', this.scanDetails1.altPart);

    this.dgAssemblyService.submitAssemblyData(formData).subscribe(
      (response: any) => {
        console.log('API Success Response:', response);
        this.successMessage =
          response.Message || 'Stage I Started Successfully..!';
      },
      (error: any) => {
        console.error('API Error Response:', error);
        this.showError(this.extractApiErrorMessage(error));
      }
    );
  }

  submitEndStage() {
    const dgProductCode = this.dgPartCodeDesc_stageEnd
      ? this.dgPartCodeDesc_stageEnd.split(' & ')[0]
      : '';
    const endEnginePlayInput = (
      document.getElementById('endEnginePlayInput') as HTMLElement
    ).innerText.trim();
    const fetchedCheckPoints = this.fetchCheckPointDataFromUI();

    const formData = new FormData();
    formData.append('JBCode', this.planNo_stageEnd);
    formData.append('EngSrNo', this.scanDetails2.qrSrNo);
    formData.append('AltSrno', this.scanDetails3.qrSrNo);
    formData.append('StageNo', '1');
    formData.append('ProductCode', dgProductCode);
    formData.append('PCCode_Act', this.selectedLineRight?.LineWisePC ?? '');//Line-wise PC
    formData.append('PCCode_Old', this.selectedLineRight?.ParentDgPC ?? '');//Parent DG PC
    // if (this.userId == '0211') {
    //   formData.append('PCCode', '01.004');
    // } else if (this.userId == '2236') {
    //   formData.append('PCCode', '03.051');
    // } else {
    //   formData.append('PCCode', '28.001');
    // }
    formData.append('EngPlay', endEnginePlayInput);
    formData.append('EngPartCode', this.scanDetails2.engCode);
    formData.append('AltPartcode', this.scanDetails3.altPart);

    if (this.selectedSixMItem) {
      formData.append('QA6M', this.selectedSixMItem);
    }
    if (this.selectedOption) {
      formData.append('PrcStatus', this.selectedOption);
    }
    // ✅ Attach Checkpoints as JSON (if available)
    if (fetchedCheckPoints.length > 0) {
      formData.append('PrcChkDtsJson', JSON.stringify(fetchedCheckPoints));
    }

    // ✅ Attach Recorded Audio & Video Files (if available)
    if (this.recordedAudioFile) {
      formData.append('RecordedAudioFile', this.recordedAudioFile);
    }
    if (this.recordedVideoFile) {
      formData.append('RecordedVideoFile', this.recordedVideoFile);
    }
    this.dgAssemblyService.submitAssemblyData(formData).subscribe(
      (response: any) => {
        console.log('API Success Response:', response);
        this.successMessage = 'Stage I Completed Successfully..!';
      },
      (error: any) => {
        console.error('API Error Response:', error);
        this.showError(this.extractApiErrorMessage(error));
      }
    );
  }

  /**
   * Pull the most useful human-readable message from an HttpErrorResponse.
   * Handles all three shapes the API returns:
   *   - BadRequest with a plain string body  →  err.error is a string
   *   - error object  →  err.error.Message / err.error.message / err.error.title
   *   - network/CORS failure  →  err.message
   */
  private extractApiErrorMessage(err: any): string {
    if (!err) return 'Failed to submit data. Please try again.';
    const e = err.error;
    if (typeof e === 'string' && e.trim()) return e.trim();
    if (e && typeof e === 'object') {
      const fromObj = e.Message || e.message || e.title || e.detail;
      if (typeof fromObj === 'string' && fromObj.trim()) return fromObj.trim();
    }
    if (typeof err.message === 'string' && err.message.trim()) return err.message.trim();
    return 'Failed to submit data. Please try again.';
  }

  fetchSixMData(): void {
    this.dgAssemblyService.fetchSelect6MData().subscribe({
      next: (response) => {
        console.log('Select6M API Response:', response);
        this.sixMOptions = response.data || response; // Assuming API returns { data: [...] }
        //this.cdr.detectChanges();
      },
      error: (error) => console.error('Error fetching 6M data:', error),
    });
  }

  selectOption(option: string) {
    this.selectedOption = option;
    this.isSecondDropdownOpen = false;
    this.fetchProcessCheckpointsAndAssignToCard(); // Maintain functionality
  }

  fetchProcessCheckpointsAndAssignToCard() {
    if (!this.selectedOption) return; // Prevent API call if no selection

    const stageName = 'DG Stage1'; // Static stage name
    const statusName = this.selectedOption;

    // API Call
    this.dgAssemblyService
      .getProcessCheckPoints(stageName, statusName)
      .subscribe(
        (response) => {
          if (response && response.length > 0) {
            this.processCheckpoints = response; // Store API response
          } else {
            this.processCheckpoints = []; // Handle empty response
          }
        },
        (error) => {
          console.error('Error fetching data:', error);
        }
      );
  }

  //fetch checkpoint id and concern remark
  fetchCheckPointDataFromUI() {
    const cardElements = document.querySelectorAll('.card');

    let cardData: { PrcId: number; Remark: string }[] = [];

    cardElements.forEach((card) => {
      const prcId = card.getAttribute('data-prcid'); // Fetch PrcId from the card
      const remarkElement = card.querySelector('.remark'); // Fetch the remark element
      const remark = remarkElement
        ? remarkElement.textContent?.trim() || ''
        : '';

      if (prcId) {
        cardData.push({ PrcId: Number(prcId), Remark: remark });
      }
    });

    console.log(cardData); // Check the collected data in console
    return cardData;
  }
}
