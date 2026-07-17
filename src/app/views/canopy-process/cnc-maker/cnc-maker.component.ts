import { IcncprcloadKVA } from './Model/cncprcloadKVA';
import { IcncprcloadModel } from './Model/cncprcloadModel';
import { ICncPrcPlanDts } from './Model/CncPrcPlanDts';
import { IcncprcloadMachine } from './Model/cncprcloadMachine';
import { IcncprcloadProduct } from './Model/cncprcloadProduct';
import { IcncprcloadOSSupplier } from './Model/cncprcloadOSSupplier';
import { IcncprcloadCatID } from './Model/cncprcloadCatID ';
import { IcncprcloadSheet } from './Model/cncprcloadSheet';
import { IcncprcSave } from './Model/cncprcSave';
import { formatDate } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { CncprcService } from './cncprc.service';
import { CanopyProcessService } from '../canopy-process.service';
import { IcncprcloadSheetSrno } from './Model/cncprcloadSheetSrno';
import { IcncprcloadSheetStk } from './Model/cncprcloadSheetStk ';
import { IcncprcSheetQtyWt } from './Model/cncprcSheetQtyWt';
import { ICncPrcEndDts } from './Model/CncPrcEndDts';
import { ICncPrcPartDts } from './Model/CncPrcPartDts';
import { environment } from 'environments/environment';
@Component({
  selector: 'app-cnc-maker',
  standalone: false,
  templateUrl: './cnc-maker.component.html',
  styleUrl: './cnc-maker.component.scss'
})
export class CNCMakerComponent implements OnInit {

  // ---- Injected services (Angular 19 inject API) ----
  private readonly cncService = inject(CncprcService);
  private readonly canopyService = inject(CanopyProcessService);
  private readonly httpService = inject(HttpClient);
  private readonly router = inject(Router);

  // ---- Line dropdown (GetLineByProcess) ----
  lineList: any[] = [];
  selectedLine: string = '';
 
  /** Drives the built-in loading overlay (replaces ngx-spinner). */
  isLoading = false;
 
  // ---- UI / state ----
  optionCollection: string[] = [];
  dis = false;
  showMessage = false;
  message = '';
  errorMessage: any;
  uploadedPercentage = 0;
  loading = false;
 
  // Attachment grid
  AttachmentfieldArray: Array<any> = [];
  newAttributeAttachment: any = {};
  myAttachmentFilesTemp: any[] = [];
 
  fileData: File | null = null;
  previewUrl: any = null;
  fileUploadProgress: string | null = null;
  uploadedFilePath: string | null = null;
 
  today = '';
  PC = ' ';
   PCCode = ' ';
  PCOld = ' ';
  strTKITID = '0';
  StrPartcode = '';
  SheetStock = 0;
  ddlSupplier = '';
 
  KVAList: IcncprcloadKVA[] = [];
  ModelList: IcncprcloadModel[] = [];
  PlanDts: ICncPrcPlanDts[] = [];
  MachineList: IcncprcloadMachine[] = [];
  ProductList: IcncprcloadProduct[] = [];
  OSSupplierList: IcncprcloadOSSupplier[] = [];
  LoadCatagoryList: IcncprcloadCatID[] = [];
  SheetList: IcncprcloadSheet[] = [];
  SheetSrnoList: IcncprcloadSheetSrno[] = [];
  SheetStkList: IcncprcloadSheetStk[] = [];
  SheetSrNoDts: IcncprcSheetQtyWt[] = [];
  CncPrcEndDts: ICncPrcEndDts[] = [];
  PartDtsList: ICncPrcPartDts[] | null = null;
 
  strPFBCode = '0';
  EDT: string | null = '0';
  lblModelCPTypeText = 'Select Model';
  lblSaveCaption = 'Submit';
 
  /** Bound to the Remark input in the footer (was previously hardcoded to "Nil"). */
  remark = '';

  // ---- Result popup (shown after Submit / End succeeds) ----
  showResultPopup = false;
  resultTitle = '';
  resultMessage = '';
  resultAction: 'Submit' | 'End' = 'Submit';

  objtempCNCPrc: IcncprcSave = new IcncprcSave();
 
