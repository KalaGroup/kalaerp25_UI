import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, QueryList, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { BarcodeFormat } from '@zxing/browser';
import { ChangeDetectorRef } from '@angular/core';
import { DgTestReportService, LineRight } from './dg-test-report-service.service';
import { Inject } from '@angular/core';
import { th } from 'date-fns/locale';
import { JwtAuthService } from 'app/shared/services/auth/jwt-auth.service';

@Component({
    selector: 'app-dg-test-report',
    templateUrl: './dg-test-report.component.html',
    styleUrl: './dg-test-report.component.scss',
    standalone: false
})
export class DgTestReport implements OnInit, OnDestroy, AfterViewInit {
  userId: string = '';
  profitcenter_old: string = '';
  profitcenter_act: string = '';

  // ── Line-wise PC selector (replaces login-derived PC for save) ─
  prmCode: string = '';
  lineRights: LineRight[] = [];
  selectedLineWisePC: string = '';

  selectedTab: string = 'TRStart';
  stage: string = '';
  selectedOption: string = '';
  scannedQrResult: any;
  // Per-tab scan results. Was a single string previously — that caused a
  // scan in TRStart to "leak" the matched state into DGStart / DGEnd / TREnd
  // because the underlying engine/alternator serial is identical across all
  // four tabs of the same DG, so the stale value always matched whatever the
  // DG-scan API populated next. Keying by tab name keeps each tab's
  // red/green state independent and forces a real scan in each tab.
  scannedEngineQrResult: Record<string, string> = {
    TRStart: '', DGStart: '', DGEnd: '', TREnd: ''
  };
  scannedAlternatorQrResult: Record<string, string> = {
    TRStart: '', DGStart: '', DGEnd: '', TREnd: ''
  };
  scannedDieselQrResult: string = '';
  showQrScanner: { [key: string]: boolean } = {};
  errorMessage: string = '';
  extractedJobcard: string = '';
  extractedEngSerial: string = '';
  successMessage: string = '';
  warningMessage: string = '';
  panelType: string = '';
  splitPanelType: string = '';
  trCode: string = '';
  pFbCode: string = '';
  dgSerialNo: string = '';
  dieselQty: string = '';
  dieselRate: string = '';
  qaStatus: string = '';
  showQrScannerDGScan = false;
  dgPartcode: string = '';
  dieselQtyByUser: string = '';
  //For Scan TRStart
  showQrScannerEngineTRStart: boolean = false;
  showQrScannerAlternatorTRStart: boolean = false;
  showQrScannerDieselTRStart: boolean = false;
  //for Scan DGStart
  showQrScannerEngineDGStart: boolean = false;
  showQrScannerAlternatorDGStart: boolean = false;
  showQrScannerDieselDGStart: boolean = false;
  //for scan DGEnd
  showQrScannerEngineDGEnd: boolean = false;
  showQrScannerAlternatorDGEnd: boolean = false;
  showQrScannerDieselDGEnd: boolean = false;
  //for Scan TREnd
  showQrScannerEngineTREnd: boolean = false;
  showQrScannerAlternatorTREnd: boolean = false;
  showQrScannerDieselTREnd: boolean = false;

  allowedFormats = [BarcodeFormat.QR_CODE];
  scannerType: 'dgscan' | 'engine' | 'alternator' | 'diesel' | 'ewppdf' | null =
    null;

  // RUGTEK HID barcode/QR scanner support.
  // RUGTEK acts as a USB keyboard: it types the decoded value then sends Enter.
  // A hidden auto-focused input next to each <zxing-scanner> captures that
  // keystream and routes it through the same handler the camera already uses,
  // so both input methods work side-by-side without touching the camera path.
  @ViewChildren('hidScannerInput') hidScannerInputs!: QueryList<ElementRef<HTMLInputElement>>;

  // 'init'   - scanner just mounted, zxing hasn't reported yet
  // 'available'   - zxing found at least one camera
  // 'unavailable' - zxing found zero cameras (no hardware, permission blocked,
  //                 non-secure context, or device in use by another app)
  cameraStatus: 'init' | 'available' | 'unavailable' = 'init';

  // Saved references so the console filter installed in ngOnInit can be
  // restored when the component is destroyed.
  private originalConsoleError?: typeof console.error;
  private originalConsoleWarn?: typeof console.warn;
  private deviceChangeHandler?: () => void;

  // Document-level HID keystroke buffer (see onDocumentKeydown).
  private hidBuffer = '';
  private hidLastKeyAt = 0;
  private readonly HID_MAX_GAP_MS = 80;
  private readonly HID_MIN_LENGTH = 3;

  // All scanner-flag names + their handleQrCodeResult `type` argument.
  // EWAPPDF flags aren't declared as class fields — they're only accessed
  // dynamically — but the names follow the same convention.
  private readonly scannerFlags: string[] = [
    'showQrScannerDGScan',
    'showQrScannerEngineTRStart', 'showQrScannerEngineDGStart',
    'showQrScannerEngineDGEnd', 'showQrScannerEngineTREnd',
    'showQrScannerAlternatorTRStart', 'showQrScannerAlternatorDGStart',
    'showQrScannerAlternatorDGEnd', 'showQrScannerAlternatorTREnd',
    'showQrScannerDieselTRStart', 'showQrScannerDieselDGStart',
    'showQrScannerDieselDGEnd', 'showQrScannerDieselTREnd',
    'showQrScannerEWAPPDFTRStart', 'showQrScannerEWAPPDFDGStart',
    'showQrScannerEWAPPDFDGEnd', 'showQrScannerEWAPPDFTREnd',
  ];

