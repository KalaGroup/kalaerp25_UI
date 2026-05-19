import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, QueryList, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { BarcodeFormat } from '@zxing/browser';
import { ChangeDetectorRef } from '@angular/core';
import { DgStageIIService } from './dg-stage-ii-service.service';
import { Inject } from '@angular/core';
import { JwtAuthService } from 'app/shared/services/auth/jwt-auth.service';

@Component({
    selector: 'app-dg-stage-ii',
    templateUrl: './dg-stage-ii.component.html',
    styleUrl: './dg-stage-ii.component.scss',
    standalone: false
})
export class DgStageIIComponent implements OnInit, OnDestroy {
  userId: string = '';
  password: string = '';
  profitcenter_old: string = '';
  profitcenter_act: string = '';

  selectedOption: string = '';
  scannedQrResult: any;
  errorMessage: string = '';
  extractedJobcard: string = '';
  extractedEngSerial: string = '';
  successMessage: string = '';
  showQrScannerEngineEnd: boolean = false;
  showQrScannerAlternatorEnd: boolean = false;
  showQrScannerCanopy: boolean = false;
  showQrScannerBattery: boolean = false;
  showQrScannerBattery2: boolean = false;
  allowedFormats = [BarcodeFormat.QR_CODE];
  scannerType:
    | 'engine'
    | 'alternator'
    | 'canopy'
    | 'battery'
    | 'battery2'
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
  selectedSixMItem: string | null = null;
  apiResponse: any;
  selectedTabIndex: number = 0;
  sixMOptions: any[] = []; // Stores select6M API response for dropdown
  processCheckpoints: any[] = []; // for assign process checkpoint to you dynamically
  isDropdownOpen = false;
  isSecondDropdownOpen = false;
  selectedItem: string = 'Select an option';
  dropdownOptions: string[] = ['Rework', 'Accepted(OK)'];
  recordedAudioFile: File | null = null;
  recordedVideoFile: File | null = null;
  batteryScanDetails: any[] = [];

  scannedQrResultAlternator: string = '';
  scannedQrResultCanopy: string = '';
  scannedBatteryQrResults: string[] = ['', '', '', ''];

  engineScanDetails: { qrSrNo: string; engDesc: string; engCode: string } = {
    qrSrNo: '',
    engDesc: '',
    engCode: '',
  };

  alternatorScanDetails: {
    qrSrNo: string;
    altDesc: string;
    altPart: string;
    trStatus: string;
  } = {
    qrSrNo: '',
    altDesc: '',
    altPart: '',
    trStatus: '',
  };

