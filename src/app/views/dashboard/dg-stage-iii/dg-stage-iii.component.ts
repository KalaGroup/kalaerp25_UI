import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef, HostListener } from '@angular/core';
import { BarcodeFormat } from '@zxing/browser';
import { ChangeDetectorRef } from '@angular/core';
import { DgStageIIIService } from './dg-stage-iii-service.service';

import { JwtAuthService } from 'app/shared/services/auth/jwt-auth.service';

@Component({
    selector: 'app-dg-stage-iii',
    templateUrl: './dg-stage-iii.component.html',
    styleUrl: './dg-stage-iii.component.scss',
    standalone: false
})
export class DgStageIIIComponent implements OnInit, OnDestroy {
  [key: string]: any;
  userId: string = '';
  profitcenter_old: string = '';
  profitcenter_act: string = '';

  selectedTab: string = 'Start';
  selectedOption: string = '';
  scannedQrResult: any;
  showQrScanner: { [key: string]: boolean } = {};
  errorMessage: string = '';
  extractedJobcard: string = '';
  extractedEngSerial: string = '';
  successMessage: string = '';
  warningMessage: string = '';
  panelType: string = '';
  splitPanelType: string = '';
  pFbCode: string = '';
  //For Scan Start
  showQrScannerEngineStart: boolean = false;
  showQrScannerAlternatorStart: boolean = false;
  showQrScannerCanopyStart: boolean = false;
  showQrScannerControlPanel1Start: boolean = false;
  showQRScannerControlPanel2Start: boolean = false;
  showQRScannerKRMStart: boolean = false;
  scannedQrResultAlternatorStart: string = '';
  scannedQrResultCanopyStart: string = '';
  scannedQrResultCP1Start: string = '';
  scannedQrResultCP2Start: string = '';
  scannedQrResultKRMStart: string = '';
  scannedBatteryQrResultsStart: string[] = ['', '', '', ''];
  //for Scan End
  showQrScannerEngineEnd: boolean = false;
  showQrScannerAlternatorEnd: boolean = false;
  showQrScannerCanopyEnd: boolean = false;
  showQrScannerControlPanel1End: boolean = false;
  showQRScannerControlPanel2End: boolean = false;
  showQRScannerKRMEnd: boolean = false;
  scannedQrResultAlternatorEnd: string = '';
  scannedQrResultCanopyEnd: string = '';
  scannedQrResultCP1End: string = '';
  scannedQrResultCP2End: string = '';
  scannedQrResultKRMEnd: string = '';
  scannedBatteryQrResultsEnd: string[] = ['', '', '', ''];
  engineScannedStart: boolean = false;
  engineScannedEnd: boolean = false;

  allowedFormats = [BarcodeFormat.QR_CODE];
  scannerType:
    | 'engine'
    | 'alternator'
    | 'canopy'
    | 'controlPanel1'
    | 'controlPanel2'
    | null = null;

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

  // Names of all single-instance scanner flags on this component. Used by
  // isAnyScannerOpen / dispatchHidScan / remountActiveScanner so they don't
  // need to hard-code 12 if-branches. Note the inconsistent casing in the
  // existing names (showQrScanner vs showQRScanner) — preserved as-is.
  private readonly scannerFlags: string[] = [
    'showQrScannerEngineStart', 'showQrScannerEngineEnd',
    'showQrScannerAlternatorStart', 'showQrScannerAlternatorEnd',
    'showQrScannerCanopyStart', 'showQrScannerCanopyEnd',
    'showQrScannerControlPanel1Start', 'showQrScannerControlPanel1End',
    'showQRScannerControlPanel2Start', 'showQRScannerControlPanel2End',
    'showQRScannerKRMStart', 'showQRScannerKRMEnd',
  ];

  // (flag name) -> (type, action) for dispatching HID scans back into
  // handleQrCodeResult, mirroring the (scanSuccess) bindings in the template.
  private readonly scannerFlagRoute: { [flag: string]: { type: string; action: 'Start' | 'End' } } = {
    showQrScannerEngineStart: { type: 'engine', action: 'Start' },
    showQrScannerEngineEnd: { type: 'engine', action: 'End' },
    showQrScannerAlternatorStart: { type: 'alternator', action: 'Start' },
    showQrScannerAlternatorEnd: { type: 'alternator', action: 'End' },
    showQrScannerCanopyStart: { type: 'canopy', action: 'Start' },
    showQrScannerCanopyEnd: { type: 'canopy', action: 'End' },
    showQrScannerControlPanel1Start: { type: 'controlPanel1', action: 'Start' },
    showQrScannerControlPanel1End: { type: 'controlPanel1', action: 'End' },
    showQRScannerControlPanel2Start: { type: 'controlPanel2', action: 'Start' },
    showQRScannerControlPanel2End: { type: 'controlPanel2', action: 'End' },
    showQRScannerKRMStart: { type: 'krm', action: 'Start' },
    showQRScannerKRMEnd: { type: 'krm', action: 'End' },
  };
  selectedSixMItem: string | null = null;
  apiResponse: any;
  selectedTabIndex: number = 0;
  sixMOptions: any[] = []; // Stores select6M API response for dropdown
  processCheckpoints: any[] = []; // for assign process checkpoint dynamically
  dgKitDetails: any[] = []; //for assign dg kit details
  isDropdownOpen = false;
  isSecondDropdownOpen = false;
  selectedItem: string = 'Select an option';
  dropdownOptions: string[] = ['Rework', 'Accepted(OK)'];
  recordedAudioFile: File | null = null;
  recordedVideoFile: File | null = null;
  batteryScanDetailsStart: any[] = [];
  batteryScanDetailsEnd: any[] = [];