  private readonly scannerFlagRoute: { [flag: string]: string } = {
    showQrScannerDGScan: 'dgscan',
    showQrScannerEngineTRStart: 'engine',
    showQrScannerEngineDGStart: 'engine',
    showQrScannerEngineDGEnd: 'engine',
    showQrScannerEngineTREnd: 'engine',
    showQrScannerAlternatorTRStart: 'alternator',
    showQrScannerAlternatorDGStart: 'alternator',
    showQrScannerAlternatorDGEnd: 'alternator',
    showQrScannerAlternatorTREnd: 'alternator',
    showQrScannerDieselTRStart: 'diesel',
    showQrScannerDieselDGStart: 'diesel',
    showQrScannerDieselDGEnd: 'diesel',
    showQrScannerDieselTREnd: 'diesel',
    showQrScannerEWAPPDFTRStart: 'ewppdf',
    showQrScannerEWAPPDFDGStart: 'ewppdf',
    showQrScannerEWAPPDFDGEnd: 'ewppdf',
    showQrScannerEWAPPDFTREnd: 'ewppdf',
  };
  selectedSixMItem: string | null = null;
  apiResponse: any;
  selectedTabIndex: number = 0;
  sixMOptions: any[] = []; // Stores select6M API response for dropdown
  processCheckpoints: any[] = []; // for assign process checkpoint dynamically
  trDGKitDetails: any[] = []; //for assign dg kit details
  isDropdownOpen = false;
  isSecondDropdownOpen = false;
  selectedItem: string = 'Select an option';
  dropdownOptions: string[] = ['Rework', 'Rejected', 'Accepted(OK)'];
  recordedAudioFile: File | null = null;
  recordedVideoFile: File | null = null;

  scanDetails = {
    TRStart: {
      engine: { qrSrNo: '', engDesc: '', engCode: '' },
      alternator: { qrSrNo: '', altDesc: '', altPart: '', trStatus: '' },
      diesel: { qtyltr: '', dslQty: '', dslRate: '', dslPartCode: '' },
    },
    DGStart: {
      engine: { qrSrNo: '', engDesc: '', engCode: '' },
      alternator: { qrSrNo: '', altDesc: '', altPart: '', trStatus: '' },
      diesel: { qtyltr: '', dslQty: '', dslRate: '', dslPartCode: '' },
    },
    DGEnd: {
      engine: { qrSrNo: '', engDesc: '', engCode: '' },
      alternator: { qrSrNo: '', altDesc: '', altPart: '', trStatus: '' },
      diesel: { qtyltr: '', dslQty: '', dslRate: '', dslPartCode: '' },
    },
    TREnd: {
      engine: { qrSrNo: '', engDesc: '', engCode: '' },
      alternator: { qrSrNo: '', altDesc: '', altPart: '', trStatus: '' },
      diesel: { qtyltr: '', dslQty: '', dslRate: '', dslPartCode: '' },
    },
  };

  // Audio Recording Variables
  isRecording = false;
  isAudioClipVisible = false;
  private mediaRecorder!: MediaRecorder;
  private audioChunks: Blob[] = [];
  audioBlob: Blob | null = null;
  audioUrl: string | null = null;
  showAudioPlayer: boolean = false;
  stream!: MediaStream;
  isRecordingTRStart = false;
  isRecordingTREnd = false;
  audioBlobTRStart: Blob | null = null;
  audioBlobTREnd: Blob | null = null;
  audioUrlTRStart: string | null = null;
  audioUrlTREnd: string | null = null;
  recordedAudioFileTRStart: File | null = null;
  recordedAudioFileTREnd: File | null = null;

  isRecordingDGStart = false;
  isRecordingDGEnd = false;
  audioBlobDGStart: Blob | null = null;
  audioBlobDGEnd: Blob | null = null;
  audioUrlDGStart: string | null = null;
  audioUrlDGEnd: string | null = null;
  recordedAudioFileDGStart: File | null = null;
  recordedAudioFileDGEnd: File | null = null;

  // Video Recording Variables
  isVideoRecording = false;
  isVideoClipVisible = false;
  private videoRecorder!: MediaRecorder;
  private videoChunks: Blob[] = [];
  videoBlob: Blob | null = null;
  videoUrl: string | null = null;
  isVideoRecordingTRStart = false;
  isVideoRecordingTREnd = false;
  videoBlobTRStart: Blob | null = null;
  videoBlobTREnd: Blob | null = null;
  videoUrlTRStart: string | null = null;
  videoUrlTREnd: string | null = null;
  recordedVideoFileTRStart: File | null = null;
  recordedVideoFileTREnd: File | null = null;

  isVideoRecordingDGStart = false;
  isVideoRecordingDGEnd = false;
  videoBlobDGStart: Blob | null = null;
  videoBlobDGEnd: Blob | null = null;
  videoUrlDGStart: string | null = null;
  videoUrlDGEnd: string | null = null;
  recordedVideoFileDGStart: File | null = null;
  recordedVideoFileDGEnd: File | null = null;

  //for TRStart section
  planNoTRStart: string = '';
  dateTRStart: string = '';
  dgDescTRStart: string = '';
  dgPartcodeTRStart: string = '';
  dgKVATRStart: string = '';
  dgCPtypeTRStart: string = '';
  trstarttimeTRStart: string = '';
  dgstarttimeTRStart: string = '';
  dgendtimeTRStart: string = '';
  trendtimeTRStart: string = '';

