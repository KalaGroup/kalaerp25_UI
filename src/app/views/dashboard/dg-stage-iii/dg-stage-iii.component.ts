import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { BarcodeFormat } from '@zxing/browser';
import { ChangeDetectorRef } from '@angular/core';
import { DgStageIIIService } from './dg-stage-iii-service.service';
import { Inject } from '@angular/core';
import { JwtAuthService } from 'app/shared/services/auth/jwt-auth.service';

@Component({
  selector: 'app-dg-stage-iii',
  templateUrl: './dg-stage-iii.component.html',
  styleUrl: './dg-stage-iii.component.scss',
})
export class DgStageIIIComponent implements OnInit {
  userId: string = '';
  profitcenter: string = '';

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

  allowedFormats = [BarcodeFormat.QR_CODE];
  scannerType:
    | 'engine'
    | 'alternator'
    | 'canopy'
    | 'controlPanel1'
    | 'controlPanel2'
    | null = null;
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

  //for End Section
  planNoEnd: string = '';
  dateEnd: string = '';
  dgDescEnd: string = '';
  dgPartcodeEnd: string = '';
  dgKVAEnd: string = '';
  DgstkEnd: string = '';
  dgCPtypeEnd: string = '';
  dgKRMEnd: string = '';

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
    const pccode = localStorage.getItem('ProfitCenter');
    if (pccode) {
      this.profitcenter = pccode;
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
        PCCode: this.profitcenter,
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

          // Assign values to the common object
          this.scanDetails[stage].engine = {
            qrSrNo: result,
            engDesc: response.EngPartDesc,
            engCode: response.EngPartCode,
          };

          const altDetails = response.AltDts.split('-->');
          this.scanDetails[stage].alternator = {
            qrSrNo: altDetails[0],
            altPart: altDetails[1],
            altDesc: altDetails[2],
            trStatus: altDetails[3],
          };

          const cpyDetails = response.Cpydts.split('-->');
          this.scanDetails[stage].canopy = {
            qrSrNo: cpyDetails[0],
            cpyPart: cpyDetails[1],
            cpyDesc: cpyDetails[2],
            cpyStk: cpyDetails[3],
          };

          if (response.BatCnt > 0 && response.BatDts) {
            this.scanDetails[stage].battery = Array.from(
              { length: response.BatCnt },
              (_, index) => {
                const key = index === 0 ? 'BatDts' : `Bat${index + 1}Dts`;
                const batDetails = response[key]
                  ? response[key].split('-->')
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

          const cpDetails = response.CPdts.split('-->');
          this.scanDetails[stage].controlPanel1 = {
            qrSrNo: cpDetails[0],
            cp1Part: cpDetails[1],
            cp1Desc: cpDetails[2],
            cp1TRStatus: cpDetails[3],
            cp1Stk: cpDetails[4],
          };

          const cp2Details = response.CP2dts.split('-->');
          this.scanDetails[stage].controlPanel2 = {
            qrSrNo: cp2Details[0],
            cp2Part: cp2Details[1],
            cp2Desc: cp2Details[2],
            cp2TRStatus: cp2Details[3],
            cp2Stk: cp2Details[4],
          };

          const krmDetails = response.KRMdts.split('-->');
          this.scanDetails[stage].krm = {
            qrSrNo: krmDetails[0],
            krmPart: krmDetails[1],
            krmDesc: krmDetails[2],
          };

          this.pFbCode = response.PFBCode;
          this.panelType = response.PanelType;

          this.splitPanelType = response.PanelType.split('-->');

          if (stage === 'Start') {
            this.planNoStart = response.JobCode || '';
            this.dateStart = response.JobDt || '';
            this.dgDescStart = response.DgProductDesc || '';
            this.dgPartcodeStart = response.DgProductCode || '';
            this.dgKVAStart = response.KVA || '';
            this.DgstkStart = response.DGS4Stk ?? '';
            this.dgCPtypeStart = this.splitPanelType[0];
            this.dgKRMStart = response.KRM || '';
          } else if (stage === 'End') {
            this.planNoEnd = response.JobCode || '';
            this.dateEnd = response.JobDt || '';
            this.dgDescEnd = response.DgProductDesc || '';
            this.dgPartcodeEnd = response.DgProductCode || '';
            this.dgKVAEnd = response.KVA || '';
            this.DgstkEnd = response.DGS4Stk ?? '';
            this.dgCPtypeEnd = this.splitPanelType[0];
            this.dgKRMEnd = response.KRM || '';
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
        debugger;
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
   // const PCCode = '01.004';
    const PCCode = this.profitcenter;
    this.dgAssemblyService.getDGKitDetails(PrdPartCode, PCCode).subscribe(
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
    formData.append('PCCode', this.profitcenter);
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
    if (this.recordedAudioFile) {
      formdata.append('RecordedAudioFile', this.recordedAudioFileEnd);
    }
    if (this.recordedVideoFile) {
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
    const cp2Valid = this.isControlPanel2ValidStart(); // Optional - IGNORED
    const krmValid = this.isKRMValidStart(); // REQUIRED

    // Required: Engine, Alternator, Canopy, Control Panel 1, KRM
    // Optional but must be green if scanned: Batteries
    // Ignored: Control Panel 2
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

      // Only validate if battery exists and has valid data (not stk='0')
      if (
        battery.qrSrNo &&
        battery.batteryPart &&
        battery.batteryDesc &&
        battery.stk &&
        battery.stk !== '0'
      ) {
        // Battery must be green (scanned result matches)
        if (this.scannedBatteryQrResultsStart[i] !== battery.qrSrNo) {
          return false; // Battery exists but not valid
        }
      }
    }

    return true; // All scanned batteries are valid
  }

  // Control Panel 1 - Required (turns green when matches)
  isControlPanel1ValidStart(): boolean {
    return (
      !!this.scanDetails?.Start?.controlPanel1?.qrSrNo &&
      this.scannedQrResultCP1Start ===
        this.scanDetails.Start.controlPanel1.qrSrNo
    );
  }

  // Control Panel 2 - OPTIONAL (always returns true - IGNORED as per requirement)
  isControlPanel2ValidStart(): boolean {
    return true; // Completely ignored for save validation
  }

  // KRM - REQUIRED (must be green)
  isKRMValidStart(): boolean {
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

      // Only validate if battery exists and has valid data (not stk='0')
      if (
        battery.qrSrNo &&
        battery.batteryPart &&
        battery.batteryDesc &&
        battery.stk &&
        battery.stk !== '0'
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

  // KRM - REQUIRED (must be green)
  isKRMValidEnd(): boolean {
    return (
      !!this.scanDetails?.End?.krm?.qrSrNo &&
      this.scannedQrResultKRMEnd === this.scanDetails.End.krm.qrSrNo
    );
  }
}
