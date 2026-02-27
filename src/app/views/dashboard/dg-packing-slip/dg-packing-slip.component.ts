import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { BarcodeFormat } from '@zxing/browser';
import { ChangeDetectorRef } from '@angular/core';
import { DgPackingSlipService } from './dg-packing-slip-service.service';
import { Inject } from '@angular/core';
import { th } from 'date-fns/locale';
import { JwtAuthService } from 'app/shared/services/auth/jwt-auth.service';

@Component({
    selector: 'app-dg-packing-slip',
    templateUrl: './dg-packing-slip.component.html',
    styleUrl: './dg-packing-slip.component.scss',
    standalone: false
})
export class DgPackingSlip implements OnInit {
  userId: string = '';
  profitcenter: string = '';

  selectedTab: string = 'PSStart';
  stage: string = '';
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
  //trCode: string = "";
  pFbCode: string = '';
  dgSerialNo: string = '';
  dieselQty: string = '';
  dieselRate: string = '';
  qaStatus: string = '';
  showQrScannerDGScan = false;
  dgPartcode: string = '';
  _strSrNo: string = '';

  //Accessorries Details Variables
  batTer: string = '';
  batLead: string = '';
  exhPipe: string = '';
  dcBulb: string = '';
  canopyKey: string = '';
  fuelCapKey: string = '';
  rubberPad: string = '';
  funnelPad: string = '';
  manual_Cd: string = '';

  trCode: string = '';
  psCode: string = '';
  diNo: string = '';
  pdiCode: string = '';

  //For Scan PSStart
  batteryScanDetailsPSStart: any[] = [];
  showQrScannerEnginePSStart: boolean = false;
  showQrScannerAlternatorPSStart: boolean = false;
  showQrScannerCanopyPSStart: boolean = false;
  showQrScannerControlPanel1PSStart: boolean = false;
  showQRScannerControlPanel2PSStart: boolean = false;
  showQRScannerKRMPSStart: boolean = false;

  scannedEngineQrResultPSStart: string = '';
  scannedAlternatorQrResultPSStart: string = '';
  scannedQrResultCanopyPSStart: string = '';
  scannedQrResultCP1PSStart: string = '';
  scannedQrResultCP2PSStart: string = '';
  scannedQrResultKRMPSStart: string = '';
  scannedBatteryQrResultsPSStart: string[] = ['', '', '', ''];

  //for scan PSEnd
  batteryScanDetailsPSEnd: any[] = [];
  showQrScannerEnginePSEnd: boolean = false;
  showQrScannerAlternatorPSEnd: boolean = false;
  showQrScannerCanopyPSEnd: boolean = false;
  showQrScannerControlPanel1PSEnd: boolean = false;
  showQRScannerControlPanel2PSEnd: boolean = false;
  showQRScannerKRMPSEnd: boolean = false;

  scannedEngineQrResultPSEnd: string = '';
  scannedAlternatorQrResultPSEnd: string = '';
  scannedQrResultCanopyPSEnd: string = '';
  scannedQrResultCP1PSEnd: string = '';
  scannedQrResultCP2PSEnd: string = '';
  scannedQrResultKRMPSEnd: string = '';
  scannedBatteryQrResultsPSEnd: string[] = ['', '', '', ''];

  scannedQrResultDGScan: string = '';
  paneltype: string = '';
  allowedFormats = [BarcodeFormat.QR_CODE];

  apiResponse: any;

  processCheckpoints: any[] = []; // for assign process checkpoint dynamically
  psMOFAddPartDetails: any[] = [];
  psMOFPartDetails: any[] = []; //for assign dg kit details