  //for TREnd Section
  planNoTREnd: string = '';
  dateTREnd: string = '';
  dgDescTREnd: string = '';
  dgPartcodeTREnd: string = '';
  dgKVATREnd: string = '';
  dgCPtypeTREnd: string = '';
  trstarttimeTREnd: string = '';
  dgstarttimeTREnd: string = '';
  dgendtimeTREnd: string = '';
  trendtimeTREnd: string = '';

  //for DGStart section
  planNoDGStart: string = '';
  dateDGStart: string = '';
  dgDescDGStart: string = '';
  dgPartcodeDGStart: string = '';
  dgKVADGStart: string = '';
  dgCPtypeDGStart: string = '';
  trstarttimeDGStart: string = '';
  dgstarttimeDGStart: string = '';
  dgendtimeDGStart: string = '';
  trendtimeDGStart: string = '';

  //for DGEnd Section
  planNoDGEnd: string = '';
  dateDGEnd: string = '';
  dgDescDGEnd: string = '';
  dgPartcodeDGEnd: string = '';
  dgKVADGEnd: string = '';
  dgCPtypeDGEnd: string = '';
  trstarttimeDGEnd: string = '';
  dgstarttimeDGEnd: string = '';
  dgendtimeDGEnd: string = '';
  trendtimeDGEnd: string = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private dgAssemblyService: DgTestReportService,
    private authService: JwtAuthService
  ) {}

  ngAfterViewInit(): void {
    const dQty = document.getElementById('dieselQty');
    if (dQty) {
      dQty.addEventListener('blur', () => {
        this.dieselQtyByUser = dQty.textContent?.trim() || '';
        console.log('Entered DieselQty:', this.dieselQtyByUser);
      });
    }
  }

  onTabChange(value: string) {
    this.selectedTab = value;
    console.log('Selected Tab:', this.selectedTab);
    this.cdr.detectChanges(); // Force UI update
  }

  //For detect the selected tab
  get currentTimes() {
    return {
      trstart: this[`trstarttime${this.selectedTab}`],
      dgstart: this[`dgstarttime${this.selectedTab}`],
      dgend: this[`dgendtime${this.selectedTab}`],
      trend: this[`trendtime${this.selectedTab}`],
    };
  }

  showError(message: string) {
    this.errorMessage = message;
  }
  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
    this.extractedJobcard = '';
    this.extractedEngSerial = '';
  }

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

  /** Full LineRight object behind the dropdown selection. */
  get selectedLineRight(): LineRight | undefined {
    return this.lineRights.find(l => l.LineWisePC === this.selectedLineWisePC);
  }

  // ── Fetch the lines this position is entitled to post against ──
  private loadLineRights(): void {
    if (!this.prmCode) {
      console.warn('[DgTestReport] no positionRoleId in localStorage — skipping line rights fetch');
      this.lineRights = [];
      return;
    }
    this.dgAssemblyService.getLineRights(this.prmCode).subscribe({
      next: (rows) => {
        this.lineRights = Array.isArray(rows) ? rows : [];
        console.log('[DgTestReport] line rights for', this.prmCode, '=>', this.lineRights);
        // Single-line position: auto-select so the dropdown isn't blank.
        if (this.lineRights.length === 1) {
          this.selectedLineWisePC = this.lineRights[0].LineWisePC;
        }
      },
      error: (err) => {
        console.error('[DgTestReport] line rights error', err);
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

  // <zxing-scanner> calls console.error / console.warn from
  // handlePermissionException when no camera is available. Those calls bypass
  // the (scanError) output, so the only way to keep DevTools clean on a
  // RUGTEK-only machine is to filter them at the console level. The filter is
  // surgical (matches the exact zxing prefix + permission strings) and is
  // uninstalled on destroy so nothing else in the app is affected.
  private installZxingConsoleFilter(): void {
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

  // Hot-swap support across desktop AND mobile: when camera hardware or
  // permission state changes (USB webcam plugged/unplugged, RUGTEK swapped
  // in/out, mobile OS revokes camera, external USB-C camera attached to a
  // phone), the browser fires 'devicechange' on navigator.mediaDevices. We
  // remount whichever scanner section is currently open so zxing
  // re-enumerates against the new device list — no page reload required.
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
    const self = this as any;
    const wasOpen: { [k: string]: boolean } = {};
    this.scannerFlags.forEach((f) => (wasOpen[f] = !!self[f]));
    const anyOpen = this.scannerFlags.some((f) => !!self[f]);
    if (!anyOpen) {
      this.cdr.detectChanges();
      return;
    }
    this.scannerFlags.forEach((f) => (self[f] = false));
    this.cdr.detectChanges();
    setTimeout(() => {
      this.scannerFlags.forEach((f) => (self[f] = wasOpen[f]));
      this.cdr.detectChanges();
      this.focusActiveHidInput();
    }, 150);
  }

  // Move keyboard focus to whichever hidden scanner input is currently in
  // the DOM, so the RUGTEK gun can deliver characters + Enter to it.
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
  onHidScan(input: HTMLInputElement, type: string): void {
    const value = (input.value || '').trim();
    input.value = '';
    console.log('[RUGTEK] hidden-input scan:', value, type);
    if (!value) return;
    this.handleQrCodeResult(value, type);
  }

  // Document-level keystroke buffer for the RUGTEK HID scanner.
  // The hidden input above only catches keys when focus actually lands on it,
  // which is fragile (the SCAN button may keep focus, modals may steal it,
  // etc.). This listener is focus-independent: while any scan section is
  // open, it accumulates rapid keystrokes and dispatches on Enter, routing
  // the value to the same handler the camera path uses.
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isAnyScannerOpen()) return;

    const target = event.target as HTMLElement | null;
    if (target && target.classList?.contains('hid-scanner-input')) {
      // dedicated hidden input handles its own (keydown.enter)
      return;
    }
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
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
      if (gap > this.HID_MAX_GAP_MS) this.hidBuffer = '';
      this.hidBuffer += event.key;
    }
  }

  private isAnyScannerOpen(): boolean {
    const self = this as any;
    return this.scannerFlags.some((f) => !!self[f]);
  }

  private dispatchHidScan(value: string): void {
    const self = this as any;
    for (const flag of this.scannerFlags) {
      if (self[flag]) {
        const type = this.scannerFlagRoute[flag];
        this.handleQrCodeResult(value, type);
        return;
      }
    }
  }

  // Silently swallow camera errors (e.g. NotFoundError on PCs without a webcam).
  // The HID scanner path continues to work via the document keydown listener.
  onScannerError(_err: unknown): void {}

  // Diagnostic listeners for the camera path. They log via console.log which
  // is NOT covered by our console.error/warn filter, so they remain visible
  // and help reveal why the scanner viewport stays blank (permission denial,
  // zero devices, etc.).
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

  dgScanClick() {
    // Toggle the DGScan scanner
    this.showQrScannerDGScan = !this.showQrScannerDGScan;

    if (this.showQrScannerDGScan) {
      // Close all other scanners
      const scannerKeysToClose = [
        'showQrScannerEngineTRStart',
        'showQrScannerEngineDGStart',
        'showQrScannerEngineTREnd',
        'showQrScannerEngineDGEnd',
        'showQrScannerAlternatorTRStart',
        'showQrScannerAlternatorDGStart',
        'showQrScannerAlternatorTREnd',
        'showQrScannerAlternatorDGEnd',
        'showQrScannerDieselTRStart',
        'showQrScannerDieselDGStart',
        'showQrScannerDieselTREnd',
        'showQrScannerDieselDGEnd',
      ];

      scannerKeysToClose.forEach((key) => {
        if (this.hasOwnProperty(key)) {
          this[key] = false;
        }
      });
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanEngineClick(action: 'TRStart' | 'DGStart' | 'TREnd' | 'DGEnd') {
    const scannerKey = `showQrScannerEngine${action}`; // Dynamically creates either 'showQrScannerEngineStart' or 'showQrScannerEngineEnd'
    // this[scannerKey] = !this[scannerKey]; // Toggles the respective scanner visibility
    console.log(
      'scannerKey:',
      scannerKey,
      'value before toggle:',
      this[scannerKey]
    );
    this[scannerKey] = !this[scannerKey];
    console.log('value after toggle:', this[scannerKey]);

    this.showQrScannerDGScan = false;

    if (this[scannerKey]) {
      // If the scanner is now visible, reset all other scanners of the same type
      const scannerKeysToClose = [
        'showQrScannerAlternatorTRStart',
        'showQrScannerAlternatorDGStart',
        'showQrScannerAlternatorTREnd',
        'showQrScannerAlternatorDGEnd',
        'showQrScannerDieselTRStart',
        'showQrScannerDieselDGStart',
        'showQrScannerDieselTREnd',
        'showQrScannerDieselDGEnd',
      ];

      scannerKeysToClose.forEach((key) => {
        if (this.hasOwnProperty(key)) {
          this[key] = false;
        }
      });
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanAlternatorClick(action: 'TRStart' | 'DGStart' | 'TREnd' | 'DGEnd') {
    const scannerKey = `showQrScannerAlternator${action}`;
    this[scannerKey] = !this[scannerKey];

    this.showQrScannerDGScan = false;

    if (this[scannerKey]) {
      const scannerKeysToClose = [
        'showQrScannerEngineTRStart',
        'showQrScannerEngineDGStart',
        'showQrScannerEngineTREnd',
        'showQrScannerEngineDGEnd',
        'showQrScannerDieselTRStart',
        'showQrScannerDieselDGStart',
        'showQrScannerDieselTREnd',
        'showQrScannerDieselDGEnd',
      ];

      scannerKeysToClose.forEach((key) => {
        if (this.hasOwnProperty(key)) {
          this[key] = false;
        }
      });
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanDieselClick(action: 'TRStart' | 'DGStart' | 'TREnd' | 'DGEnd') {
    const scannerKey = `showQrScannerDiesel${action}`;
    this[scannerKey] = !this[scannerKey];

    this.showQrScannerDGScan = false;

    if (this[scannerKey]) {
      const scannerKeysToClose = [
        'showQrScannerEngineTRStart',
        'showQrScannerEngineDGStart',
        'showQrScannerEngineTREnd',
        'showQrScannerEngineDGEnd',
        'showQrScannerAlternatorTRStart',
        'showQrScannerAlternatorDGStart',
        'showQrScannerAlternatorTREnd',
        'showQrScannerAlternatorDGEnd',
      ];

      scannerKeysToClose.forEach((key) => {
        if (this.hasOwnProperty(key)) {
          this[key] = false;
        }
      });
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanControlEWAPPDFClick(action: 'TRStart' | 'DGStart' | 'TREnd' | 'DGEnd') {
    const scannerKey = `showQrScannerEWAPPDF${action}`;
    this[scannerKey] = !this[scannerKey];

    this.showQrScannerDGScan = false;

    if (this[scannerKey]) {
      const scannerKeysToClose = [
        'showQrScannerEngineTRStart',
        'showQrScannerEngineDGStart',
        'showQrScannerEngineTREnd',
        'showQrScannerEngineDGEnd',
        'showQrScannerAlternatorTRStart',
        'showQrScannerAlternatorDGStart',
        'showQrScannerAlternatorTREnd',
        'showQrScannerAlternatorDGEnd',
      ];

      scannerKeysToClose.forEach((key) => {
        if (this.hasOwnProperty(key)) {
          this[key] = false;
        }
      });
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

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

  selectOption(option: string) {
    this.selectedOption = option;
    this.isSecondDropdownOpen = false;
    this.fetchProcessCheckpointsAndAssignToCard();
  }

  // Audio Recording Methods
  onAudioClipClick() {
    this.isAudioClipVisible = true;
  }

  onVideoClipClick() {
    this.isVideoClipVisible = true;
  }

  fetchProcessCheckpointsAndAssignToCard() {
    if (!this.selectedOption) return; // Prevent API call if no selection

    const stageName = 'DG TestReport'; // Static stage name
    const statusName = this.selectedOption;

    //API Call
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

  startRecording(section: 'TRStart' | 'DGStart' | 'TREnd' | 'DGEnd') {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.start();
        this.setRecordingState(section, true);

        const audioChunks: Blob[] = [];
        this.mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const recordedAudioFile = new File([audioBlob], 'recording.mp3', {
            type: 'audio/mp3',
          });

          this.setRecordedAudio(
            section,
            audioBlob,
            audioUrl,
            recordedAudioFile
          );
          this.cdr.detectChanges();
        };
      });
    }
  }

  stopRecording(section: 'TRStart' | 'DGStart' | 'TREnd' | 'DGEnd') {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.setRecordingState(section, false);
      this.stream?.getTracks().forEach((track) => track.stop());
      this.cdr.detectChanges();
    }
  }

  startVideoRecording(section: 'TRStart' | 'DGStart' | 'TREnd' | 'DGEnd') {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          this.videoRecorder = new MediaRecorder(stream);
          this.videoRecorder.start();
          this.setVideoRecordingState(section, true);

          const videoChunks: Blob[] = [];
          this.videoRecorder.ondataavailable = (event) => {
            videoChunks.push(event.data);
          };

          this.videoRecorder.onstop = () => {
            const videoBlob = new Blob(videoChunks, { type: 'video/mp4' });
            const videoUrl = URL.createObjectURL(videoBlob);
            const recordedVideoFile = new File([videoBlob], 'recording.mp4', {
              type: 'video/mp4',
            });

            this.setRecordedVideo(
              section,
              videoBlob,
              videoUrl,
              recordedVideoFile
            );
            this.cdr.detectChanges();
          };
        });
    }
  }

  stopVideoRecording(section: 'TRStart' | 'DGStart' | 'TREnd' | 'DGEnd') {
    if (this.videoRecorder) {
      this.videoRecorder.stop();
      this.setVideoRecordingState(section, false);
      this.stream?.getTracks().forEach((track) => track.stop());
      this.cdr.detectChanges();
    }
  }

  // Helper Methods
  private setRecordingState(
    section: 'TRStart' | 'DGStart' | 'TREnd' | 'DGEnd',
    state: boolean
  ) {
    if (section === 'TRStart') {
      this.isRecordingTRStart = state;
    } else if (section === 'TREnd') {
      this.isRecordingTREnd = state;
    } else if (section === 'DGStart') {
      this.isRecordingDGStart = state;
    } else if (section === 'DGEnd') {
      this.isRecordingDGEnd = state;
    }
  }

  private setRecordedAudio(
    section: 'TRStart' | 'DGStart' | 'TREnd' | 'DGEnd',
    blob: Blob,
    url: string,
    file: File
  ) {
    if (section === 'TRStart') {
      this.audioBlobTRStart = blob;
      this.audioUrlTRStart = url;
      this.recordedAudioFileTRStart = file;
    } else if (section === 'DGStart') {
      this.audioBlobDGStart = blob;
      this.audioUrlDGStart = url;
      this.recordedAudioFileDGStart = file;
    } else if (section === 'DGEnd') {
      this.audioBlobDGEnd = blob;
      this.audioUrlDGEnd = url;
      this.recordedAudioFileDGEnd = file;
    } else if (section === 'TREnd') {
      this.audioBlobTREnd = blob;
      this.audioUrlTREnd = url;
      this.recordedAudioFileTREnd = file;
    }
  }

  private setVideoRecordingState(
    section: 'TRStart' | 'DGStart' | 'TREnd' | 'DGEnd',
    state: boolean
  ) {
    if (section === 'TRStart') {
      this.isVideoRecordingTRStart = state;
    } else if (section === 'TREnd') {
      this.isVideoRecordingTREnd = state;
    } else if (section === 'DGStart') {
      this.isVideoRecordingDGStart = state;
    } else if (section === 'DGEnd') {
      this.isVideoRecordingDGEnd = state;
    }
  }

  private setRecordedVideo(
    section: 'TRStart' | 'DGStart' | 'TREnd' | 'DGEnd',
    blob: Blob,
    url: string,
    file: File
  ) {
    if (section === 'TRStart') {
      this.videoBlobTRStart = blob;
      this.videoUrlTRStart = url;
      this.recordedVideoFileTRStart = file;
    } else if (section === 'TREnd') {
      this.videoBlobTREnd = blob;
      this.videoUrlTREnd = url;
      this.recordedVideoFileTREnd = file;
    } else if (section === 'DGStart') {
      this.videoBlobDGStart = blob;
      this.videoUrlDGStart = url;
      this.recordedVideoFileDGStart = file;
    } else if (section === 'DGEnd') {
      this.videoBlobDGEnd = blob;
      this.videoUrlDGEnd = url;
      this.recordedVideoFileDGEnd = file;
    }
  }

  handleQrCodeResult(result?: string, type?: string) {
    this.stage = this.selectedTab;

    if (type === 'dgscan') {
      const payload = {
        strSrNo: result,
        strDGSrNo: result,
        strCat: '047',
        strPCCode: this.selectedLineRight?.LineWisePC ?? '',
        //   this.userId === '0211'
        //     ? '01.004'
        //     : this.userId === '2236'
        //     ? '03.051'
        //     : this.userId === '110422'
        //     ? '28.001'
        //     : '',
      };

      this.dgAssemblyService.getDGScanDetails(payload).subscribe(
        (response) => {
          console.log('Test Report', response);

          // Assign values to the common object
          const engDetails = response.Engdts.split('-->');
          this.scanDetails[this.stage].engine = {
            qrSrNo: engDetails[0],
            engCode: engDetails[1],
            engDesc: engDetails[2],
          };

          const altDetails = response.Altdts.split('-->');
          this.scanDetails[this.stage].alternator = {
            qrSrNo: altDetails[0],
            altPart: altDetails[1],
            altDesc: altDetails[2],
            trStatus: response.TRStatus,
          };

          this.scanDetails[this.stage].diesel = {
            dslQty: response.DieselQty,
            dslRate: response.DieselRate,
            dslPartCode: response.DieselPart,
          };

          this.scanDetails[this.stage].ewppdf = {};
          this.trCode = response.TRCode;
          this.dgSerialNo = response.SerialNo;
          this.pFbCode = response.PFBCode;
          this.dieselQty = response.DieselQty;
          this.dieselRate = response.DieselRate;
          this.qaStatus = response.QAStatus;
          this.panelType = response.PanelType;

          this.splitPanelType = response.PanelType.split('-->');

          if (this.stage === 'TRStart') {
            this.trstarttimeTRStart = response.TRStartTime;
            this.dgstarttimeTRStart = response.DGStartTime;
            this.dgendtimeTRStart = response.DGEndTime;
            this.trendtimeTRStart = response.TREndTime;
            this.planNoTRStart = response.TRCode || '';
            this.dateTRStart = response.Dt || '';
            this.dgDescTRStart = response.Partdesc || '';
            this.dgPartcodeTRStart = response.Partcode || '';
            this.dgKVATRStart = response.KVA || '';
            this.dgCPtypeTRStart = this.splitPanelType[0];
          } else if (this.stage === 'TREnd') {
            this.trstarttimeTREnd = response.TRStartTime;
            this.dgstarttimeTREnd = response.DGStartTime;
            this.dgendtimeTREnd = response.DGEndTime;
            this.trendtimeTREnd = response.TREndTime;
            this.planNoTREnd = response.TRCode || '';
            this.dateTREnd = response.Dt || '';
            this.dgDescTREnd = response.Partdesc || '';
            this.dgPartcodeTREnd = response.Partcode || '';
            this.dgKVATREnd = response.KVA || '';
            this.dgCPtypeTREnd = this.splitPanelType[0];
          } else if (this.stage === 'DGStart') {
            this.trstarttimeDGStart = response.TRStartTime;
            this.dgstarttimeDGStart = response.DGStartTime;
            this.dgendtimeDGStart = response.DGEndTime;
            this.trendtimeDGStart = response.TREndTime;
            this.planNoDGStart = response.TRCode || '';
            this.dateDGStart = response.Dt || '';
            this.dgDescDGStart = response.Partdesc || '';
            this.dgPartcodeDGStart = response.Partcode || '';
            this.dgKVADGStart = response.KVA || '';
            this.dgCPtypeDGStart = this.splitPanelType[0];
          } else if (this.stage === 'DGEnd') {
            this.trstarttimeDGEnd = response.TRStartTime;
            this.dgstarttimeDGEnd = response.DGStartTime;
            this.dgendtimeDGEnd = response.DGEndTime;
            this.trendtimeDGEnd = response.TREndTime;
            this.planNoDGEnd = response.TRCode || '';
            this.dateDGEnd = response.Dt || '';
            this.dgDescDGEnd = response.Partdesc || '';
            this.dgPartcodeDGEnd = response.Partcode || '';
            this.dgKVADGEnd = response.KVA || '';
            this.dgCPtypeDGEnd = this.splitPanelType[0];
          }

          this.fetchTRDGkitDetails(
            response.Partcode,
            response.SerialNo,
            response.PFBCode
          );
        },
        (error) => {
          console.error('Error in API call', error);
        }
      );

      this.showQrScannerDGScan = false;
      //this.showQrScannerEngineEnd = false;
    } else if (type === 'engine') {
      this.scannedEngineQrResult[this.stage] = result ?? '';
      this.showQrScannerEngineTRStart = false;
      this.showQrScannerEngineDGStart = false;
      this.showQrScannerEngineDGEnd = false;
      this.showQrScannerEngineTREnd = false;
      const storedQrSrNo = (
        this.scanDetails[this.stage]['engine'] as { qrSrNo: string }
      )?.qrSrNo;
      if (this.scannedEngineQrResult[this.stage] !== storedQrSrNo) {
        alert('Engine Serial code does not match! Please check.');
      }
    } else if (type === 'alternator') {
      this.scannedAlternatorQrResult[this.stage] = result ?? '';
      this.showQrScannerAlternatorTRStart = false;
      this.showQrScannerAlternatorTREnd = false;
      this.showQrScannerAlternatorDGEnd = false;
      this.showQrScannerAlternatorDGStart = false;
      const storedQrSrNo = (
        this.scanDetails[this.stage]['alternator'] as { qrSrNo: string }
      )?.qrSrNo;
      if (this.scannedAlternatorQrResult[this.stage] !== storedQrSrNo) {
        alert('Alternator Serial code does not match! Please check.');
      }
    } else if (type === 'diesel') {
      this.scannedDieselQrResult = result;
      this.showQrScannerDieselDGEnd = false;
      this.showQrScannerDieselTREnd = false;
      this.showQrScannerDieselTRStart = false;
      this.showQrScannerDieselDGStart = false;
      const storedQrSrNo = (
        this.scanDetails[this.stage]['diesel'] as { qrSrNo: string }
      )?.qrSrNo;
      if (this.scannedDieselQrResult !== storedQrSrNo) {
        alert('Diesel Serial code does not match! Please check.');
      }
    }
    console.log(`Scanned ${type} (${this.stage}):`, result);
  }

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

  fetchTRDGkitDetails(
    strPartcode: string,
    strDGSrNo: string,
    strPfbCode: string
  ) {
    const encodedPfbCode = encodeURIComponent(strPfbCode);
    this.dgAssemblyService
      .getDGKitDetails(strPartcode, strDGSrNo, encodedPfbCode)
      .subscribe(
        (response) => {
          console.log('TRDGKitDetails API Response:', response);
          if (response && response.length > 0) {
            this.trDGKitDetails = response; // Store API response
          } else {
          }
        },
        (error) => {
          console.error('Error Fetching DGKitDetails API Response :', error);
        }
      );
  }

  submitData() {
    if (this.selectedTab === 'TRStart') {
      this.submitTRStartData();
    } else if (this.selectedTab === 'TREnd') {
      this.submitTREndData();
    } else if (this.selectedTab === 'DGStart') {
      this.submitDGStartData();
    } else if (this.selectedTab === 'DGEnd') {
      this.submitDGEndData();
    }
  }

  submitTRStartData() {
    console.log('Start Data Submitted:', this.scanDetails.TRStart);
    // Add API call or processing logic here
    const formData = new FormData();
    formData.append('PFBCode', this.pFbCode);
    formData.append('DGSrNo', this.dgSerialNo);
    formData.append('TRCode', this.trCode);
    formData.append('TRTime', 'TRStart');
    formData.append('QA6M', this.selectedSixMItem);
    formData.append('QAStatus', 'D');
    formData.append('DieselQty', this.dieselQtyByUser);
    formData.append('DieselRate', this.dieselRate);
    formData.append('Remark', 'Nil');
    let extractedData = this.trDGKitDetails.map((item) => ({
      PartCode: item.PartCode,
      SerialNo: item.SerialNo,
    }));
    if (this.selectedOption) {
      formData.append('PrcStatus', this.selectedOption);
    }
    let trDGKitDetailJson = JSON.stringify(extractedData);
    //console.log(trDGKitDetailJson);
    formData.append('TRDGKitDetailJson', trDGKitDetailJson);
    // if (fetchedCheckPoints.length > 0) {
    //      formData.append("TRPrcChkDtsJson", JSON.stringify(fetchedCheckPoints));
    //    }

    this.dgAssemblyService.submitTestReportData(formData).subscribe(
      (response: any) => {
        this.successMessage = response.Message;
      },
      (error: any) => {
        console.error('API Error Response:', error);
        this.errorMessage = 'Failed to submit data. Please try again.';
        console.log('Error Message from API:', this.errorMessage);
        this.showError(this.errorMessage);
      }
    );
  }

  submitDGEndData() {
    const fetchedCheckPoints = this.fetchCheckPointDataFromUI();
    // Add API call or processing logic here
    const formData = new FormData();
    formData.append('PFBCode', this.pFbCode);
    formData.append('DGSrNo', this.dgSerialNo);
    formData.append('TRCode', this.trCode);
    formData.append('TRTime', 'DGEnd');
    formData.append('QA6M', this.selectedSixMItem);
    formData.append('QAStatus', 'D');
    formData.append('DieselQty', this.dieselQtyByUser);

    if (fetchedCheckPoints.length > 0) {
      formData.append('TRPrcChkDtsJson', JSON.stringify(fetchedCheckPoints));
    }

    this.dgAssemblyService.submitTestReportData(formData).subscribe(
      (response: any) => {
        this.successMessage = response.Message;
      },
      (error: any) => {
        console.error('API Error Response:', error);
        this.errorMessage = 'Failed to submit data. Please try again.';
        console.log('Error Message from API:', this.errorMessage);
        this.showError(this.errorMessage);
      }
    );
  }

  submitDGStartData() {
    const formData = new FormData();
    formData.append('PFBCode', this.pFbCode);
    formData.append('DGSrNo', this.dgSerialNo);
    formData.append('TRCode', this.trCode);
    formData.append('TRTime', 'DGStart');

    this.dgAssemblyService.submitTestReportData(formData).subscribe(
      (response: any) => {
        this.successMessage = response.Message;
      },
      (error: any) => {
        console.error('API Error Response:', error);
        this.errorMessage = 'Failed to submit data. Please try again.';
        console.log('Error Message from API:', this.errorMessage);
        this.showError(this.errorMessage);
      }
    );
  }

  submitTREndData() {
    const formData = new FormData();
    formData.append('PFBCode', this.pFbCode);
    formData.append('DGSrNo', this.dgSerialNo);
    formData.append('TRCode', this.trCode);
    formData.append('TRTime', 'TREnd');

    this.dgAssemblyService.submitTestReportData(formData).subscribe(
      (response: any) => {
        this.successMessage = response.Message;
      },
      (error: any) => {
        console.error('API Error Response:', error);
        this.errorMessage = 'Failed to submit data. Please try again.';
        console.log('Error Message from API:', this.errorMessage);
        this.showError(this.errorMessage);
      }
    );
  }

  // In your DG Test Report component.ts file

  isSaveDisabled(): boolean {
    switch (this.selectedTab) {
      case 'TRStart':
        return !this.isTRStartValid();
      case 'TREnd':
        return !this.isTREndValid();
      case 'DGStart':
        return !this.isDGStartValid();
      case 'DGEnd':
        return !this.isDGEndValid();
      default:
        return true;
    }
  }

  // ==================== TR START VALIDATIONS ====================

  isTRStartValid(): boolean {
    return this.isEngineValidTRStart() && this.isAlternatorValidTRStart();
  }

  // Engine - Required (turns GREEN when scannedEngineQrResult[TRStart] matches qrSrNo)
  isEngineValidTRStart(): boolean {
    return (
      !!this.scanDetails?.TRStart?.engine?.qrSrNo &&
      this.scannedEngineQrResult['TRStart'] === this.scanDetails.TRStart.engine.qrSrNo
    );
  }

  // Alternator - Required (turns GREEN when scannedAlternatorQrResult[TRStart] matches qrSrNo)
  isAlternatorValidTRStart(): boolean {
    return (
      !!this.scanDetails?.TRStart?.alternator?.qrSrNo &&
      this.scannedAlternatorQrResult['TRStart'] ===
        this.scanDetails.TRStart.alternator.qrSrNo
    );
  }

  // ==================== DG START VALIDATIONS ====================

  isDGStartValid(): boolean {
    return this.isEngineValidDGStart() && this.isAlternatorValidDGStart();
  }

  // Engine - Required (turns GREEN when scannedEngineQrResult[DGStart] matches qrSrNo)
  isEngineValidDGStart(): boolean {
    return (
      !!this.scanDetails?.DGStart?.engine?.qrSrNo &&
      this.scannedEngineQrResult['DGStart'] === this.scanDetails.DGStart.engine.qrSrNo
    );
  }

  // Alternator - Required (turns GREEN when scannedAlternatorQrResult[DGStart] matches qrSrNo)
  isAlternatorValidDGStart(): boolean {
    return (
      !!this.scanDetails?.DGStart?.alternator?.qrSrNo &&
      this.scannedAlternatorQrResult['DGStart'] ===
        this.scanDetails.DGStart.alternator.qrSrNo
    );
  }

  // ==================== DG END VALIDATIONS ====================

  isDGEndValid(): boolean {
    return this.isEngineValidDGEnd() && this.isAlternatorValidDGEnd();
  }

  // Engine - Required (turns GREEN when scannedEngineQrResult[DGEnd] matches qrSrNo)
  isEngineValidDGEnd(): boolean {
    return (
      !!this.scanDetails?.DGEnd?.engine?.qrSrNo &&
      this.scannedEngineQrResult['DGEnd'] === this.scanDetails.DGEnd.engine.qrSrNo
    );
  }

  // Alternator - Required (turns GREEN when scannedAlternatorQrResult[DGEnd] matches qrSrNo)
  isAlternatorValidDGEnd(): boolean {
    return (
      !!this.scanDetails?.DGEnd?.alternator?.qrSrNo &&
      this.scannedAlternatorQrResult['DGEnd'] ===
        this.scanDetails.DGEnd.alternator.qrSrNo
    );
  }

  // ==================== TR END VALIDATIONS ====================

  isTREndValid(): boolean {
    return this.isEngineValidTREnd() && this.isAlternatorValidTREnd();
  }

  // Engine - Required (turns GREEN when scannedEngineQrResult[TREnd] matches qrSrNo)
  isEngineValidTREnd(): boolean {
    return (
      !!this.scanDetails?.TREnd?.engine?.qrSrNo &&
      this.scannedEngineQrResult['TREnd'] === this.scanDetails.TREnd.engine.qrSrNo
    );
  }

  // Alternator - Required (turns GREEN when scannedAlternatorQrResult[TREnd] matches qrSrNo)
  isAlternatorValidTREnd(): boolean {
    return (
      !!this.scanDetails?.TREnd?.alternator?.qrSrNo &&
      this.scannedAlternatorQrResult['TREnd'] ===
        this.scanDetails.TREnd.alternator.qrSrNo
    );
  }
}