  canopyScandetails: {
    qrSrNo: string;
    cpyDesc: string;
    cpyPart: string;
    cpyStk: string;
  } = {
    qrSrNo: '',
    cpyDesc: '',
    cpyPart: '',
    cpyStk: '',
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

  // Video Recording Variables
  isVideoRecording = false;
  isVideoClipVisible = false;
  private videoRecorder!: MediaRecorder;
  private videoChunks: Blob[] = [];
  videoBlob: Blob | null = null;
  videoUrl: string | null = null;

  planNo: string = '';
  date: string = '';
  dgDesc: string = '';
  dgPartcode: string = '';
  dgKVA: string = '';
  Dgstk: string = '';
  oldCpyStk: string = '';
  oldBatteryStks: string[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private dgAssemblyService: DgStageIIService,
    private authService: JwtAuthService
  ) {}

  showError(message: string) {
    this.errorMessage = message;
  }
  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
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
    const wasOpen = {
      eng: this.showQrScannerEngineEnd,
      alt: this.showQrScannerAlternatorEnd,
      canopy: this.showQrScannerCanopy,
      battery: this.batteryScanDetails.map((b) => !!b?.showQrScanner),
    };
    const anyOpen =
      wasOpen.eng ||
      wasOpen.alt ||
      wasOpen.canopy ||
      wasOpen.battery.some(Boolean);
    if (!anyOpen) {
      this.cdr.detectChanges();
      return;
    }
    this.showQrScannerEngineEnd = false;
    this.showQrScannerAlternatorEnd = false;
    this.showQrScannerCanopy = false;
    this.batteryScanDetails.forEach((b) => {
      if (b) b.showQrScanner = false;
    });
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showQrScannerEngineEnd = wasOpen.eng;
      this.showQrScannerAlternatorEnd = wasOpen.alt;
      this.showQrScannerCanopy = wasOpen.canopy;
      wasOpen.battery.forEach((open, i) => {
        if (this.batteryScanDetails[i]) this.batteryScanDetails[i].showQrScanner = open;
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
  onHidScan(input: HTMLInputElement, type: string, index?: number): void {
    const value = (input.value || '').trim();
    input.value = '';
    console.log('[RUGTEK] hidden-input scan:', value, type, index);
    if (!value) return;
    this.handleQrCodeResult1(value, type, index);
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
    return (
      this.showQrScannerEngineEnd ||
      this.showQrScannerAlternatorEnd ||
      this.showQrScannerCanopy ||
      this.batteryScanDetails.some((b) => !!b?.showQrScanner)
    );
  }

  private dispatchHidScan(value: string): void {
    if (this.showQrScannerEngineEnd) {
      this.handleQrCodeResult1(value, 'engine');
    } else if (this.showQrScannerAlternatorEnd) {
      this.handleQrCodeResult1(value, 'alternator');
    } else if (this.showQrScannerCanopy) {
      this.handleQrCodeResult1(value, 'canopy');
    } else {
      const idx = this.batteryScanDetails.findIndex((b) => !!b?.showQrScanner);
      if (idx >= 0) this.handleQrCodeResult1(value, 'battery', idx);
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

  onScanEngineClick1() {
    this.showQrScannerEngineEnd = !this.showQrScannerEngineEnd;
    if (this.showQrScannerEngineEnd) {
      this.showQrScannerAlternatorEnd = false;
      this.showQrScannerCanopy = false;
      this.batteryScanDetails.forEach(
        (battery) => (battery.showQrScanner = false)
      );
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanAlternatorClick1() {
    this.showQrScannerAlternatorEnd = !this.showQrScannerAlternatorEnd;
    if (this.showQrScannerAlternatorEnd) {
      this.showQrScannerEngineEnd = false;
      this.showQrScannerCanopy = false;
      this.batteryScanDetails.forEach(
        (battery) => (battery.showQrScanner = false)
      );
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanCanopyClick() {
    this.showQrScannerCanopy = !this.showQrScannerCanopy;
    if (this.showQrScannerCanopy) {
      this.showQrScannerEngineEnd = false;
      this.showQrScannerAlternatorEnd = false;
      this.batteryScanDetails.forEach(
        (battery) => (battery.showQrScanner = false)
      );
      this.cameraStatus = 'init';
    }
    this.focusActiveHidInput();
  }

  onScanBatteryClick(index: number): void {
    this.batteryScanDetails[index].showQrScanner =
      !this.batteryScanDetails[index].showQrScanner;
    if (this.batteryScanDetails[index].showQrScanner) {
      this.showQrScannerEngineEnd = false;
      this.showQrScannerAlternatorEnd = false;
      this.showQrScannerCanopy = false;
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

    const stageName = 'DG Stage2'; // Static stage name
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

  handleQrCodeResult1(result: string, type: string, index?: number) {
    if (type === 'engine') {
      const payload = {
        SerialNo: result,
        PartCode: '001',
        Category: '001',
        Stage: '3',
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
          try {
            console.log('Stage 2 ScanDetails', response);
            const data = response.MakerCheckerResult || response;
            const oldData = response.OldResult || response;

            this.engineScanDetails = {
              qrSrNo: result,
              engDesc: data.EngPartDesc,
              engCode: data.EngPartCode,
            };

            const altDetails = data.AltDts.split('-->');
            this.alternatorScanDetails = {
              qrSrNo: altDetails[0],
              altPart: altDetails[1],
              altDesc: altDetails[2],
              trStatus: altDetails[3],
            };

            const cpyDetails = data.Cpydts.split('-->');
            this.canopyScandetails = {
              qrSrNo: cpyDetails[0],
              cpyPart: cpyDetails[1],
              cpyDesc: cpyDetails[2],
              cpyStk: cpyDetails[3],
            };

            // Old canopy stk from OldResult
            const oldCpyDetails = oldData.Cpydts ? oldData.Cpydts.split('-->') : [];
            this.oldCpyStk = oldCpyDetails[3] || '';

            if (data.BatCnt > 0) {
              this.batteryScanDetails = Array.from(
                { length: data.BatCnt },
                (_, index) => {
                  const key = index === 0 ? 'BatDts' : `Bat${index + 1}Dts`;
                  const batDetails = data[key]?.split('-->') || [];

                  return {
                    showQrScanner: false,
                    qrSrNo: batDetails[0] || '',
                    batteryPart: batDetails[1] || '',
                    batteryDesc: batDetails[2] || '',
                    stk: batDetails[3] || '',
                    trStatus: batDetails[4] || '',
                  };
                }
              );

              // Old battery stks from OldResult
              this.oldBatteryStks = Array.from(
                { length: data.BatCnt },
                (_, index) => {
                  const key = index === 0 ? 'BatDts' : `Bat${index + 1}Dts`;
                  const oldBatDetails = oldData[key]?.split('-->') || [];
                  return oldBatDetails[3] || '';
                }
              );
            }

            this.planNo = data.JobCode || '';
            this.date = data.JobDt || '';
            this.dgDesc = data.DgProductDesc || '';
            this.dgPartcode = data.DgProductCode || '';
            this.dgKVA = data.KVA || '';
            this.Dgstk = data.DGS3Stk || '';
          } catch (e) {
            console.error('Error parsing Stage 2 response, falling back to flat response:', e);
            // Fallback: revert to legacy flat-response handling if parsing fails
            this.engineScanDetails = {
              qrSrNo: result,
              engDesc: response.EngPartDesc,
              engCode: response.EngPartCode,
            };
            const altDetails = (response.AltDts || '').split('-->');
            this.alternatorScanDetails = {
              qrSrNo: altDetails[0] || '',
              altPart: altDetails[1] || '',
              altDesc: altDetails[2] || '',
              trStatus: altDetails[3] || '',
            };
            const cpyDetails = (response.Cpydts || '').split('-->');
            this.canopyScandetails = {
              qrSrNo: cpyDetails[0] || '',
              cpyPart: cpyDetails[1] || '',
              cpyDesc: cpyDetails[2] || '',
              cpyStk: cpyDetails[3] || '',
            };
            this.oldCpyStk = '';
            this.oldBatteryStks = [];
            this.planNo = response.JobCode || '';
            this.date = response.JobDt || '';
            this.dgDesc = response.DgProductDesc || '';
            this.dgPartcode = response.DgProductCode || '';
            this.dgKVA = response.KVA || '';
            this.Dgstk = response.DGS3Stk || '';
          }
        },
        (error) => {
          console.error('Error in API call', error);
        }
      );

      this.showQrScannerEngineEnd = false;
    } else if (type === 'alternator') {
      this.scannedQrResultAlternator = result;
      this.showQrScannerAlternatorEnd = false;
      if (
        this.scannedQrResultAlternator !== this.alternatorScanDetails.qrSrNo
      ) {
        alert('Alternator Serial code does not match! Please check.');
      }
    } else if (type === 'canopy') {
      this.scannedQrResultCanopy = result;
      this.showQrScannerCanopy = false;
      if (this.scannedQrResultCanopy !== this.canopyScandetails.qrSrNo) {
        alert('Canopy Serial code does not match! Please check.');
      }
    } else if (type === 'battery' && index !== undefined) {
      this.scannedBatteryQrResults[index] = result;
      this.batteryScanDetails[index].showQrScanner = false;
      //const storedQrSrNo = this.batteryScanDetails[index].qrSrNo;
      if (result !== this.batteryScanDetails[index].qrSrNo) {
        alert(`Battery ${index + 1} Serial code does not match! Please check.`);
      }
    }

    console.log(`Scanned ${type}:`, result);
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

  submitData() {
    const fetchedCheckPoints = this.fetchCheckPointDataFromUI();
    const formData = new FormData();
    formData.append('JBCode', this.planNo);
    formData.append('EngSrNo', this.engineScanDetails.qrSrNo);
    formData.append('AltSrno', this.alternatorScanDetails.qrSrNo);
    formData.append('StageNo', '3');
    formData.append('ProductCode', this.dgPartcode);
    formData.append('PCCode_Old', this.profitcenter_old);
    formData.append('PCCode_Act', this.profitcenter_act);
    // if (this.userId == '0211') {
    //   formData.append('PCCode', '01.004');
    // } else if (this.userId == '2236') {
    //   formData.append('PCCode', '03.051');
    // } else {
    //   formData.append('PCCode', '28.001');
    // }
    formData.append('EngPartCode', this.engineScanDetails.engCode);
    formData.append('AltPartcode', this.alternatorScanDetails.altPart);
    formData.append('CpySrno', this.canopyScandetails.qrSrNo);
    formData.append('CpyPartcode', this.canopyScandetails.cpyPart);

    this.batteryScanDetails.forEach((battery, index) => {
      const srNoKey = index === 0 ? 'BatSrno' : `Bat${index + 1}Srno`;
      const partCodeKey =
        index === 0 ? 'BatPartcode' : `Bat${index + 1}Partcode`;

      formData.append(srNoKey, battery.qrSrNo || '');
      formData.append(partCodeKey, battery.batteryPart || '');
    });

      formData.append('QA6M', this.selectedSixMItem || '0');

    if (this.selectedOption) {
      formData.append('PrcStatus', this.selectedOption);
    }
    if (fetchedCheckPoints.length > 0) {
      formData.append('PrcChkDtsJson', JSON.stringify(fetchedCheckPoints));
    }
    if (this.recordedAudioFile) {
      formData.append('RecordedAudioFile', this.recordedAudioFile);
    }
    if (this.recordedVideoFile) {
      formData.append('RecordedVideoFile', this.recordedVideoFile);
    }

    this.dgAssemblyService.submitAssemblyData(formData).subscribe(
      (response: any) => {
        console.log('API Success Response:', response);
        this.successMessage = 'Stage II Completed Successfully..!';
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

  // In your Stage II component.ts file

  isSaveDisabled(): boolean {
    // Required validations
    const engineValid = this.isEngineScannedSuccessfully();
    const alternatorValid = this.isAlternatorScannedSuccessfully();
    const canopyValid = this.isCanopyScannedSuccessfully();

    // Battery validation - optional but must be valid if scanned
    const batteryValid = this.areBatteriesValid();

    // Stk mismatch checks (only if old stk values are present)
    const cpyStkMismatch = !!this.oldCpyStk && this.canopyScandetails.cpyStk != this.oldCpyStk;
    const batStkMismatch = this.batteryScanDetails.some((bat, i) =>
      this.oldBatteryStks[i] && bat.stk != this.oldBatteryStks[i]
    );

    return !engineValid || !alternatorValid || !canopyValid || !batteryValid || cpyStkMismatch || batStkMismatch;
  }

  // Engine turns green when qrSrNo exists
  isEngineScannedSuccessfully(): boolean {
    return !!this.engineScanDetails?.qrSrNo;
  }

  // Alternator turns green when scannedQrResultAlternator matches qrSrNo
  isAlternatorScannedSuccessfully(): boolean {
    return (
      !!this.alternatorScanDetails?.qrSrNo &&
      this.scannedQrResultAlternator === this.alternatorScanDetails.qrSrNo
    );
  }

  // Canopy turns green when scannedQrResultCanopy matches qrSrNo
  isCanopyScannedSuccessfully(): boolean {
    return (
      !!this.canopyScandetails?.qrSrNo &&
      this.scannedQrResultCanopy === this.canopyScandetails.qrSrNo
    );
  }

  // Batteries are optional, but if any are scanned, they must be valid (green)
  areBatteriesValid(): boolean {
    // If no batteries at all, return true (optional)
    if (!this.batteryScanDetails || this.batteryScanDetails.length === 0) {
      return true;
    }

    // Check each battery
    for (let i = 0; i < this.batteryScanDetails.length; i++) {
      const battery = this.batteryScanDetails[i];

      // If battery has qrSrNo (has been scanned), it must match scannedBatteryQrResults
      if (battery.qrSrNo) {
        // Battery must be green (scanned result matches)
        if (this.scannedBatteryQrResults[i] !== battery.qrSrNo) {
          return false; // Battery scanned but not valid (not green)
        }
      }
      // If battery.qrSrNo is empty/null, it's not scanned yet - that's OK (optional)
    }

    return true; // All scanned batteries are valid
  }
}