  scanDetails = {
    PSStart: {
      dgscan: { qrSrNo: '', dgDesc: '', dgPart: '' },
      engine: { qrSrNo: '', engDesc: '', engCode: '' },
      alternator: { qrSrNo: '', altDesc: '', altPart: '' },
      canopy: { qrSrNo: '', cpyDesc: '', cpyPart: '' },
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
    PSEnd: {
      dgscan: { qrSrNo: '', dgDesc: '', dgPart: '' },
      engine: { qrSrNo: '', engDesc: '', engCode: '' },
      alternator: { qrSrNo: '', altDesc: '', altPart: '' },
      canopy: { qrSrNo: '', cpyDesc: '', cpyPart: '' },
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

  //variable for showing Start and End time of packing slip
  psstarttimePSStart: string = '';
  psendtimePSStart: string = '';
  psstarttimePSEnd: string = '';
  psendtimePSEnd: string = '';
  //DI Details Variables for PSStart
  _DINOPSStart: string = '';
  _CustomerPSStart: string = '';
  _IndentorPSStart: string = '';
  _CPPSStart: string = '';
  _TRCodePSStart: string = '';
  _Date1PSStart: string = '';
  _Date2PSStart: string = '';
  _MOFCodePSStart: string = '';
  _KVAPSStart: string = '';

  //DI Details Variables for PSEnd
  _DINOPSEnd: string = '';
  _CustomerPSEnd: string = '';
  _IndentorPSEnd: string = '';
  _CPPSEnd: string = '';
  _TRCodePSEnd: string = '';
  _Date1PSEnd: string = '';
  _Date2PSEnd: string = '';
  _MOFCodePSEnd: string = '';
  _KVAPSEnd: string = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private dgAssemblyService: DgPackingSlipService,
    private authService: JwtAuthService
  ) {}

  ngOnInit(): void {
    const pccode = localStorage.getItem('ProfitCenter');
    if (pccode) {
      this.profitcenter = pccode;
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
      psstart: this[`psstarttime${this.selectedTab}`],
      psend: this[`psendtime${this.selectedTab}`],
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

  dgScanClick() {
    // Toggle the DGScan scanner
    this.showQrScannerDGScan = !this.showQrScannerDGScan;

    if (this.showQrScannerDGScan) {
      // Close all other scanners
      const scannerKeysToClose = [
        'showQrScannerEnginePSStart',
        'showQrScannerEnginePSEnd',
        'showQrScannerAlternatorPSStart',
        'showQrScannerAlternatorPSEnd',
        'showQrScannerCanopyPSStart',
        'showQrScannerCanopyPSEnd',
        'showQrScannerControlPanel1PSStart',
        'showQrScannerControlPanel1PSEnd',
        'showQRScannerControlPanel2PSStart',
        'showQRScannerControlPanel2PSEnd',
        'showQRScannerKRMPSStart',
        'showQRScannerKRMPSEnd',
      ];

      scannerKeysToClose.forEach((key) => {
        if (this.hasOwnProperty(key)) {
          this[key] = false;
        }
      });
    }
  }

  onScanEngineClick(action: 'PSStart' | 'PSEnd') {
    const scannerKey = `showQrScannerEngine${action}`; // Dynamically creates either 'showQrScannerEngineStart' or 'showQrScannerEngineEnd'
    this[scannerKey] = !this[scannerKey]; // Toggles the respective scanner visibility
    this.showQrScannerDGScan = false;
    if (this[scannerKey]) {
      // If the scanner is now visible, reset all other scanners of the same type
      const elements = [
        'showQrScannerAlternatorPSStart',
        'showQrScannerAlternatorPSEnd',
        'showQrScannerCanopyPSStart',
        'showQrScannerCanopyPSEnd',
        'showQrScannerControlPanel1PSStart',
        'showQrScannerControlPanel1PSEnd',
        'showQRScannerControlPanel2PSStart',
        'showQRScannerControlPanel2PSEnd',
        'showQRScannerKRMPSStart',
        'showQRScannerKRMPSEnd',
      ];

      elements.forEach((element) => (this[element] = false));
      //elements.forEach(element => this[`${element}${action}`] = false); // Dynamically reset each scanner of the same type
      this[`batteryScanDetails${action}`].forEach(
        (battery) => (battery.showQrScanner = false)
      ); // Reset battery scanners
    }
  }

  onScanAlternatorClick(action: 'PSStart' | 'PSEnd') {
    const scannerKey = `showQrScannerAlternator${action}`;
    this[scannerKey] = !this[scannerKey];

    this.showQrScannerDGScan = false;

    if (this[scannerKey]) {
      // If the scanner is now visible, reset all other scanners of the same type
      const elements = [
        'showQrScannerEnginePSStart',
        'showQrScannerEnginePSEnd',
        'showQrScannerCanopyPSStart',
        'showQrScannerCanopyPSEnd',
        'showQrScannerControlPanel1PSStart',
        'showQrScannerControlPanel1PSEnd',
        'showQRScannerControlPanel2PSStart',
        'showQRScannerControlPanel2PSEnd',
        'showQRScannerKRMPSStart',
        'showQRScannerKRMPSEnd',
      ];

      elements.forEach((element) => (this[element] = false));
      // elements.forEach(element => this[`${element}${action}`] = false); // Dynamically reset each scanner of the same type
      this[`batteryScanDetails${action}`].forEach(
        (battery) => (battery.showQrScanner = false)
      ); // Reset battery scanners
    }
  }

  onScanCanopyClick(action: 'PSStart' | 'PSEnd') {
    const scannerKey = `showQrScannerCanopy${action}`;
    this[scannerKey] = !this[scannerKey];

    this.showQrScannerDGScan = false;
    if (this[scannerKey]) {
      const elements = [
        'showQrScannerEnginePSStart',
        'showQrScannerEnginePSEnd',
        'showQrScannerAlternatorPSStart',
        'showQrScannerAlternatorPSEnd',
        'showQrScannerControlPanel1PSStart',
        'showQrScannerControlPanel1PSEnd',
        'showQRScannerControlPanel2PSStart',
        'showQRScannerControlPanel2PSEnd',
        'showQRScannerKRMPSStart',
        'showQRScannerKRMPSEnd',
      ];

      elements.forEach((element) => (this[element] = false));
      //elements.forEach(element => this[`${element}${action}`] = false);
      this[`batteryScanDetails${action}`].forEach(
        (battery) => (battery.showQrScanner = false)
      );
    }
  }

  onScanBatteryClick(action: 'PSStart' | 'PSEnd', index: number): void {
    const scannerKey = `batteryScanDetails${action}`;

    // Toggle only the clicked battery scanner
    this[scannerKey][index].showQrScanner =
      !this[scannerKey][index].showQrScanner;

    // If the clicked battery scanner is activated, disable all other scanners
    if (this[scannerKey][index].showQrScanner) {
      const elements = [
        'showQrScannerEnginePSStart',
        'showQrScannerEnginePSEnd',
        'showQrScannerAlternatorPSStart',
        'showQrScannerAlternatorPSEnd',
        'showQrScannerCanopyPSStart',
        'showQrScannerCanopyPSEnd',
        'showQrScannerControlPanel1PSStart',
        'showQrScannerControlPanel1PSEnd',
        'showQRScannerControlPanel2PSStart',
        'showQRScannerControlPanel2PSEnd',
        'showQRScannerKRMPSStart',
        'showQRScannerKRMPSEnd',
      ];

      elements.forEach((element) => (this[element] = false));
      //elements.forEach(element => this[`${element}${action}`] = false);
    }
  }

  onScanControlPanel1Click(action: 'PSStart' | 'PSEnd') {
    const scannerKey = `showQrScannerControlPanel1${action}`;
    this[scannerKey] = !this[scannerKey];

    if (this[scannerKey]) {
      const elements = [
        'showQrScannerEnginePSStart',
        'showQrScannerEnginePSEnd',
        'showQrScannerAlternatorPSStart',
        'showQrScannerAlternatorPSEnd',
        'showQrScannerCanopyPSStart',
        'showQrScannerCanopyPSEnd',
        'showQRScannerControlPanel2PSStart',
        'showQRScannerControlPanel2PSEnd',
        'showQRScannerKRMPSStart',
        'showQRScannerKRMPSEnd',
      ];

      elements.forEach((element) => (this[element] = false));
      //elements.forEach(element => this[`${element}${action}`] = false);
      this[`batteryScanDetails${action}`].forEach(
        (battery) => (battery.showQrScanner = false)
      );
    }
  }

  onScanControlPanel2Click(action: 'PSStart' | 'PSEnd') {
    const scannerKey = `showQRScannerControlPanel2${action}`;
    this[scannerKey] = !this[scannerKey];

    if (this[scannerKey]) {
      const elements = [
        'showQrScannerEnginePSStart',
        'showQrScannerEnginePSEnd',
        'showQrScannerAlternatorPSStart',
        'showQrScannerAlternatorPSEnd',
        'showQrScannerCanopyPSStart',
        'showQrScannerCanopyPSEnd',
        'showQrScannerControlPanel1PSStart',
        'showQrScannerControlPanel1PSEnd',
        'showQRScannerKRMPSStart',
        'showQRScannerKRMPSEnd',
      ];

      elements.forEach((element) => (this[element] = false));
      //elements.forEach(element => this[`${element}${action}`] = false);
      this[`batteryScanDetails${action}`].forEach(
        (battery) => (battery.showQrScanner = false)
      );
    }
  }

  onScanKRMClick(action: 'PSStart' | 'PSEnd') {
    const scannerKey = `showQRScannerKRM${action}`;
    this[scannerKey] = !this[scannerKey];

    if (this[scannerKey]) {
      const elements = [
        'showQrScannerEnginePSStart',
        'showQrScannerEnginePSEnd',
        'showQrScannerAlternatorPSStart',
        'showQrScannerAlternatorPSEnd',
        'showQrScannerCanopyPSStart',
        'showQrScannerCanopyPSEnd',
        'showQrScannerControlPanel1PSStart',
        'showQrScannerControlPanel1PSEnd',
        'showQRScannerControlPanel2PSStart',
        'showQRScannerControlPanel2PSEnd',
      ];

      elements.forEach((element) => (this[element] = false));
      //elements.forEach(element => this[`${element}${action}`] = false);
      this[`batteryScanDetails${action}`].forEach(
        (battery) => (battery.showQrScanner = false)
      );
    }
  }

  handleQrCodeResult(
    result: string,
    type: string,
    stage: 'PSStart' | 'PSEnd',
    index?: number
  ) {
    if (type === 'dgscan') {
      this._strSrNo = result;
      const payload = {
        strSrNo: result,
        strDGSrNo: result,
        strCat: '047',
        strCPBatCnt: '0',
        strPCCode: this.profitcenter,
        // this.userId === '0211'
        //   ? '01.004'
        //   : this.userId === '2236'
        //   ? '03.051'
        //   : this.userId === '110422'
        //   ? '28.001'
        //   : '',
      };
      this.showQrScannerDGScan = false;
      this.dgAssemblyService.getDGScanDetails(payload).subscribe(
        (response) => {
          const selectedStage = this.selectedTab;
          if (response.PSStatus === 'Complete') {
            this.successMessage = `Packing Slip Already Done With ${selectedStage} For Serial No: ${this._strSrNo} ...!`;
            console.log('Packing Slip Status', response.PSStatus);
          }
          console.log('Packing Slip', response);
          this.fetchMOFAdditionalPartDetails(response.MOFcode);

          this.scannedQrResultDGScan = result;

          this.scanDetails[selectedStage].dgscan = {
            qrSrNo: result,
            dgDesc: response.Partdesc,
            dgPart: response.Partcode,
          };

          const panelType = response.PanelType.split('-->');

          if (selectedStage === 'PSStart') {
            this.psstarttimePSStart = response.PSStartTime || '';
            this.psendtimePSStart = response.PSEndTime || '';
            this._DINOPSStart = response.DiNo || '';
            this._CustomerPSStart = response.CCname || '';
            this._IndentorPSStart = response.IndentorCode || '';
            this._MOFCodePSStart = response.MOFcode || '';
            this._KVAPSStart = response.KVA || '';
            this._TRCodePSStart = response.TRCode || '';
            this._Date1PSStart = response.DDT || '';
            this._Date2PSStart = response.MDT || '';
            this._CPPSStart = panelType[0];
          } else {
            this.psstarttimePSEnd = response.PSStartTime || '';
            this.psendtimePSEnd = response.PSEndTime || '';
            this._DINOPSEnd = response.DiNo || '';
            this._CustomerPSEnd = response.CCname || '';
            this._IndentorPSEnd = response.IndentorCode || '';
            this._MOFCodePSEnd = response.MOFcode || '';
            this._KVAPSEnd = response.KVA || '';
            this._TRCodePSEnd = response.TRCode || '';
            this._Date1PSEnd = response.DDT || '';
            this._Date2PSEnd = response.MDT || '';
            this._CPPSEnd = panelType[0];
          }

          const engDetails = response.Engdts.split('-->');
          this.scanDetails[selectedStage].engine = {
            qrSrNo: engDetails[0],
            engCode: engDetails[1],
            engDesc: engDetails[2],
          };

          const altDetails = response.Altdts.split('-->');
          this.scanDetails[selectedStage].alternator = {
            qrSrNo: altDetails[0],
            altPart: altDetails[1],
            altDesc: altDetails[2],
          };

          const cpyDetails = response.Cpydts.split('-->');
          this.scanDetails[selectedStage].canopy = {
            qrSrNo: cpyDetails[0],
            cpyPart: cpyDetails[1],
            cpyDesc: cpyDetails[2],
          };

          if (response.BatCnt > 0 && response.Batdts) {
            this.scanDetails[selectedStage].battery = Array.from(
              { length: response.BatCnt },
              (_, index) => {
                const key = index === 0 ? 'Batdts' : `Bat${index + 1}dts`;
                const batDetails = response[key]
                  ? response[key].split('-->')
                  : [];
                return {
                  showQrScanner: false,
                  qrSrNo: batDetails.length > 0 ? batDetails[0] : '',
                  batteryPart: batDetails.length > 1 ? batDetails[1] : '',
                  batteryDesc: batDetails.length > 2 ? batDetails[2] : '',
                  // stk: batDetails.length > 3 ? batDetails[3] : '',
                  // trStatus: batDetails.length > 4 ? batDetails[4] : ''
                };
              }
            );
            if (selectedStage === 'PSStart') {
              this.batteryScanDetailsPSStart =
                this.scanDetails[selectedStage].battery;
              console.log(
                'BatteryDetails of Start Section',
                this.batteryScanDetailsPSStart
              );
            } else if (selectedStage === 'PSEnd') {
              this.batteryScanDetailsPSEnd =
                this.scanDetails[selectedStage].battery;
            }
          }

          if (response.CPdts) {
            const cpDetails = response.CPdts.split('-->');
            this.scanDetails[selectedStage].controlPanel1 = {
              qrSrNo: cpDetails[0],
              cp1Part: cpDetails[1],
              cp1Desc: cpDetails[2],
            };
          } else {
            this.scanDetails[selectedStage].controlPanel1 = {
              qrSrNo: 'No Record.',
              cp1Part: 'No Record.',
              cp1Desc: 'No Record.',
            };
          }

          if (response.CP2dts) {
            const cp2Details = response.CP2dts.split('-->');
            this.scanDetails[selectedStage].controlPanel2 = {
              qrSrNo: cp2Details[0],
              cp2Part: cp2Details[1],
              cp2Desc: cp2Details[2],
            };
          } else {
            this.scanDetails[selectedStage].controlPanel2 = {
              qrSrNo: 'No Record.',
              cp2Part: 'No Record.',
              cp2Desc: 'No Record.',
            };
          }

          if (response.KRMdts) {
            const krmDetails = response.KRMdts.split('-->');
            this.scanDetails[selectedStage].krm = {
              qrSrNo: krmDetails[0],
              krmPart: krmDetails[1],
              krmDesc: krmDetails[2],
            };
          } else {
            this.scanDetails[selectedStage].krm = {
              qrSrNo: 'No Record.',
              krmPart: 'No Record.',
              krmDesc: 'No Record.',
            };
          }
          this.psCode = response?.PSCode ?? null;
          this.trCode = response.TRCode;
          this.diNo = response.DiNo;
          this.pdiCode = response.PDICode;
          this.dgSerialNo = result;
          this.paneltype = response.PanelType;
        },
        (error) => {
          console.error('Error in API call', error);
        }
      );
    } else if (type === 'engine') {
      if (stage === 'PSStart') {
        this.scannedEngineQrResultPSStart = result;
        this.showQrScannerEnginePSStart = false;
        const storedQrSrNo = this.scanDetails[stage]?.engine?.qrSrNo;
        if (this.scannedEngineQrResultPSStart !== storedQrSrNo) {
          alert('Engine Serial code does not match! Please check.');
        }
      } else {
        this.scannedEngineQrResultPSEnd = result;
        this.showQrScannerEnginePSEnd = false;
        const storedQrSrNo = this.scanDetails[stage]?.engine?.qrSrNo;
        if (this.scannedEngineQrResultPSEnd !== storedQrSrNo) {
          alert('Engine Serial code does not match! Please check.');
        }
      }
    } else if (type === 'alternator') {
      if (stage === 'PSStart') {
        this.scannedAlternatorQrResultPSStart = result;
        this.showQrScannerAlternatorPSStart = false;
        const storedQrSrNo = this.scanDetails[stage]?.alternator?.qrSrNo;
        if (this.scannedAlternatorQrResultPSStart !== storedQrSrNo) {
          alert('Alternator Serial code does not match! Please check.');
        }
      } else {
        this.scannedAlternatorQrResultPSEnd = result;
        this.showQrScannerAlternatorPSEnd = false;
        const storedQrSrNo = this.scanDetails[stage]?.alternator?.qrSrNo;
        if (this.scannedAlternatorQrResultPSEnd !== storedQrSrNo) {
          alert('Alternator Serial code does not match! Please check.');
        }
      }
    } else if (type === 'canopy') {
      if (stage === 'PSStart') {
        this.scannedQrResultCanopyPSStart = result;
        this.showQrScannerCanopyPSStart = false;
        const storedQrSrNo = this.scanDetails[stage]?.canopy?.qrSrNo;
        if (this.scannedQrResultCanopyPSStart !== storedQrSrNo) {
          alert('Canopy Serial code does not match! Please check.');
        }
      } else {
        this.scannedQrResultCanopyPSEnd = result;
        this.showQrScannerCanopyPSEnd = false;
        const storedQrSrNo = this.scanDetails[stage]?.canopy?.qrSrNo;
        if (this.scannedQrResultCanopyPSEnd !== storedQrSrNo) {
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
      if (stage === 'PSStart') {
        this.scannedQrResultCP1PSStart = result;
        this.showQrScannerControlPanel1PSStart = false;
        const storedQrSrNo = this.scanDetails[stage]?.controlPanel1?.qrSrNo;
        if (this.scannedQrResultCP1PSStart !== storedQrSrNo) {
          alert('Control Panel 1 Serial code does not match! Please check.');
        }
      } else {
        this.scannedQrResultCP1PSEnd = result;
        this.showQrScannerControlPanel1PSEnd = false;
        const storedQrSrNo = this.scanDetails[stage]?.controlPanel1?.qrSrNo;
        if (this.scannedQrResultCP1PSEnd !== storedQrSrNo) {
          alert('Control Panel 1 Serial code does not match! Please check.');
        }
      }
    } else if (type == 'controlPanel2') {
      if (stage === 'PSStart') {
        this.scannedQrResultCP2PSStart = result;
        this.showQRScannerControlPanel2PSStart = false;
        const storedQrSrNo = this.scanDetails[stage]?.controlPanel2?.qrSrNo;
        if (this.scannedQrResultCP2PSStart !== storedQrSrNo) {
          alert('Control Panel 2 Serial code does not match! Please check.');
        }
      } else {
        this.scannedQrResultCP2PSStart = result;
        this.showQRScannerControlPanel2PSStart = false;
        const storedQrSrNo = this.scanDetails[stage]?.controlPanel2?.qrSrNo;
        if (this.scannedQrResultCP2PSStart !== storedQrSrNo) {
          alert('Control Panel 2 Serial code does not match! Please check.');
        }
      }
    } else if (type === 'krm') {
      if (stage === 'PSStart') {
        this.scannedQrResultKRMPSStart = result;
        this.showQRScannerKRMPSStart = false;
        const storedQrSrNo = this.scanDetails[stage]?.krm?.qrSrNo;
        if (this.scannedQrResultKRMPSStart !== storedQrSrNo) {
          alert('KRM Serial code does not match! Please check.');
        }
      } else {
        this.scannedQrResultKRMPSEnd = result;
        this.showQRScannerKRMPSEnd = false;
        const storedQrSrNo = this.scanDetails[stage]?.krm?.qrSrNo;
        if (this.scannedQrResultKRMPSEnd !== storedQrSrNo) {
          alert('KRM Serial code does not match! Please check.');
        }
      }
    }
  }

  fetchMOFAdditionalPartDetails(strMOFCode: string) {
    const encodedPfbCode = encodeURIComponent(strMOFCode);
    this.dgAssemblyService.getMOFPartDetails(encodedPfbCode).subscribe(
      (response) => {
        console.log('MOFAdditionalPartDetails API Response:', response);
        if (response && response.length > 0) {
          this.psMOFAddPartDetails = response; // Store API response
          // after you receive trMOFPartDetails from the API
          this.psMOFPartDetails = response.map((item) => {
            const parts = (item.AdditionalPart || '').split('-->');
            return {
              ...item,
              additionalPartShort:
                parts.length >= 2
                  ? `${parts[0]} -- ${parts[1]}`
                  : item.AdditionalPart,
              uomShort: parts.length >= 4 ? `${parts[2]} -- ${parts[3]}` : '',
            };
          });
        } else {
        }
      },
      (error) => {
        console.error('Error Fetching DGKitDetails API Response :', error);
      }
    );
  }

  submitData() {
    if (this.selectedTab === 'PSStart') {
      this.submitPSStartData();
    } else if (this.selectedTab === 'PSEnd') {
      this.submitPSEndData();
    }
  }

  submitPSStartData() {
    const formData = new FormData();
    formData.append('PSTime', 'PSStartTime');
    formData.append('PSStartTime', this.psstarttimePSStart);
    formData.append('DGSrNo', this.dgSerialNo);
    formData.append('TRCode', this.trCode);
    formData.append('DiNo', this.diNo);
    formData.append('PDICode', this.pdiCode);
    formData.append('BatTer', this.batTer);
    formData.append('BatLead', this.batLead);
    formData.append('ExhPipe', this.exhPipe);
    formData.append('DCBulb', this.dcBulb);
    formData.append('CanopyKey', this.canopyKey);
    formData.append('FuelCapKey', this.fuelCapKey);
    formData.append('RubberPad', this.rubberPad);
    formData.append('FunnelPad', this.funnelPad);
    formData.append('PrdManual', this.manual_Cd);
    formData.append('EngPartCode', this.scanDetails.PSStart.engine.engCode);
    formData.append('EngSrNo', this.scanDetails.PSStart.engine.qrSrNo);
    formData.append('AltPartCode', this.scanDetails.PSStart.alternator.altPart);
    formData.append('AltSrNo', this.scanDetails.PSStart.alternator.qrSrNo);
    formData.append('CpyPartCode', this.scanDetails.PSStart.canopy.cpyPart);
    formData.append('CpySrNo', this.scanDetails.PSStart.canopy.qrSrNo);
    formData.append('CPType', this.paneltype);
    formData.append(
      'CPPartCode',
      this.scanDetails.PSStart.controlPanel1.cp1Part
    );
    formData.append('CPSrNo', this.scanDetails.PSStart.controlPanel1.qrSrNo);
    formData.append(
      'CP2PartCode',
      this.scanDetails.PSStart.controlPanel2.cp2Part
    );
    formData.append('CP2SrNo', this.scanDetails.PSStart.controlPanel2.qrSrNo);
    formData.append('KRMPartCode', this.scanDetails.PSStart.krm.krmPart);
    formData.append('KRMSrNo', this.scanDetails.PSStart.krm.qrSrNo);
    formData.append('Remark', 'Ok');
    formData.append('KVA', this._KVAPSStart);
    let extractedData = this.psMOFAddPartDetails.map((item) => ({
      PartCode: item.PartCode,
      Qty: item.Qty,
      WIPStock: item.WIPStock,
      Rate: item.Rate,
    }));
    let psMOFPartDetailsJson = JSON.stringify(extractedData);
    console.log(psMOFPartDetailsJson);
    formData.append('psMOFAddPartDetailsJson', psMOFPartDetailsJson);
    this.batteryScanDetailsPSStart.forEach((battery, index) => {
      const srNoKey = index === 0 ? 'BatSrno' : `Bat${index + 1}Srno`;
      const partCodeKey =
        index === 0 ? 'BatPartcode' : `Bat${index + 1}Partcode`;

      formData.append(srNoKey, battery.qrSrNo || '');
      formData.append(partCodeKey, battery.batteryPart || '');
    });

    this.dgAssemblyService.submitPackingSlipData(formData).subscribe(
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

  submitPSEndData() {
    const formData = new FormData();
    formData.append('PSTime', 'PSEndTime');
    formData.append('PSEndTime', this.psendtimePSEnd);
    formData.append('PSCode', this.psCode);
    formData.append('strSrNo', this._strSrNo);
    formData.append('TRCode', this.trCode);
    this.dgAssemblyService.submitPackingSlipData(formData).subscribe(
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

  isSaveDisabled(): boolean {
    if (this.selectedTab === 'PSStart') {
      return !this.isPSStartValid();
    } else if (this.selectedTab === 'PSEnd') {
      return !this.isPSEndValid();
    }
    return true;
  }

  // ==================== PS START VALIDATIONS ====================

  isPSStartValid(): boolean {
    const engineValid = this.isEngineValidPSStart();
    const alternatorValid = this.isAlternatorValidPSStart();
    const canopyValid = this.isCanopyValidPSStart();
    const batteriesValid = this.areBatteriesValidPSStart(); // OPTIONAL
    const cp1Valid = this.isControlPanel1ValidPSStart();
    const cp2Valid = this.isControlPanel2ValidPSStart(); // OPTIONAL - IGNORED
    const krmValid = this.isKRMValidPSStart(); // REQUIRED

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

  // Engine - Required (turns GREEN when scannedEngineQrResultPSStart matches qrSrNo)
  isEngineValidPSStart(): boolean {
    return (
      !!this.scanDetails?.PSStart?.engine?.qrSrNo &&
      this.scannedEngineQrResultPSStart ===
        this.scanDetails.PSStart.engine.qrSrNo
    );
  }

  // Alternator - Required (turns GREEN when scannedAlternatorQrResultPSStart matches qrSrNo)
  isAlternatorValidPSStart(): boolean {
    return (
      !!this.scanDetails?.PSStart?.alternator?.qrSrNo &&
      this.scannedAlternatorQrResultPSStart ===
        this.scanDetails.PSStart.alternator.qrSrNo
    );
  }

  // Canopy - Required (turns GREEN when matches)
  isCanopyValidPSStart(): boolean {
    return (
      !!this.scanDetails?.PSStart?.canopy?.qrSrNo &&
      this.scannedQrResultCanopyPSStart ===
        this.scanDetails.PSStart.canopy.qrSrNo
    );
  }

  // Batteries - OPTIONAL, but must be green if scanned
  areBatteriesValidPSStart(): boolean {
    // If no batteries at all, return true (optional)
    if (
      !this.batteryScanDetailsPSStart ||
      this.batteryScanDetailsPSStart.length === 0
    ) {
      return true;
    }

    // Check each battery - if any are scanned, they must be valid
    for (let i = 0; i < this.batteryScanDetailsPSStart.length; i++) {
      const battery = this.batteryScanDetailsPSStart[i];

      // Only validate if battery exists and has valid data (not batteryDesc='0')
      if (
        battery.qrSrNo &&
        battery.batteryPart &&
        battery.batteryDesc !== '0'
      ) {
        // Battery must be green (scanned result matches)
        if (this.scannedBatteryQrResultsPSStart?.[i] !== battery.qrSrNo) {
          return false; // Battery exists but not valid
        }
      }
    }

    return true; // All scanned batteries are valid (or no batteries scanned)
  }

  // Control Panel 1 - Required (turns GREEN when matches)
  isControlPanel1ValidPSStart(): boolean {
    return (
      !!this.scanDetails?.PSStart?.controlPanel1?.qrSrNo &&
      this.scannedQrResultCP1PSStart ===
        this.scanDetails.PSStart.controlPanel1.qrSrNo
    );
  }

  // Control Panel 2 - OPTIONAL - COMPLETELY IGNORED
  isControlPanel2ValidPSStart(): boolean {
    return true; // Always valid - ignored for save validation
  }

  // KRM - REQUIRED (must be green)
  isKRMValidPSStart(): boolean {
    return (
      !!this.scanDetails?.PSStart?.krm?.qrSrNo &&
      this.scannedQrResultKRMPSStart === this.scanDetails.PSStart.krm.qrSrNo
    );
  }

  // ==================== PS END VALIDATIONS ====================

  isPSEndValid(): boolean {
    const engineValid = this.isEngineValidPSEnd();
    const alternatorValid = this.isAlternatorValidPSEnd();
    const canopyValid = this.isCanopyValidPSEnd();
    const batteriesValid = this.areBatteriesValidPSEnd(); // OPTIONAL
    const cp1Valid = this.isControlPanel1ValidPSEnd();
    const cp2Valid = this.isControlPanel2ValidPSEnd(); // OPTIONAL - IGNORED
    const krmValid = this.isKRMValidPSEnd(); // REQUIRED

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

  // Engine - Required (turns GREEN when scannedEngineQrResultPSEnd matches qrSrNo)
  isEngineValidPSEnd(): boolean {
    return (
      !!this.scanDetails?.PSEnd?.engine?.qrSrNo &&
      this.scannedEngineQrResultPSEnd === this.scanDetails.PSEnd.engine.qrSrNo
    );
  }

  // Alternator - Required (turns GREEN when scannedAlternatorQrResultPSEnd matches qrSrNo)
  isAlternatorValidPSEnd(): boolean {
    return (
      !!this.scanDetails?.PSEnd?.alternator?.qrSrNo &&
      this.scannedAlternatorQrResultPSEnd ===
        this.scanDetails.PSEnd.alternator.qrSrNo
    );
  }

  // Canopy - Required (turns GREEN when matches)
  isCanopyValidPSEnd(): boolean {
    return (
      !!this.scanDetails?.PSEnd?.canopy?.qrSrNo &&
      this.scannedQrResultCanopyPSEnd === this.scanDetails.PSEnd.canopy.qrSrNo
    );
  }

  // Batteries - OPTIONAL, but must be green if scanned
  areBatteriesValidPSEnd(): boolean {
    // If no batteries at all, return true (optional)
    if (
      !this.batteryScanDetailsPSEnd ||
      this.batteryScanDetailsPSEnd.length === 0
    ) {
      return true;
    }

    // Check each battery - if any are scanned, they must be valid
    for (let i = 0; i < this.batteryScanDetailsPSEnd.length; i++) {
      const battery = this.batteryScanDetailsPSEnd[i];

      // Only validate if battery exists and has valid data (not batteryDesc='0')
      if (
        battery.qrSrNo &&
        battery.batteryPart &&
        battery.batteryDesc !== '0'
      ) {
        // Battery must be green (scanned result matches)
        if (this.scannedBatteryQrResultsPSEnd?.[i] !== battery.qrSrNo) {
          return false; // Battery exists but not valid
        }
      }
    }

    return true; // All scanned batteries are valid (or no batteries scanned)
  }

  // Control Panel 1 - Required (turns GREEN when matches)
  isControlPanel1ValidPSEnd(): boolean {
    return (
      !!this.scanDetails?.PSEnd?.controlPanel1?.qrSrNo &&
      this.scannedQrResultCP1PSEnd ===
        this.scanDetails.PSEnd.controlPanel1.qrSrNo
    );
  }

  // Control Panel 2 - OPTIONAL - COMPLETELY IGNORED
  isControlPanel2ValidPSEnd(): boolean {
    return true; // Always valid - ignored for save validation
  }

  // KRM - REQUIRED (must be green)
  isKRMValidPSEnd(): boolean {
    return (
      !!this.scanDetails?.PSEnd?.krm?.qrSrNo &&
      this.scannedQrResultKRMPSEnd === this.scanDetails.PSEnd.krm.qrSrNo
    );
  }
}