  scanDetails = {
    Start: {
      engine: { qrSrNo: '', engDesc: '', engCode: '' },
      alternator: { qrSrNo: '', altDesc: '', altPart: '', trStatus: '' },
      canopy: { qrSrNo: '', cpyDesc: '', cpyPart: '', cpyStk: '' },
      controlPanel1: {
        qrSrNo: '',
        cp1Desc: '',
        cp1Part: '',
        cp1TRStatus: '',
        cp1Stk: '',
      },
      controlPanel2: {
        qrSrNo: '',
        cp2Desc: '',
        cp2Part: '',
        cp2TRStatus: '',
        cp2Stk: '',
      },
      krm: { qrSrNo: '', krmDesc: '', krmPart: '' },
      battery: [],
    },
    End: {
      engine: { qrSrNo: '', engDesc: '', engCode: '' },
      alternator: { qrSrNo: '', altDesc: '', altPart: '', trStatus: '' },
      canopy: { qrSrNo: '', cpyDesc: '', cpyPart: '', cpyStk: '' },
      controlPanel1: {
        qrSrNo: '',
        cp1Desc: '',
        cp1Part: '',
        cp1TRStatus: '',
        cp1Stk: '',
      },
      controlPanel2: {
        qrSrNo: '',
        cp2Desc: '',
        cp2Part: '',
        cp2TRStatus: '',
        cp2Stk: '',
      },
      krm: { qrSrNo: '', krmDesc: '', krmPart: '' },
      battery: [],
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
  isRecordingStart = false;
  isRecordingEnd = false;
  audioBlobStart: Blob | null = null;
  audioBlobEnd: Blob | null = null;
  audioUrlStart: string | null = null;
  audioUrlEnd: string | null = null;
  recordedAudioFileStart: File | null = null;
  recordedAudioFileEnd: File | null = null;

  // Video Recording Variables
  isVideoRecording = false;
  isVideoClipVisible = false;
  private videoRecorder!: MediaRecorder;
  private videoChunks: Blob[] = [];
  videoBlob: Blob | null = null;
  videoUrl: string | null = null;
  isVideoRecordingStart = false;
  isVideoRecordingEnd = false;
  videoBlobStart: Blob | null = null;
  videoBlobEnd: Blob | null = null;
  videoUrlStart: string | null = null;
  videoUrlEnd: string | null = null;
  recordedVideoFileStart: File | null = null;
  recordedVideoFileEnd: File | null = null;

  //for start section
  planNoStart: string = '';
  dateStart: string = '';
  dgDescStart: string = '';
  dgPartcodeStart: string = '';
  dgKVAStart: string = '';
  DgstkStart: string = '';
  dgCPtypeStart: string = '';
  dgKRMStart: string = '';
  krmFoundStart: boolean = false;

  //for End Section
  planNoEnd: string = '';
  dateEnd: string = '';
  dgDescEnd: string = '';
  dgPartcodeEnd: string = '';
  dgKVAEnd: string = '';
  DgstkEnd: string = '';
  dgCPtypeEnd: string = '';
  dgKRMEnd: string = '';
  krmFoundEnd: boolean = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private dgAssemblyService: DgStageIIIService,
    private authService: JwtAuthService
  ) {}

  onTabChange(value: string) {
    this.selectedTab = value;
    console.log('Selected Tab:', this.selectedTab);
    this.cdr.detectChanges(); // Force UI update
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
    this.installZxingConsoleFilter();
    this.installDeviceChangeListener();
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
    const wasOpen: { [k: string]: boolean } = {};
    this.scannerFlags.forEach((f) => (wasOpen[f] = !!this[f]));
    const wasBatStart =
      this.batteryScanDetailsStart?.map((b: any) => !!b?.showQrScanner) || [];
    const wasBatEnd =
      this.batteryScanDetailsEnd?.map((b: any) => !!b?.showQrScanner) || [];
    const anyOpen =
      this.scannerFlags.some((f) => !!this[f]) ||
      wasBatStart.some(Boolean) ||
      wasBatEnd.some(Boolean);
    if (!anyOpen) {
      this.cdr.detectChanges();
      return;
    }
    this.scannerFlags.forEach((f) => (this[f] = false));
    this.batteryScanDetailsStart?.forEach((b: any) => {
      if (b) b.showQrScanner = false;
    });
    this.batteryScanDetailsEnd?.forEach((b: any) => {
      if (b) b.showQrScanner = false;
    });
    this.cdr.detectChanges();
    setTimeout(() => {
      this.scannerFlags.forEach((f) => (this[f] = wasOpen[f]));
      wasBatStart.forEach((open: boolean, i: number) => {
        if (this.batteryScanDetailsStart[i])
          this.batteryScanDetailsStart[i].showQrScanner = open;
      });
      wasBatEnd.forEach((open: boolean, i: number) => {
        if (this.batteryScanDetailsEnd[i])
          this.batteryScanDetailsEnd[i].showQrScanner = open;
      });
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
  onHidScan(
    input: HTMLInputElement,
    type: string,
    action: 'Start' | 'End',
    index?: number
  ): void {
    const value = (input.value || '').trim();
    input.value = '';
    console.log('[RUGTEK] hidden-input scan:', value, type, action, index);
    if (!value) return;
    this.handleQrCodeResult(value, type, action, index);
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
    if (this.scannerFlags.some((f) => !!this[f])) return true;
    return (
      (this.batteryScanDetailsStart || []).some((b: any) => !!b?.showQrScanner) ||
      (this.batteryScanDetailsEnd || []).some((b: any) => !!b?.showQrScanner)
    );
  }

  private dispatchHidScan(value: string): void {
    for (const flag of this.scannerFlags) {
      if (this[flag]) {
        const route = this.scannerFlagRoute[flag];
        this.handleQrCodeResult(value, route.type, route.action);
        return;
      }
    }
    const startIdx = (this.batteryScanDetailsStart || []).findIndex(
      (b: any) => !!b?.showQrScanner
    );
    if (startIdx >= 0) {
      this.handleQrCodeResult(value, 'battery', 'Start', startIdx);
      return;
    }
    const endIdx = (this.batteryScanDetailsEnd || []).findIndex(
      (b: any) => !!b?.showQrScanner
    );
    if (endIdx >= 0) {
      this.handleQrCodeResult(value, 'battery', 'End', endIdx);
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

  onScanEngineClick(action: 'Start' | 'End') {
    const scannerKey = `showQrScannerEngine${action}`; // Dynamically creates either 'showQrScannerEngineStart' or 'showQrScannerEngineEnd'
    this[scannerKey] = !this[scannerKey]; // Toggles the respective scanner visibility

    if (this[scannerKey]) {
      // If the scanner is now visible, reset all other scanners of the same type
      const elements = [
        'showQrScannerAlternator',
        'showQrScannerCanopy',
        'showQrScannerControlPanel1',
        'showQRScannerControlPanel2',
        'showQRScannerKRM',
      ];

      elements.forEach((element) => (this[`${element}${action}`] = false)); // Dynamically reset each scanner of the same type
      this[`batteryScanDetails${action}`].forEach(
        (battery) => (battery.showQrScanner = false)
      ); // Reset battery scanners
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanAlternatorClick(action: 'Start' | 'End') {
    const scannerKey = `showQrScannerAlternator${action}`;
    this[scannerKey] = !this[scannerKey];

    if (this[scannerKey]) {
      const elements = [
        'showQrScannerEngine',
        'showQrScannerCanopy',
        'showQrScannerControlPanel1',
        'showQRScannerControlPanel2',
        'showQRScannerKRM',
      ];

      elements.forEach((element) => (this[`${element}${action}`] = false));
      this[`batteryScanDetails${action}`].forEach(
        (battery) => (battery.showQrScanner = false)
      );
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanCanopyClick(action: 'Start' | 'End') {
    const scannerKey = `showQrScannerCanopy${action}`;
    this[scannerKey] = !this[scannerKey];

    if (this[scannerKey]) {
      const elements = [
        'showQrScannerEngine',
        'showQrScannerAlternator',
        'showQrScannerControlPanel1',
        'showQRScannerControlPanel2',
        'showQRScannerKRM',
      ];

      elements.forEach((element) => (this[`${element}${action}`] = false));
      this[`batteryScanDetails${action}`].forEach(
        (battery) => (battery.showQrScanner = false)
      );
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanBatteryClick(action: 'Start' | 'End', index: number): void {
    const scannerKey = `batteryScanDetails${action}`;

    // Toggle only the clicked battery scanner
    this[scannerKey][index].showQrScanner =
      !this[scannerKey][index].showQrScanner;

    // If the clicked battery scanner is activated, disable all other scanners
    if (this[scannerKey][index].showQrScanner) {
      const elements = [
        'showQrScannerEngine',
        'showQrScannerAlternator',
        'showQrScannerCanopy',
        'showQrScannerControlPanel1',
        'showQRScannerControlPanel2',
        'showQRScannerKRM',
      ];

      elements.forEach((element) => (this[`${element}${action}`] = false));
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanControlPanel1Click(action: 'Start' | 'End') {
    const scannerKey = `showQrScannerControlPanel1${action}`;
    this[scannerKey] = !this[scannerKey];

    if (this[scannerKey]) {
      const elements = [
        'showQrScannerEngine',
        'showQrScannerAlternator',
        'showQrScannerCanopy',
        'showQRScannerControlPanel2',
        'showQRScannerKRM',
      ];

      elements.forEach((element) => (this[`${element}${action}`] = false));
      this[`batteryScanDetails${action}`].forEach(
        (battery) => (battery.showQrScanner = false)
      );
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanControlPanel2Click(action: 'Start' | 'End') {
    const scannerKey = `showQRScannerControlPanel2${action}`;
    this[scannerKey] = !this[scannerKey];

    if (this[scannerKey]) {
      const elements = [
        'showQrScannerEngine',
        'showQrScannerAlternator',
        'showQrScannerCanopy',
        'showQrScannerControlPanel1',
        'showQRScannerKRM',
      ];

      elements.forEach((element) => (this[`${element}${action}`] = false));
      this[`batteryScanDetails${action}`].forEach(
        (battery) => (battery.showQrScanner = false)
      );
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanKRMClick(action: 'Start' | 'End') {
    const scannerKey = `showQRScannerKRM${action}`;
    this[scannerKey] = !this[scannerKey];

    if (this[scannerKey]) {
      const elements = [
        'showQrScannerEngine',
        'showQrScannerAlternator',
        'showQrScannerCanopy',
        'showQrScannerControlPanel1',
        'showQRScannerControlPanel2',
      ];

      elements.forEach((element) => (this[`${element}${action}`] = false));
      this[`batteryScanDetails${action}`].forEach(
        (battery) => (battery.showQrScanner = false)
      );
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

    const stageName = 'DG Stage3'; // Static stage name
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

  startRecording(section: 'Start' | 'End') {
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

  stopRecording(section: 'Start' | 'End') {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.setRecordingState(section, false);
      this.stream?.getTracks().forEach((track) => track.stop());
      this.cdr.detectChanges();
    }
  }

  startVideoRecording(section: 'Start' | 'End') {
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

  stopVideoRecording(section: 'Start' | 'End') {
    if (this.videoRecorder) {
      this.videoRecorder.stop();
      this.setVideoRecordingState(section, false);
      this.stream?.getTracks().forEach((track) => track.stop());
      this.cdr.detectChanges();
    }
  }

  // Helper Methods
  private setRecordingState(section: 'Start' | 'End', state: boolean) {
    if (section === 'Start') {
      this.isRecordingStart = state;
    } else {
      this.isRecordingEnd = state;
    }
  }

  private setRecordedAudio(
    section: 'Start' | 'End',
    blob: Blob,
    url: string,
    file: File
  ) {
    if (section === 'Start') {
      this.audioBlobStart = blob;
      this.audioUrlStart = url;
      this.recordedAudioFileStart = file;
    } else {
      this.audioBlobEnd = blob;
      this.audioUrlEnd = url;
      this.recordedAudioFileEnd = file;
    }
  }

  private setVideoRecordingState(section: 'Start' | 'End', state: boolean) {
    if (section === 'Start') {
      this.isVideoRecordingStart = state;
    } else {
      this.isVideoRecordingEnd = state;
    }
  }

  private setRecordedVideo(
    section: 'Start' | 'End',
    blob: Blob,
    url: string,
    file: File
  ) {
    if (section === 'Start') {
      this.videoBlobStart = blob;
      this.videoUrlStart = url;
      this.recordedVideoFileStart = file;
    } else {
      this.videoBlobEnd = blob;
      this.videoUrlEnd = url;
      this.recordedVideoFileEnd = file;
    }
  }

  handleQrCodeResult(
    result: string,
    type: string,
    stage: 'Start' | 'End',
    index?: number
  ) {
    if (type === 'engine') {
      const payload = {
        SerialNo: result,
        PartCode: '001',
        Category: '001',
        // Stage: "4",
        Stage: stage === 'Start' ? '4' : '5',
        PCCode_Old: this.profitcenter_old,
        PCCode_Act: this.profitcenter_act,
        // this.userId === '0211'
        //   ? '01.004'
        //   : this.userId === '2236'
        //   ? '03.051'
        //   : this.userId === '110422'
        //   ? '28.001'
        //   : '',
      };

      this.dgAssemblyService.getAssemblyDetails(payload).subscribe(
        (response) => {
          console.log('Stage-III Api response', response);
          const data = response.MakerCheckerResult || response;

          if (stage === 'Start') this.engineScannedStart = true;
          if (stage === 'End') this.engineScannedEnd = true;

          // Assign values from MakerCheckerResult
          this.scanDetails[stage].engine = {
            qrSrNo: result,
            engDesc: data.EngPartDesc,
            engCode: data.EngPartCode,
          };

          const altDetails = data.AltDts.split('-->');
          this.scanDetails[stage].alternator = {
            qrSrNo: altDetails[0],
            altPart: altDetails[1],
            altDesc: altDetails[2],
            trStatus: altDetails[3],
          };

          const cpyDetails = data.Cpydts.split('-->');
          this.scanDetails[stage].canopy = {
            qrSrNo: cpyDetails[0],
            cpyPart: cpyDetails[1],
            cpyDesc: cpyDetails[2],
            cpyStk: cpyDetails[3],
          };

          if (data.BatCnt > 0 && data.BatDts) {
            this.scanDetails[stage].battery = Array.from(
              { length: data.BatCnt },
              (_, index) => {
                const key = index === 0 ? 'BatDts' : `Bat${index + 1}Dts`;
                const batDetails = data[key]
                  ? data[key].split('-->')
                  : [];
                return {
                  showQrScanner: false,
                  qrSrNo: batDetails.length > 0 ? batDetails[0] : '',
                  batteryPart: batDetails.length > 1 ? batDetails[1] : '',
                  batteryDesc: batDetails.length > 2 ? batDetails[2] : '',
                  stk: batDetails.length > 3 ? batDetails[3] : '',
                  trStatus: batDetails.length > 4 ? batDetails[4] : '',
                };
              }
            );
            if (stage === 'Start') {
              this.batteryScanDetailsStart = this.scanDetails[stage].battery;
              console.log(
                'BatteryDetails of Start Section',
                this.batteryScanDetailsStart
              );
            } else if (stage === 'End') {
              this.batteryScanDetailsEnd = this.scanDetails[stage].battery;
            }
          }

          const cpDetails = data.CPdts.split('-->');
          this.scanDetails[stage].controlPanel1 = {
            qrSrNo: cpDetails[0],
            cp1Part: cpDetails[1],
            cp1Desc: cpDetails[2],
            cp1TRStatus: cpDetails[3],
            cp1Stk: cpDetails[4],
          };

          const cp2Details = data.CP2dts.split('-->');
          this.scanDetails[stage].controlPanel2 = {
            qrSrNo: cp2Details[0],
            cp2Part: cp2Details[1],
            cp2Desc: cp2Details[2],
            cp2TRStatus: cp2Details[3],
            cp2Stk: cp2Details[4],
          };

          const krmDetails = data.KRMdts ? data.KRMdts.split('-->') : [];
          this.scanDetails[stage].krm = {
            qrSrNo: krmDetails[0] || '',
            krmPart: krmDetails[1] || '',
            krmDesc: krmDetails[2] || '',
          };

          this.pFbCode = data.PFBCode;
          this.panelType = data.PanelType;

          this.splitPanelType = data.PanelType.split('-->');

          if (stage === 'Start') {
            this.planNoStart = data.JobCode || '';
            this.dateStart = data.JobDt || '';
            this.dgDescStart = data.DgProductDesc || '';
            this.dgPartcodeStart = data.DgProductCode || '';
            this.dgKVAStart = data.KVA || '';
            this.DgstkStart = data.DGS4Stk ?? '';
            this.dgCPtypeStart = this.splitPanelType[0];
            this.dgKRMStart = data.KRM || '';
            const krmSrNo = this.scanDetails.Start.krm.qrSrNo;
            this.krmFoundStart = !!data.KRM && data.KRM !== 'NO' && !!krmSrNo && krmSrNo !== '0';
          } else if (stage === 'End') {
            this.planNoEnd = data.JobCode || '';
            this.dateEnd = data.JobDt || '';
            this.dgDescEnd = data.DgProductDesc || '';
            this.dgPartcodeEnd = data.DgProductCode || '';
            this.dgKVAEnd = data.KVA || '';
            this.DgstkEnd = data.DGS4Stk ?? '';
            this.dgCPtypeEnd = this.splitPanelType[0];
            this.dgKRMEnd = data.KRM || '';
            const krmSrNoEnd = this.scanDetails.End.krm.qrSrNo;
            this.krmFoundEnd = !!data.KRM && data.KRM !== 'NO' && !!krmSrNoEnd && krmSrNoEnd !== '0';
          }

          this.fetchDGkitDetails(this.dgPartcodeStart);
        },
        (error) => {
          console.error('Error in API call', error);
        }
      );

      this.showQrScannerEngineStart = false;
      this.showQrScannerEngineEnd = false;
    } else if (type === 'alternator') {
      if (stage === 'Start') {
        this.scannedQrResultAlternatorStart = result;
        this.showQrScannerAlternatorStart = false;
        const storedQrSrNo = this.scanDetails[stage]?.alternator?.qrSrNo;
        if (this.scannedQrResultAlternatorStart !== storedQrSrNo) {
          alert('Alternator Serial code does not match! Please check.');
        }
      } else {
        this.scannedQrResultAlternatorEnd = result;
        this.showQrScannerAlternatorEnd = false;
        const storedQrSrNo = this.scanDetails[stage]?.alternator?.qrSrNo;
        if (this.scannedQrResultAlternatorEnd !== storedQrSrNo) {
          alert('Alternator Serial code does not match! Please check.');
        }
      }
    } else if (type === 'canopy') {
      if (stage === 'Start') {
        this.scannedQrResultCanopyStart = result;
        this.showQrScannerCanopyStart = false;
        const storedQrSrNo = this.scanDetails[stage]?.canopy?.qrSrNo;
        if (this.scannedQrResultCanopyStart !== storedQrSrNo) {
          alert('Canopy Serial code does not match! Please check.');
        }
      } else {
        this.scannedQrResultCanopyEnd = result;
        this.showQrScannerCanopyEnd = false;
        const storedQrSrNo = this.scanDetails[stage]?.canopy?.qrSrNo;
        if (this.scannedQrResultCanopyEnd !== storedQrSrNo) {
          alert('Canopy Serial code does not match! Please check.');
        }
      }
    } else if (type === 'battery' && index !== undefined) {
      this[`scannedBatteryQrResults${stage}`][index] = result;
      this[`batteryScanDetails${stage}`][index].showQrScanner = false;

      const storedQrSrNo = this.scanDetails[stage]?.battery?.[index]?.qrSrNo;
      if (result !== storedQrSrNo) {
        alert(`Battery ${index + 1} Serial code does not match! Please check.`);
      }
    } else if (type === 'controlPanel1') {
      if (stage === 'Start') {

        this.scannedQrResultCP1Start = result;
        this.showQrScannerControlPanel1Start = false;
        const storedQrSrNo = this.scanDetails[stage]?.controlPanel1?.qrSrNo;
        if (this.scannedQrResultCP1Start !== storedQrSrNo) {
          alert('Control Panel 1 Serial code does not match! Please check.');
        }
      } else {
        this.scannedQrResultCP1End = result;
        this.showQrScannerControlPanel1End = false;
        const storedQrSrNo = this.scanDetails[stage]?.controlPanel1?.qrSrNo;
        if (this.scannedQrResultCP1End !== storedQrSrNo) {
          alert('Control Panel 1 Serial code does not match! Please check.');
        }
      }
    } else if (type === 'controlPanel2') {
      if (stage === 'Start') {
        this.scannedQrResultCP2Start = result;
        this.showQRScannerControlPanel2Start = false;
        const storedQrSrNo = this.scanDetails[stage]?.controlPanel2?.qrSrNo;
        if (this.scannedQrResultCP2Start !== storedQrSrNo) {
          alert('Control Panel 2 Serial code does not match! Please check.');
        }
      } else {
        this.scannedQrResultCP2End = result;
        this.showQRScannerControlPanel2End = false;
        const storedQrSrNo = this.scanDetails[stage]?.controlPanel2?.qrSrNo;
        if (this.scannedQrResultCP2End !== storedQrSrNo) {
          alert('Control Panel 2 Serial code does not match! Please check.');
        }
      }
    } else if (type === 'krm') {
      if (stage === 'Start') {
        this.scannedQrResultKRMStart = result;
        this.showQRScannerKRMStart = false;
        const storedQrSrNo = this.scanDetails[stage]?.krm?.qrSrNo;
        if (this.scannedQrResultKRMStart !== storedQrSrNo) {
          alert('KRM Serial code does not match! Please check.');
        }
      } else {
        this.scannedQrResultKRMEnd = result;
        this.showQRScannerKRMEnd = false;
        const storedQrSrNo = this.scanDetails[stage]?.krm?.qrSrNo;
        if (this.scannedQrResultKRMEnd !== storedQrSrNo) {
          alert('KRM Serial code does not match! Please check.');
        }
      }
    }
    console.log(`Scanned ${type} (${stage}):`, result);
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

  fetchDGkitDetails(PrdPartCode: string) {
    this.dgAssemblyService.getDGKitDetails(PrdPartCode, this.profitcenter_old, this.profitcenter_act).subscribe(
      (response) => {
        console.log('DGKitDetails API Response:', response);
        if (response && response.length > 0) {
          this.dgKitDetails = response; // Store API response
        } else {
        }
      },
      (error) => {
        console.error('Error Fetching DGKitDetails API Response :', error);
      }
    );
  }

  submitData() {
    if (this.selectedTab === 'Start') {
      this.submitStartData();
    } else if (this.selectedTab === 'End') {
      this.submitEndData();
    }
  }

  submitStartData() {
    console.log('Start Data Submitted:', this.scanDetails.Start);
    // Add API call or processing logic here
    const formData = new FormData();
    formData.append('JobCardCode', this.planNoStart);
    formData.append('EngSrNo', this.scanDetails.Start.engine.qrSrNo);
    formData.append('AltSrno', this.scanDetails.Start.alternator.qrSrNo);
    formData.append('Remark', 'Start');
    formData.append('StageNo', '4');
    formData.append('ProductCode', this.dgPartcodeStart);
     formData.append('PCCode_Old', this.profitcenter_old);
    formData.append('PCCode_Act', this.profitcenter_act);
    // if (this.userId == '0211') {
    //   formData.append('PCCode', '01.004');
    // } else if (this.userId == '2236') {
    //   formData.append('PCCode', '03.051');
    // } else {
    //   formData.append('PCCode', '28.001');
    // }
    formData.append('EngPartCode', this.scanDetails.Start.engine.engCode);
    formData.append('AltPartcode', this.scanDetails.Start.alternator.altPart);
    formData.append('CpySrno', this.scanDetails.Start.canopy.qrSrNo);
    formData.append('CpyPartcode', this.scanDetails.Start.canopy.cpyPart);
    this.batteryScanDetailsStart.forEach((battery, index) => {
      const srNoKey = index === 0 ? 'BatSrno' : `Bat${index + 1}Srno`;
      const partCodeKey =
        index === 0 ? 'BatPartcode' : `Bat${index + 1}Partcode`;

      formData.append(srNoKey, battery.qrSrNo || '');
      formData.append(partCodeKey, battery.batteryPart || '');
    });
    formData.append('CPType', this.panelType);
    formData.append('CPSrno', this.scanDetails.Start.controlPanel1.qrSrNo);
    formData.append('CPPartcode', this.scanDetails.Start.controlPanel1.cp1Part);
    formData.append('CP2Srno', this.scanDetails.Start.controlPanel2.qrSrNo);
    formData.append(
      'CP2Partcode',
      this.scanDetails.Start.controlPanel2.cp2Part
    );
    formData.append('KRMSrno', this.scanDetails.Start.krm.qrSrNo);
    formData.append('KRMPartcode', this.scanDetails.Start.krm.krmPart);
    let extractedData = this.dgKitDetails.map((item) => ({
      PartCode: item.PartCode,
      KITQty: item.Qty,
      StockQty: item.StockQty,
      TotalQty: item.TotalQty,
      PFBRate: item.Rate,
    }));

    let DGKitDetailJson = JSON.stringify(extractedData);
    //console.log(DGKitDetailJson);
    formData.append('DGKitDetailJson', DGKitDetailJson);

    console.log('Submitting Stage Start Details', formData);

    this.dgAssemblyService.submitStage4Data(formData).subscribe(
      (response: any) => {
        const warningMessages = [
          'Please Scan Engine SerialNo',
          'Please Scan Alternator SerialNo',
          'Please Scan Canopy SerialNo',
          'Please Scan Control Panel(1) SerialNo',
          'Please Scan Battery(1) SerialNo',
          'DG Rate Cannot Be Zero Please Contact CIA/Document Control Dept',
          'Control Panel Rate Cannot Be Zero Please Contact CIA/DOcument Control Dept',
          'Please Scan Control Panel(2) SerialNo',
          'Control Panel(2) Rate Cannot Be Zero Please Contact CIA/DOcument Control Dept',
          'DG Serial No Creation Problem',
        ];

        if (
          warningMessages.includes(response.Message) ||
          response.Message.startsWith('Insufficient Stock For Part')
        ) {
          this.warningMessage = response.Message; // Show the whole message
        } else {
          this.successMessage = response.Message;
        }
      },
      (error: any) => {
        console.error('API Error Response:', error);
        // Extracting Jobcard and Engine Serial from the error message
        this.errorMessage =
          error.error || 'Failed to submit data. Please try again.';
        console.log('Error Message from API:', this.errorMessage);
        // Extracting Jobcard and Engine Serial from the error message
        const jobcardMatch = this.errorMessage.match(/Jobcard:-\s*([\w\/-]+)/);
        const engSerialMatch = this.errorMessage.match(
          /Eng Serial No:-\s*([\w.\/-]+)/
        );

        this.extractedJobcard = jobcardMatch ? jobcardMatch[1] : 'N/A';
        this.extractedEngSerial = engSerialMatch ? engSerialMatch[1] : 'N/A';

        this.showError(this.errorMessage);
      }
    );
  }

  submitEndData() {
    console.log('End Data Submitted:', this.scanDetails.End);
    // Add API call or processing logic here
    const fetchedCheckPoints = this.fetchCheckPointDataFromUI();
    const formdata = new FormData();

    formdata.append('Remark', 'End');
    formdata.append('EngSrNo', this.scanDetails.End.engine.qrSrNo);
    formdata.append('StageNo', '4');
    formdata.append('PfbCode', this.pFbCode);
    formdata.append('JobCardCode', this.planNoEnd);
    if (fetchedCheckPoints.length > 0) {
      formdata.append('PrcChkDtsJson', JSON.stringify(fetchedCheckPoints));
    }
    if (this.selectedSixMItem) {
      formdata.append('QA6M', this.selectedSixMItem);
    }
    if (this.selectedOption) {
      formdata.append('PrcStatus', this.selectedOption);
    }
    if (this.recordedAudioFileEnd) {
      formdata.append('RecordedAudioFile', this.recordedAudioFileEnd);
    }
    if (this.recordedVideoFileEnd) {
      formdata.append('RecordedVideoFile', this.recordedVideoFileEnd);
    }

    this.dgAssemblyService.submitStage4Data(formdata).subscribe(
      (response: any) => {
        console.log('API Success Response:', response);
        this.successMessage = response.Message;
      },
      (error: any) => {
        console.error('API Error Response:', error);
        // Extracting Jobcard and Engine Serial from the error message
        this.errorMessage =
          error.error || 'Failed to submit data. Please try again.';
        console.log('Error Message from API:', this.errorMessage);
        // // Extracting Jobcard and Engine Serial from the error message
        // const jobcardMatch = this.errorMessage.match(/Jobcard:-\s*([\w\/-]+)/);
        // const engSerialMatch = this.errorMessage.match(/Eng Serial No:-\s*([\w.\/-]+)/);

        // this.extractedJobcard = jobcardMatch ? jobcardMatch[1] : "N/A";
        // this.extractedEngSerial = engSerialMatch ? engSerialMatch[1] : "N/A";

        this.showError(this.errorMessage);
      }
    );
  }

  isSaveDisabled(): boolean {
    if (this.selectedTab === 'Start') {
      return !this.areAllStartComponentsValid();
    } else if (this.selectedTab === 'End') {
      return !this.areAllEndComponentsValid();
    }
    return true;
  }

  // ==================== START TAB VALIDATIONS ====================

  areAllStartComponentsValid(): boolean {
    const engineValid = this.isEngineValidStart();
    const alternatorValid = this.isAlternatorValidStart();
    const canopyValid = this.isCanopyValidStart();
    const batteriesValid = this.areBatteriesValidStart();
    const cp1Valid = this.isControlPanel1ValidStart();
    const cp2Valid = this.isControlPanel2ValidStart();
    const krmValid = this.isKRMValidStart();

    console.log('Start Validation:', { engineValid, alternatorValid, canopyValid, batteriesValid, cp1Valid, cp2Valid, krmValid, krmFoundStart: this.krmFoundStart });

    return (
      engineValid &&
      alternatorValid &&
      canopyValid &&
      batteriesValid &&
      cp1Valid &&
      cp2Valid &&
      krmValid
    );
  }

  // Engine - Required (turns green when qrSrNo exists)
  isEngineValidStart(): boolean {
    return !!this.scanDetails?.Start?.engine?.qrSrNo;
  }

  // Alternator - Required (turns green when matches)
  isAlternatorValidStart(): boolean {
    return (
      !!this.scanDetails?.Start?.alternator?.qrSrNo &&
      this.scannedQrResultAlternatorStart ===
        this.scanDetails.Start.alternator.qrSrNo
    );
  }

  // Canopy - Required (turns green when matches)
  isCanopyValidStart(): boolean {
    return (
      !!this.scanDetails?.Start?.canopy?.qrSrNo &&
      this.scannedQrResultCanopyStart === this.scanDetails.Start.canopy.qrSrNo
    );
  }

  // Batteries - Optional, but must be green if scanned
  areBatteriesValidStart(): boolean {
    if (
      !this.batteryScanDetailsStart ||
      this.batteryScanDetailsStart.length === 0
    ) {
      return true; // No batteries = valid (optional)
    }

    for (let i = 0; i < this.batteryScanDetailsStart.length; i++) {
      const battery = this.batteryScanDetailsStart[i];

      // Validate if battery row is real (has serial + part + desc).
      // stk is no longer required — current API doesn't include it in BatDts.
      if (
        battery.qrSrNo &&
        battery.batteryPart &&
        battery.batteryDesc
      ) {
        // Battery must be green (scanned result matches)
        if (this.scannedBatteryQrResultsStart[i] !== battery.qrSrNo) {
          return false; // Battery exists but not valid
        }
      }
    }

    return true; // All scanned batteries are valid
  }

  // Control Panel 1 - Required ONLY if visible (qrSrNo present and not '0')
  isControlPanel1ValidStart(): boolean {
    if (!this.isControlPanel1Visible('Start')) return true;
    return (
      !!this.scanDetails?.Start?.controlPanel1?.qrSrNo &&
      this.scannedQrResultCP1Start ===
        this.scanDetails.Start.controlPanel1.qrSrNo
    );
  }

  // Control Panel 2 - Required ONLY if visible (currently always optional)
  isControlPanel2ValidStart(): boolean {
    if (!this.isControlPanel2Visible('Start')) return true;
    return true; // Still treated as optional even when visible
  }

  // KRM - Required only if KRM found AND has valid serial to scan
  isKRMValidStart(): boolean {
    if (!this.krmFoundStart) return true;
    if (!this.isKRMVisible('Start')) return true;
    return (
      !!this.scanDetails?.Start?.krm?.qrSrNo &&
      this.scannedQrResultKRMStart === this.scanDetails.Start.krm.qrSrNo
    );
  }

  // ==================== END TAB VALIDATIONS ====================

  areAllEndComponentsValid(): boolean {
    const engineValid = this.isEngineValidEnd();
    const alternatorValid = this.isAlternatorValidEnd();
    const canopyValid = this.isCanopyValidEnd();
    const batteriesValid = this.areBatteriesValidEnd();
    const cp1Valid = this.isControlPanel1ValidEnd();
    const cp2Valid = this.isControlPanel2ValidEnd(); // Optional - IGNORED
    const krmValid = this.isKRMValidEnd(); // REQUIRED

    return (
      engineValid &&
      alternatorValid &&
      canopyValid &&
      batteriesValid &&
      cp1Valid &&
      cp2Valid &&
      krmValid
    );
  }

  // Engine - Required (turns green when qrSrNo exists)
  isEngineValidEnd(): boolean {
    return !!this.scanDetails?.End?.engine?.qrSrNo;
  }

  // Alternator - Required (turns green when matches)
  isAlternatorValidEnd(): boolean {
    return (
      !!this.scanDetails?.End?.alternator?.qrSrNo &&
      this.scannedQrResultAlternatorEnd ===
        this.scanDetails.End.alternator.qrSrNo
    );
  }

  // Canopy - Required (turns green when matches)
  isCanopyValidEnd(): boolean {
    return (
      !!this.scanDetails?.End?.canopy?.qrSrNo &&
      this.scannedQrResultCanopyEnd === this.scanDetails.End.canopy.qrSrNo
    );
  }

  // Batteries - Optional, but must be green if scanned
  areBatteriesValidEnd(): boolean {
    if (
      !this.batteryScanDetailsEnd ||
      this.batteryScanDetailsEnd.length === 0
    ) {
      return true; // No batteries = valid (optional)
    }

    for (let i = 0; i < this.batteryScanDetailsEnd.length; i++) {
      const battery = this.batteryScanDetailsEnd[i];

      // Validate if battery row is real (has serial + part + desc).
      // stk is no longer required — current API doesn't include it in BatDts.
      if (
        battery.qrSrNo &&
        battery.batteryPart &&
        battery.batteryDesc
      ) {
        // Battery must be green (scanned result matches)
        if (this.scannedBatteryQrResultsEnd[i] !== battery.qrSrNo) {
          return false; // Battery exists but not valid
        }
      }
    }

    return true; // All scanned batteries are valid
  }

  // Control Panel 1 - Required (turns green when matches)
  // isControlPanel1ValidEnd(): boolean {
  //   return (
  //     !!this.scanDetails?.End?.controlPanel1?.qrSrNo &&
  //     this.scannedQrResultCP1End === this.scanDetails.End.controlPanel1.qrSrNo
  //   );
  // }

  // Control Panel 1 - OPTIONAL (always returns true - IGNORED as per requirement)
  isControlPanel1ValidEnd(): boolean {
    return true; // Completely ignored for save validation
  }

  // Control Panel 2 - OPTIONAL (always returns true - IGNORED as per requirement)
  isControlPanel2ValidEnd(): boolean {
    return true; // Completely ignored for save validation
  }

  isControlPanel1Visible(stage: 'Start' | 'End'): boolean {
    const cp = this.scanDetails[stage].controlPanel1;
    return !!cp.qrSrNo && cp.qrSrNo !== '0';
  }

  isControlPanel2Visible(stage: 'Start' | 'End'): boolean {
    const cp = this.scanDetails[stage].controlPanel2;
    return !!cp.qrSrNo && cp.qrSrNo !== '0';
  }

  isEngineScanned(stage: 'Start' | 'End'): boolean {
    return stage === 'Start' ? this.engineScannedStart : this.engineScannedEnd;
  }

  isKRMVisible(stage: 'Start' | 'End'): boolean {
    const krm = this.scanDetails[stage].krm;
    return !!krm.qrSrNo && krm.qrSrNo !== '0';
  }

  // KRM - Required only if KRM found AND has valid serial to scan
  isKRMValidEnd(): boolean {
    if (!this.krmFoundEnd) return true;
    if (!this.isKRMVisible('End')) return true;
    return (
      !!this.scanDetails?.End?.krm?.qrSrNo &&
      this.scannedQrResultKRMEnd === this.scanDetails.End.krm.qrSrNo
    );
  }
}
