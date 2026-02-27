import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { BarcodeFormat } from '@zxing/browser';
import { ChangeDetectorRef } from '@angular/core';
import { DgStageIService } from './dg-stage-i-service.service';
import { JwtAuthService } from 'app/shared/services/auth/jwt-auth.service';

@Component({
    selector: 'app-dg-stage-i',
    templateUrl: './dg-stage-i.component.html',
    styleUrl: './dg-stage-i.component.scss',
    standalone: false
})
export class DgStageIComponent implements OnInit {
  userId: string = '';
  password: string = '';
  profitcenter: string = '';

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
    const pccode = localStorage.getItem('ProfitCenter');
    if (pccode) {
      this.profitcenter = pccode;
    }
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
    }
  }

  onScanAlternatorClick() {
    this.showQrScannerAlternatorStart = !this.showQrScannerAlternatorStart;
    if (this.showQrScannerAlternatorStart) {
      this.showQrScannerEngineStart = false;
    }
  }

  // QR Code Scanning Methods for Stage(I) Scan End Tab
  onScanEngineClick1() {
    this.showQrScannerEngineEnd = !this.showQrScannerEngineEnd;
    if (this.showQrScannerEngineEnd) {
      this.showQrScannerAlternatorEnd = false;
    }
  }

  onScanAlternatorClick1() {
    this.showQrScannerAlternatorEnd = !this.showQrScannerAlternatorEnd;
    if (this.showQrScannerAlternatorEnd) {
      this.showQrScannerEngineEnd = false;
    }
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
         PCCode: this.profitcenter,
      };
      // Make the API call with the payload
      this.dgAssemblyService.getAssemblyDetails(payload).subscribe(
        (response) => {
          // Assigning the response values to scanDetails
          this.scanDetails = {
            qrSrNo: result,
            engDesc: response.EngPartDesc,
            engCode: response.EngPartCode,
            stk: response.EngStk,
          };

          const altDetails = response.AltDts.split('-->');
          this.scanDetails1 = {
            qrSrNo: altDetails[0],
            altPart: altDetails[1],
            altDesc: altDetails[2],
            trStatus: altDetails[3],
            stk: altDetails[4],
          };

          this.planNo = response.JobCode || '';
          this.date = response.JobDt || '';
          this.dgPartCodeDesc =
            `${response.DgProductCode} & ${response.DgProductDesc}` || '';
          this.jobCardPriority = response.JPriority || '';
          console.log('API Response:', response);
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
        PCCode: this.profitcenter,
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
          // Assigning the response values to scanDetails
          this.scanDetails2 = {
            qrSrNo: result,
            engDesc: response.EngPartDesc,
            engCode: response.EngPartCode,
            // stk: response.DGS1Stk
          };

          const altDetails = response.AltDts.split('-->');
          this.scanDetails3 = {
            qrSrNo: altDetails[0],
            altPart: altDetails[1],
            altDesc: altDetails[2],
            trStatus: altDetails[3],
            // stk: altDetails[4]
          };

          this.planNo_stageEnd = response.JobCode || '';
          this.date_stageEnd = response.JobDt || '';
          this.dgPartCodeDesc_stageEnd =
            `${response.DgProductCode} & ${response.DgProductDesc}` || '';
          this.jobCardPriority_stageEnd = response.JPriority || '';
          this.Dgstk_stageEnd = response.DGS1Stk;

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
      return (
        this.stkAsNumber === 0 ||
        !this.scanDetails?.qrSrNo ||
        !this.scanDetails1?.qrSrNo ||
        !this.isEngineScannedSuccessfully() ||
        !this.isAlternatorScannedSuccessfully()
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
    formData.append('PCCode', this.profitcenter);
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
    formData.append('PCCode', this.profitcenter);
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