  selectedKVA: string | null = '0';
  selectedModel: string | null = '0';
  selectedSheet: string | null = '0';
  selectedOSSupplier = '0';
  selectedSheetSrno: number | null = 0;
  selectedMachine = '0';
  selectedProduct = '0';
  selectedCatID = '';
 
  PlanQty = 0;
  CpyPlanCode = '';
  CpyPlanDt = '0';
  CpyPlanPart = '0';
 
  SheetQtyPerSet = 0.0;
  SheetWtPerUts = 0.0;
  SheetWtPerSet = 0.0;
  SheetQtyPerBatch = 0.0;
  SheetWtPerBatch = 0.0;
  SheetCatID = '';
  SheetCatName = '';
 
  LoginCompCode = '';
  EmpCode = '';
  PCName = '';
  FormName = '';
  FormRightId = '';
  LoginType = '';
  isShowForm = true;

  constructor() {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    this.EmpCode       = (localStorage.getItem('employeeCode')     ?? '').trim();
    this.PCCode            = (localStorage.getItem('ProfitCenter')     ?? '').trim();
    this.PCName        = (localStorage.getItem('profitCenterName') ?? '').trim();
    this.LoginType     = (localStorage.getItem('loginType')        ?? '').trim();
    this.LoginCompCode = (localStorage.getItem('companyId')        ?? '').trim();
    this.PCOld = (localStorage.getItem('ProfitCenter_old')        ?? '').trim();
  }
 

  ngOnInit(): void {
    if (this.isShowForm) {
      this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
      //this.LoadMachine();
      this.loadLineByProcess();
      this.optionCollection = ['', ''];
      this.objtempCNCPrc = new IcncprcSave();
      this.dis = false;
    } else {
      // No Right
      this.EmpCode = '';
      this.FormName = '';
      this.FormRightId = '';
      this.LoginCompCode = '';
      this.isLoading = false;
      this.router.navigate(['/']);
    }
  }
 
  /** Loads the lines for this process. ProcessName is hard-coded to "CNC". */
  loadLineByProcess(): void {
    this.canopyService.GetLineByProcess('CNC', this.LoginCompCode ).subscribe({
      next: (data) => { this.lineList = data ?? []; },
      error: (err) => { console.error(err); }
    });
  }

  /** On line change: use the selected line's LineWisePC as this.PC, then load machines. */
  onLineSelect(lineWisePC: string): void {
    this.selectedLine = lineWisePC;
    this.PC = lineWisePC;
    // Line change → reset Machine and everything below.
    this.MachineList = [];
    this.selectedMachine = '0';
    this.clearSupplier();
    this.resetPlanState();
    this.LoadMachine();
  }

  LoadMachine(): void {
    this.isLoading = true;
    this.cncService.LoadMachine(this.PC).subscribe({
      next: (data) => {
        this.MachineList = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.log(error);
        this.isLoading = false;
      },
    });
  }
 
  LoadProduct(): void {

    this.isLoading = true;
    this.cncService.LoadProduct(this.PC).subscribe({
      next: (data) => {
        this.ProductList = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.log(error);
        this.isLoading = false;
      },
    });
    
  }
 
  onProductSelect(ProductCode: string): void {
    this.resetPlanState();
    // Reset cascading dropdowns so KVA/Model fall back to placeholder
    // (matches the legacy onProductSelect behaviour).
    this.selectedKVA = null;
    this.selectedModel = null;
    this.loadKVA();
    this.selectedProduct = ProductCode;
    if (ProductCode === 'CPY') {
      this.lblModelCPTypeText = 'Select Model';
    } else if (ProductCode === 'CPL') {
      this.lblModelCPTypeText = 'Select CPType';
    }
  }
 
  onMachineSelect(MachineCode: string): void {
    this.selectedMachine = MachineCode;
    // Machine change → reset Supplier, KVA, Model, Category, Sheet, SrNo.
    this.clearSupplier();
    this.resetPlanState();
    this.LoadOSSupplier();
    this.loadKVA();
    this.LoadProduct();
  }

  /** Supplier change → reset KVA and everything below. */
  onSupplierSelect(SupplierCode: string): void {
    this.selectedOSSupplier = SupplierCode;
    this.clearKVA();
    this.resetPlanState();
    this.loadKVA();
  }
 
