import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { BarcodeFormat } from '@zxing/browser';
import { ChangeDetectorRef } from '@angular/core';
import { DgStageIIService } from './dg-stage-ii-service.service';
import { Inject } from '@angular/core';
import { JwtAuthService } from 'app/shared/services/auth/jwt-auth.service';

@Component({
  selector: 'app-dg-stage-ii',
  templateUrl: './dg-stage-ii.component.html',
  styleUrl: './dg-stage-ii.component.scss',
})
export class DgStageIIComponent implements OnInit {
  userId: string = '';
  password: string = '';
  profitcenter: string = '';

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

  onScanEngineClick1() {
    this.showQrScannerEngineEnd = !this.showQrScannerEngineEnd;
    if (this.showQrScannerEngineEnd) {
      this.showQrScannerAlternatorEnd = false;
      this.showQrScannerCanopy = false;
      this.batteryScanDetails.forEach(
        (battery) => (battery.showQrScanner = false)
      );
    }
  }

  onScanAlternatorClick1() {
    this.showQrScannerAlternatorEnd = !this.showQrScannerAlternatorEnd;
    if (this.showQrScannerAlternatorEnd) {
      this.showQrScannerEngineEnd = false;
      this.showQrScannerCanopy = false;
      this.batteryScanDetails.forEach(
        (battery) => (battery.showQrScanner = false)
      );
    }
  }

  onScanCanopyClick() {
    this.showQrScannerCanopy = !this.showQrScannerCanopy;
    if (this.showQrScannerCanopy) {
      this.showQrScannerEngineEnd = false;
      this.showQrScannerAlternatorEnd = false;
      this.batteryScanDetails.forEach(
        (battery) => (battery.showQrScanner = false)
      );
    }
  }

  onScanBatteryClick(index: number): void {
    this.batteryScanDetails[index].showQrScanner =
      !this.batteryScanDetails[index].showQrScanner;
    if (this.batteryScanDetails[index].showQrScanner) {
      this.showQrScannerEngineEnd = false;
      this.showQrScannerAlternatorEnd = false;
      this.showQrScannerCanopy = false;
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
          console.log('Stage 2 ScanDetails', response);
          this.engineScanDetails = {
            qrSrNo: result,
            engDesc: response.EngPartDesc,
            engCode: response.EngPartCode,
          };

          const altDetails = response.AltDts.split('-->');
          this.alternatorScanDetails = {
            qrSrNo: altDetails[0],
            altPart: altDetails[1],
            altDesc: altDetails[2],
            trStatus: altDetails[3],
          };

          const cpyDetails = response.Cpydts.split('-->');
          this.canopyScandetails = {
            qrSrNo: cpyDetails[0],
            cpyPart: cpyDetails[1],
            cpyDesc: cpyDetails[2],
            cpyStk: cpyDetails[3],
          };

          if (response.BatCnt > 0) {
            this.batteryScanDetails = Array.from(
              { length: response.BatCnt },
              (_, index) => {
                const key = index === 0 ? 'BatDts' : `Bat${index + 1}Dts`; // Handles 'BatDts' and 'Bat2Dts' format
                const batDetails = response[key]?.split('-->') || [];

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
          }

          this.planNo = response.JobCode || '';
          this.date = response.JobDt || '';
          this.dgDesc = response.DgProductDesc || '';
          this.dgPartcode = response.DgProductCode || '';
          this.dgKVA = response.KVA || '';
          this.Dgstk = response.DGS3Stk || '';
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
    debugger;
    const fetchedCheckPoints = this.fetchCheckPointDataFromUI();
    const formData = new FormData();
    formData.append('JBCode', this.planNo);
    formData.append('EngSrNo', this.engineScanDetails.qrSrNo);
    formData.append('AltSrno', this.alternatorScanDetails.qrSrNo);
    formData.append('StageNo', '3');
    formData.append('ProductCode', this.dgPartcode);
    formData.append('PCCode', this.profitcenter);
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

    if (this.selectedSixMItem) {
      formData.append('QA6M', this.selectedSixMItem);
    }
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

    return !engineValid || !alternatorValid || !canopyValid || !batteryValid;
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