  LoadOSSupplier(): void {

    this.isLoading = true;
    this.cncService.LoadOSSupplier(this.PC).subscribe({
      next: (data) => {
        this.OSSupplierList = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.log(error);
        this.isLoading = false;
      },
    });
  }
 
  getSheetPart(CpyPlanCode: string, StrPartcode: string): void {
    const PCCode = this.PC;
    this.isLoading = true;
    this.cncService
      .getSheet(PCCode, this.selectedMachine, CpyPlanCode, StrPartcode, this.selectedCatID)
      .subscribe({
        next: (data) => {
          this.SheetList = data;
          if (this.EDT == null && this.strPFBCode.substring(0, 3) === 'PSH') {
            this.selectedSheet = this.SheetList[0].SheetCode;
            this.onSheetSelect(this.SheetList[0].SheetCode);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.log(error);
          this.isLoading = false;
        },
      });
  }
 
  loadKVA(): void {
    const PCCode = this.PC;
    this.isLoading = true;
    this.cncService.getKVA(PCCode, this.selectedMachine).subscribe({
      next: (data) => {
        this.KVAList = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.log(error);
        this.isLoading = false;
      },
    });
  }
 
  onKVASelect(KVA: string): void {
    // KVA change → reset Model, Category, Sheet, SrNo.
    this.clearModel();
    this.resetPlanState();
    const PCCode = this.PC;
    this.isLoading = true;
    this.cncService.getModel(PCCode, this.selectedMachine, KVA).subscribe({
      next: (data) => {
        this.selectedModel = null;
        this.ModelList = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.log(error);
        this.isLoading = false;
      },
    });
  }
 
  onModelSelect(KVA: string, Model: string): void {
    this.selectedKVA = KVA;
    this.selectedModel = Model;
    // Model change → reset Category, Sheet, SrNo (plan is reloaded below).
    this.clearCategory();
    this.resetPlanState();
    const PCCode = this.PC;
    this.isLoading = true;
    this.cncService.getPlanDts(PCCode, this.selectedMachine, KVA, Model).subscribe({
      next: (data) => {
        this.PlanDts = data.filter((d) => d.KVAMod === KVA + '-->' + Model);
        this.CpyPlanCode = this.PlanDts[0].CPCode;
        this.CpyPlanDt = this.PlanDts[0].Dt;
        this.CpyPlanPart = this.PlanDts[0].Part;
        this.PlanQty = this.PlanDts[0].CPQty;
        this.StrPartcode = this.PlanDts[0].Partcode;
        this.strPFBCode = this.PlanDts[0].PFBCode;
        this.EDT = this.PlanDts[0].EDt;
        this.SheetCatID = this.PlanDts[0].catId;
        this.SheetCatName = this.PlanDts[0].catagoryName;
        this.getcatID(KVA, Model);
        this.isLoading = false;
      },
      error: (error) => {
        console.log(error);
        this.isLoading = false;
      },
    });
  }
 
  onCatagorySelect(CatID: string): void {
    // Category change → reset Sheet + SrNo (keep the current plan).
    this.clearSheet();
    if (CatID) {
      this.getSheetPart(this.CpyPlanCode, this.StrPartcode);
    } else {
      console.log('Invalid selectedCatID');
    }
  }
 
  getcatID(KVA: string, Model: string): void {
    this.selectedKVA = KVA;
    this.selectedModel = Model;
   
    this.isLoading = true;
    this.cncService
      .getcatID(this.PC, this.selectedMachine, KVA, Model, this.CpyPlanCode)
      .subscribe({
        next: (data) => {
          this.LoadCatagoryList = data;
          if (this.LoadCatagoryList.length > 0 && this.LoadCatagoryList[0].CatID) {
            this.selectedCatID = this.LoadCatagoryList[0].CatID;
            this.onCatagorySelect(this.selectedCatID);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.log(error);
          this.isLoading = false;
        },
      });
  }
 
  GetCpyEndPrcDts(): void {

    this.isLoading = true;
    this.cncService.GetCNCEndPrcDts( this.PC, this.CpyPlanCode, this.StrPartcode).subscribe({
      next: (data) => {
        this.CncPrcEndDts = data;
        this.selectedMachine = this.CncPrcEndDts[0].MachineNo;
        this.selectedSheet = this.CncPrcEndDts[0].SheetCode;
        this.selectedSheetSrno = this.CncPrcEndDts[0].VersionCode;
        this.isLoading = false;
      },
      error: (error) => {
        console.log(error);
        this.isLoading = false;
      },
    });
  }
 
  onSheetSelect(sheetPartcode: string): void {
    this.selectedSheet = sheetPartcode;
    // Sheet change → reset SrNo (keep the current plan/sheet lookups).
    this.clearSrNo();
    this.SheetQtyPerSet = 0;
    this.SheetWtPerSet = 0;
    this.SheetQtyPerBatch = 0;
    this.SheetWtPerBatch = 0;
    this.strTKITID = '0';
    this.SheetStock = 0;
    this.GetSheetStkC(sheetPartcode);
  
    this.isLoading = true;
    this.cncService
      .getSheetSrno(
        this.PC,
        this.selectedMachine,
        this.CpyPlanCode,
        this.StrPartcode,
        sheetPartcode,
        this.selectedCatID
      )
      .subscribe({
        next: (data) => {
          this.selectedSheetSrno = null;
          this.SheetSrnoList = data;
          if (this.EDT == null && this.strPFBCode.substring(0, 3) === 'PSH') {
            this.selectedSheetSrno = this.SheetSrnoList[0].SerialNo1;
            this.onSelectSheetSrNo(this.SheetSrnoList[0].SerialNo1);
            this.lblSaveCaption = 'End';
           // this.onClickSearch();
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.log(error);
          this.isLoading = false;
        },
      });
  }
 
  GetSheetStkC(sheetPartcode: string): void {
    this.isLoading = true;
    this.cncService.GetSheetStk(this.PC, sheetPartcode).subscribe({
      next: (data) => {
        this.SheetStkList = data ?? [];
        // Guard against an empty response — keep SheetStock at 0 so
        // the downstream stock-vs-batch check fails safely instead of
        // throwing on `SheetStkList[0].StkQty`.
        this.SheetStock = this.SheetStkList.length > 0
          ? (this.SheetStkList[0].StkQty ?? 0)
          : 0;
        this.isLoading = false;
      },
      error: (error) => {
        console.log(error);
        this.isLoading = false;
      },
    });
  }
 
  onSelectSheetSrNo(SheetSrNo: number): void {
    this.SheetQtyPerSet = 0;
    this.SheetWtPerSet = 0;
    this.SheetQtyPerBatch = 0;
    this.SheetWtPerBatch = 0;
    this.strTKITID = '0';
    this.SheetWtPerUts = 0;
  
    this.isLoading = true;
    this.cncService
      .getSheetSrnoDts(
         this.PC,
        this.selectedMachine,
        this.CpyPlanCode,
        this.StrPartcode,
        this.selectedSheet ?? '0',
        SheetSrNo,
        this.selectedCatID
      )
      .subscribe({
        next: (data) => {
          this.SheetSrNoDts = data;
          this.SheetQtyPerSet = this.SheetSrNoDts[0].QtyPerSet;
          this.SheetWtPerUts = this.SheetSrNoDts[0].WtPerUts;
          this.SheetWtPerSet = this.SheetSrNoDts[0].WtPerSet;
          this.SheetCatID = this.SheetSrNoDts[0].CatID;
          this.SheetQtyPerBatch = Math.round(this.SheetQtyPerSet * this.PlanQty);
          this.SheetWtPerBatch = Math.round(this.SheetWtPerSet * this.PlanQty * 100) / 100;
          this.strTKITID = this.SheetSrNoDts[0].TKITID;
          this.onClickSearch();
          this.isLoading = false;
        },
        error: (error) => {
          console.log(error);
          this.isLoading = false;
        },
      });
  }
 
  onClickSearch(): void {
    if (this.EDT == null) {
      
      this.isLoading = true;
      this.cncService
        .GetEndPrcPartDts( this.PC, this.strPFBCode, this.CpyPlanCode, this.StrPartcode)
        .subscribe({
          next: (data) => {
            this.PartDtsList = data;
            this.isLoading = false;
          },
          error: (error) => {
            console.log(error);
            this.isLoading = false;
          },
        });
    } else {
      if (this.selectedSheet === '0') {
        alert('Pl Select The Sheet For process');
        return;
      }
      if (this.strTKITID === '0') {
        alert('Sheet Serial No Not Selected Properly');
        return;
      }
     
      this.isLoading = true;
      this.cncService
        .GetPartDts( this.PC, this.strTKITID, this.PlanQty, this.CpyPlanCode, this.StrPartcode)
        .subscribe({
          next: (data) => {
            this.PartDtsList = data;
            this.isLoading = false;
          },
          error: (error) => {
            console.log(error);
            this.isLoading = false;
          },
        });
    }
  }
 
  getAttachmentFileDetails(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.myAttachmentFilesTemp = [];
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        this.myAttachmentFilesTemp.push(input.files[i]);
      }
    }
  }
 
  addAttachmentFieldValue(isValid: boolean): void {
    if (!isValid) {
      return;
    }
 
    // Generate Sr No
    if (this.AttachmentfieldArray.length === 0) {
      this.newAttributeAttachment.SrNo = this.AttachmentfieldArray.length + 1;
    } else {
      for (let i = 0; i < this.AttachmentfieldArray.length; i++) {
        this.newAttributeAttachment.SrNo = this.AttachmentfieldArray[i]['SrNo'] + 1;
      }
    }
 
    // Check File Name If Attach Or Not
    if (this.myAttachmentFilesTemp.length === 0) {
      this.newAttributeAttachment.File = '';
      alert(' Please Attach File ');
      return;
    }
 
    // Check that file is not already attached with the same name
    for (let i = 0; i < this.myAttachmentFilesTemp.length; i++) {
      for (let f = 0; f < this.AttachmentfieldArray.length; f++) {
        if (
          this.AttachmentfieldArray[f]['Attachfile'].toString().trim() ===
          this.myAttachmentFilesTemp[i]['name'].toString().trim()
        ) {
          this.newAttributeAttachment.Attachfile = '';
          alert(
            this.myAttachmentFilesTemp[i]['name'].toString().trim() +
              ' - File Allready Attach .. Try again '
          );
          return;
        }
      }
    }
 
    // Upload each file
    for (let i = 0; i < this.myAttachmentFilesTemp.length; i++) {
      const strFile = this.myAttachmentFilesTemp[i]['name'].toString().trim();
      this.newAttributeAttachment.Attachfile = strFile;
 
      const frmData = new FormData();
      this.showMessage = false;
      frmData.append('fileUpload', this.myAttachmentFilesTemp[i]);
      frmData.append('FrmEcode', this.EmpCode);
      frmData.append('FileUploadType', 'Save');
 
      this.httpService
        .post(environment.apiURL + '/CNCPrc/UploadFiles', frmData, {
          reportProgress: true,
          observe: 'events',
        })
        .subscribe({
          next: (event: HttpEvent<any>) => {
            switch (event.type) {
              case HttpEventType.Sent:
                this.uploadedPercentage = 0;
                break;
              case HttpEventType.UploadProgress:
                if (event.total) {
                  this.uploadedPercentage = (event.loaded / event.total) * 100;
                  this.message = '1 ';
                }
                break;
              case HttpEventType.Response:
                this.uploadedPercentage = 100;
                this.message = 'Uploaded Successfully ';
                this.showMessage = true;
                this.newAttributeAttachment.FileSaveYOrN = this.message;
                this.myAttachmentFilesTemp = [];
                this.AttachmentfieldArray.push(this.newAttributeAttachment);
                this.newAttributeAttachment = {};
                this.message = '';
                break;
            }
          },
          error: (error) => {
            console.log(error);
            this.message = 'Something went wrong in file attachmnet';
            this.showMessage = true;
          },
        });
    }
  }
 
  deleteAttachmentFieldValue(indexAttachment: number): void {
    const attachFile = this.AttachmentfieldArray[indexAttachment]?.Attachfile?.toString().trim();
    if (attachFile) {
      const frmData = new FormData();
      this.showMessage = false;
      frmData.append('fileUpload', attachFile);
      frmData.append('FrmEcode', this.EmpCode);
      frmData.append('FileUploadType', 'Delete');
 
      this.httpService
        .post(environment.apiURL + '/CNCPrc/UploadFiles', frmData, {
          reportProgress: true,
          observe: 'events',
        })
        .subscribe({
          next: (event: HttpEvent<any>) => {
            switch (event.type) {
              case HttpEventType.Sent:
                this.uploadedPercentage = 0;
                break;
              case HttpEventType.UploadProgress:
                if (event.total) {
                  this.uploadedPercentage = (event.loaded / event.total) * 100;
                  this.message = '1 ';
                }
                break;
              case HttpEventType.Response:
                this.uploadedPercentage = 100;
                this.message = 'Delete Successfully ';
                this.showMessage = true;
                this.AttachmentfieldArray.splice(indexAttachment, 1);
                this.message = '';
                break;
            }
          },
          error: (error) => {
            console.log(error);
            this.message = 'Something went wrong in file attachmnet';
            this.showMessage = true;
          },
        });
    }
  }
 
  onFormSubmit(regForm: NgForm): void {
    if (this.PartDtsList == null) {
      alert('Please Search Process Details');
      return;
    }
 
    let CNCPrcPartDtsStk = '';
    if (this.strPFBCode.substring(0, 3) === 'NEW') {
     const partStartCount = this.PartDtsList.filter(
      item => item.PartCode.startsWith('004')
    ).length;

    if (partStartCount < 1) {
      alert(" Combine price list not updated Concern With CIA Team ");
      return;
    }
      if (this.SheetStock < this.SheetWtPerBatch) {
        CNCPrcPartDtsStk = '1';
        alert('Insufficient Stock For Sheet');
        return;
      }
    }
 
    if (CNCPrcPartDtsStk === '') {
      let CNCPrcPartDts = '';
      this.PartDtsList.forEach((item) => {
        const row =
          item.PartCode +
          '-->' +
          item.KitQty +
          '-->' +
          item.BatchQty +
          '-->' +
          item.PCRate +
          '-->' +
          item.TLength +
          '-->' +
          item.TWidth +
          '-->' +
          item.TTHickness +
          '-->' +
          item.TLossWt +
          '-->' +
          item.TCatagorycode;
        CNCPrcPartDts = CNCPrcPartDts === '' ? row : CNCPrcPartDts + ',' + row;
      });
 
      // PCCode_Act = selected line's PC (LineWisePC); PCCode = its ParentDgPC.
      const selectedLineObj = this.lineList.find(l => l.LineWisePC === this.selectedLine);
      this.objtempCNCPrc.PCCode_Act = this.PC;
      this.objtempCNCPrc.PCCode = selectedLineObj?.ParentDgPC ?? '';
      this.objtempCNCPrc.PlanCode = this.CpyPlanCode;
      this.objtempCNCPrc.ProductCode = this.StrPartcode;
 
      if (this.EDT == null && this.strPFBCode.substring(0, 3) === 'PSH') {
        this.objtempCNCPrc.TkitId = this.strPFBCode;
      } else {
        this.objtempCNCPrc.TkitId = this.strTKITID;
      }
 
      this.objtempCNCPrc.SheetPartcode = this.selectedSheet ?? '0';
      this.objtempCNCPrc.EmpCode = this.EmpCode;
      this.objtempCNCPrc.BatchQty = this.PlanQty;
      this.objtempCNCPrc.MachineCodeSrNo = this.selectedMachine;
      this.objtempCNCPrc.SerialNo = this.selectedSheetSrno ?? 0;
      this.objtempCNCPrc.ShQtyPerset = this.SheetQtyPerSet;
      this.objtempCNCPrc.ShWtperUts = this.SheetWtPerUts;
      this.objtempCNCPrc.ShWtperSet = this.SheetWtPerSet;
      this.objtempCNCPrc.ShWtperBatch = this.SheetWtPerBatch;
      this.objtempCNCPrc.PrcDts = CNCPrcPartDts;
      this.objtempCNCPrc.Remark = this.remark.trim() ? this.remark.trim() : 'Nil';
      this.objtempCNCPrc.OSSupplierCode = this.selectedOSSupplier;
      this.objtempCNCPrc.CatID = this.SheetCatID;
    
      // Build attachment details string
      let AttachFileDts = '';
      this.AttachmentfieldArray.forEach((itemAttachFile) => {
        const row = itemAttachFile.SrNo + '-->' + itemAttachFile.Attachfile;
        AttachFileDts = AttachFileDts === '' ? row : AttachFileDts + '@#@' + row;
      });
      this.objtempCNCPrc.AttachFileDts = AttachFileDts.trim();
 
      this.loading = true;
      // Remember whether this submit was a normal Submit or an End,
      // so the result popup can show the right title / message.
      const action: 'Submit' | 'End' = this.lblSaveCaption === 'End' ? 'End' : 'Submit';

      this.cncService.postCNCSave(this.objtempCNCPrc).subscribe({
        next: (data) => {
          this.loading = false;
          const message = (data ?? '').trim();
          // The controller returns Ok(result) even when SubmitCNCAsync
          // produces a validation message like "Insufficient Stock ..."
          // — so a 200 response can still be a logical failure. Decide
          // by inspecting the message body.
          const isFailure = this.isFailureMessage(message);
          this.openResultPopup(action, message, isFailure);
        },
        error: (error) => {
          this.loading = false;
          console.log(error);
          // Surface whatever the controller actually returned (e.g.
          // "An error occurred while submitting the CNC process.").
          const apiMessage =
            (typeof error?.error === 'string' && error.error.trim()) ||
            error?.message ||
            'Something went wrong. Please try again.';
          this.openResultPopup(action, apiMessage, /*isError*/ true);
        },
      });
    }
  }

  /**
   * Recognises a logical failure that the API returned with a 200 OK
   * status — e.g. "Insufficient Stock For Consumable ..." — so the
   * popup can show the red error variant instead of green success.
   */
  private isFailureMessage(message: string): boolean {
    if (!message) return false;
    const lower = message.toLowerCase();
    const failureSignals = [
      'insufficient',
      'not enough',
      'error',
      'failed',
      'fail',
      'invalid',
      'cannot',
      'unable',
      'missing',
      'duplicate',
      'already',
      'not found',
      'denied'
    ];
    return failureSignals.some(p => lower.includes(p));
  }

  /** Opens the result popup with stage-appropriate title + message. */
  private openResultPopup(action: 'Submit' | 'End', message: string, isError = false): void {
    this.resultAction = action;
    this.resultTitle = isError
      ? (action === 'End' ? 'End Failed' : 'Submit Failed')
      : (action === 'End' ? 'CNC Process Ended' : 'CNC Process Submitted');
    this.resultMessage = message || (isError
      ? 'Operation failed.'
      : `${action} completed successfully.`);
    this.showResultPopup = true;
  }

  /** Closes the popup and reloads the CNC Maker page so all dropdowns reset. */
  closeResultPopup(): void {
    this.showResultPopup = false;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/canopy-process/cnc-maker']);
    });
  }
 
  /** Shared reset used by the cascading dropdowns. */
  // ---- Cascade "clear-downward" helpers (dropdown lists + selections only) ----
  private clearSrNo(): void {
    this.SheetSrnoList = [];
    this.selectedSheetSrno = null;
    // Also clear the CNC Part Details grid — it belongs to the selected SrNo.
    this.PartDtsList = null;
  }
  private clearSheet(): void {
    this.SheetList = [];
    this.selectedSheet = null;
    this.clearSrNo();
  }
  private clearCategory(): void {
    this.LoadCatagoryList = [];
    this.selectedCatID = '';
    this.clearSheet();
  }
  private clearModel(): void {
    this.ModelList = [];
    this.selectedModel = null;
    this.clearCategory();
  }
  private clearKVA(): void {
    this.KVAList = [];
    this.selectedKVA = null;
    this.clearModel();
  }
  private clearSupplier(): void {
    this.OSSupplierList = [];
    this.selectedOSSupplier = '0';
    this.ProductList = [];
    this.selectedProduct = '0';
    this.clearKVA();
  }

  private resetPlanState(): void {
    this.CpyPlanCode = '';
    this.CpyPlanDt = '';
    this.CpyPlanPart = '';
    this.PlanQty = 0;
    this.StrPartcode = '';
    this.strPFBCode = '';
    this.EDT = '';
    this.selectedSheet = null;
    this.SheetQtyPerSet = 0;
    this.SheetWtPerSet = 0;
    this.SheetQtyPerBatch = 0;
    this.SheetWtPerBatch = 0;
    this.strTKITID = '0';
    this.SheetStock = 0;
  }
}
