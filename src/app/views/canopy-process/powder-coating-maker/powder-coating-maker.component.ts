import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { environment } from 'environments/environment';

import { PowderCoatingPrcService } from './powdercoatingprc.service';
import { CanopyProcessService } from '../canopy-process.service';
import { IpowdercoatingprcloadMachine } from './Model/powdercoatingprcloadMachine';
import { IpowdercoatingprcSupplier }    from './Model/powdercoatingprcloadSupplier';
import { IpowdercoatingprcloadKVA }     from './Model/powdercoatingprcloadKVA';
import { IpowdercoatingPrcPartDts }     from './Model/powdercoatingprcPartDts';
import { IpowdercoatingprcSave }        from './Model/powdercoatingprcSave';

@Component({
  selector: 'app-powder-coating-maker',
  standalone: false,
  templateUrl: './powder-coating-maker.component.html',
  styleUrl: './powder-coating-maker.component.scss'
})
export class PowderCoatingMakerComponent implements OnInit {

  today: string = '';
  PC: string = '';
  SPCCode: string = '';
  strPFBCode: string = '0';
  StdSqft: number = 0;
  PCCatID: string = '';
  lblSaveCaption: string = 'Start';

  MachineList: IpowdercoatingprcloadMachine[] = [];
  SupplierList: IpowdercoatingprcSupplier[] = [];
  KVAList: IpowdercoatingprcloadKVA[] = [];
  PartDtsList: IpowdercoatingPrcPartDts[] = [];

  // ---- Line dropdown (GetLineByProcess) ----
  lineList: any[] = [];
  selectedLine: string = '';

  selectedSupplier: string = '0';
  selectedMachine: string = '0';
  selectedKVA: string = '0';

  // ---- attachments ----
  public AttachmentfieldArray: Array<any> = [];
  public newAttributeAttachment: any = {};
  myAttachmentFilesTemp: any[] = [];

  loading = false;
  showMessage = false;
  message: string = '';
  uploadedPercentage = 0;

  // ---- session ----
  EmpCode: string = '';
  LoginCompCode: string = '';
  LoginType: string = '';
  PCName: string = '';
  PCOld: string = '';
  FormName: string = '';
  FormRightId: string = '';
  isShowForm: boolean = true;

  constructor(
    private PowderCoatingPrcService: PowderCoatingPrcService,
    private canopyService: CanopyProcessService,
    private httpService: HttpClient,
    private router: Router
  ) {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    this.EmpCode       = (localStorage.getItem('employeeCode')     ?? '').trim();
    this.SPCCode            = (localStorage.getItem('ProfitCenter')     ?? this.PC).trim();
    this.PCName        = (localStorage.getItem('profitCenterName') ?? '').trim();
    this.LoginType     = (localStorage.getItem('loginType')        ?? '').trim();
    this.LoginCompCode = (localStorage.getItem('companyId')        ?? '').trim();
    this.PCOld         = (localStorage.getItem('ProfitCenter_old') ?? '').trim();
  }

  ngOnInit() {
    if (this.isShowForm == true) {
      this.today = formatDate(new Date(), 'dd-MM-yyyy hh:mm:ss a', 'en-US', '+0530');
      this.loadLineByProcess();
    }
    else {
      this.EmpCode = '';
      this.FormName = '';
      this.FormRightId = '';
      this.LoginCompCode = '';
      this.router.navigate(['/']);
      return;
    }
  }

  /** Loads the lines for this process. ProcessName is hard-coded to "Powder Coating". */
  loadLineByProcess(): void {
    this.canopyService.GetLineByProcess('Powder Coating', this.LoginCompCode).subscribe({
      next: (data) => { this.lineList = data ?? []; },
      error: (err) => { console.error(err); }
    });
  }

  /** On line change: set this.PC, reset everything below, then reload supplier + machine. */
  onLineSelect(lineWisePC: string): void {
    this.selectedLine = lineWisePC;
    this.PC = lineWisePC;
    // reset everything below the Line dropdown
    this.SupplierList = [];
    this.selectedSupplier = '0';
    this.MachineList = [];
    this.selectedMachine = '0';
    this.KVAList = [];
    this.selectedKVA = '0';
  
    this.LoadOSSupplier();
    this.LoadMachine();
  }

  LoadMachine() {
    this.loading = true;
    this.PowderCoatingPrcService.LoadMachine(this.PC).subscribe((data) => {
      this.MachineList = data ?? [];
      this.loading = false;
    }, (error: any) => { console.log(error); this.loading = false; });
  }

  LoadOSSupplier() {
    this.loading = true;
    this.PowderCoatingPrcService.LoadOSSupplier(this.PC).subscribe((data) => {
      this.SupplierList = data ?? [];
      this.loading = false;
    }, (error: any) => { console.log(error); this.loading = false; });
  }

  onSupplier(SupplierCode: string) {
    this.selectedSupplier = SupplierCode;
  }

  onMachineSelect(MachineCode: string) {
    this.selectedMachine = MachineCode;
    this.loadKVA();
  }

  loadKVA() {
    this.loading = true;
    this.PowderCoatingPrcService.getKVA(this.PC, this.selectedMachine).subscribe((data) => {
      this.KVAList = data ?? [];
      this.loading = false;
    }, (error: any) => { console.log(error); this.loading = false; });
  }

  onKVASelect(KVA: string) {
    this.selectedKVA = KVA;
    this.LoadPrcDts();
  }

  LoadPrcDts() {
    this.loading = true;
    this.lblSaveCaption = 'Start';
    this.PowderCoatingPrcService.GetCpyKitDts(this.PC, this.selectedMachine, this.selectedKVA).subscribe((data) => {
      this.PartDtsList = data ?? [];
      if (this.PartDtsList.length > 0) {
        this.PCCatID = this.PartDtsList[0].CatID;
      }
      let PartDtsCnt: number = 0;
      this.PartDtsList.forEach((item) => {
        if (item.PrcQty > 0 && item.SelectPC == true && item.PfbCode && item.PfbCode.substring(0, 3) == 'PSH') {
          PartDtsCnt = 1;
        }
      });
      if (PartDtsCnt == 1) {
        this.lblSaveCaption = 'End';
      }
      this.loading = false;
    }, (error: any) => { console.log(error); this.loading = false; });
  }

  getAttachmentFileDetails(e: any) {
    this.myAttachmentFilesTemp = [];
    for (var i = 0; i < e.target.files.length; i++) {
      this.myAttachmentFilesTemp.push(e.target.files[i]);
    }
  }

  addAttachmentFieldValue(isValid: boolean) {
    if (!isValid) {
      return;
    }

    // Genrate Sr No
    if (this.AttachmentfieldArray.length == 0) {
      this.newAttributeAttachment.SrNo = (this.AttachmentfieldArray.length + 1);
    }
    else {
      this.newAttributeAttachment.SrNo = (this.AttachmentfieldArray[this.AttachmentfieldArray.length - 1]['SrNo']) + 1;
    }

    if (this.myAttachmentFilesTemp.length == 0) {
      this.newAttributeAttachment.File = '';
      alert(' Please Attach File ');
      return;
    }

    // For to Check that File is Allredy Attach with Same Name
    for (var i = 0; i < this.myAttachmentFilesTemp.length; i++) {
      for (var F = 0; F < this.AttachmentfieldArray.length; F++) {
        if (this.AttachmentfieldArray[F]['Attachfile'].toString().trim() == this.myAttachmentFilesTemp[i]['name'].toString().trim()) {
          this.newAttributeAttachment.Attachfile = '';
          alert(this.myAttachmentFilesTemp[i]['name'].toString().trim() + ' - File Allready Attach .. Try again ');
          return;
        }
      }
    }

    // For to Add Attach file Array
    for (var i = 0; i < this.myAttachmentFilesTemp.length; i++) {
      var StrFile = this.myAttachmentFilesTemp[i]['name'].toString().trim();
      this.newAttributeAttachment.Attachfile = StrFile.toString().trim();
      const frmData = new FormData();
      this.showMessage = false;
      frmData.append('fileUpload', this.myAttachmentFilesTemp[i]);
      frmData.append('FrmEcode', this.EmpCode);
      frmData.append('FileUploadType', 'Save');

      this.httpService.post(environment.apiURL + 'PCPrc/UploadFiles', frmData, {
        reportProgress: true,
        observe: 'events'
      }).subscribe(
        (event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadedPercentage = Math.round(event.loaded / event.total * 100);
          }
          else if (event.type === HttpEventType.Response) {
            this.uploadedPercentage = 0;
            this.message = 'Uploaded Successfully ';
            this.showMessage = true;
            //Push File In Main File Save Array
            this.newAttributeAttachment.FileSaveYOrN = this.message;
            //Delete Temp Array
            this.myAttachmentFilesTemp = [];
            //Finaly Add Row in Array
            this.AttachmentfieldArray.push(this.newAttributeAttachment);
            this.newAttributeAttachment = {};
            this.message = '';
          }
        },
        (error: any) => {
          console.log(error);
          this.message = 'Something went wrong in file attachmnet';
          this.showMessage = true;
        });
    }
  }

  deleteAttachmentFieldValue(indexAttachment: number) {
    const att = this.AttachmentfieldArray[indexAttachment];
    if (att && att.Attachfile && att.Attachfile.toString().trim() != '') {
      const frmData = new FormData();
      this.showMessage = false;
      frmData.append('fileUpload', att.Attachfile.toString().trim());
      frmData.append('FrmEcode', this.EmpCode);
      frmData.append('FileUploadType', 'Delete');

      this.httpService.post(environment.apiURL + 'PCPrc/UploadFiles', frmData, {
        reportProgress: true,
        observe: 'events'
      }).subscribe(
        (event: HttpEvent<any>) => {
          if (event.type === HttpEventType.Response) {
            this.message = 'Delete Successfully ';
            this.showMessage = true;
            //Delete Row in Grid Array
            this.AttachmentfieldArray.splice(indexAttachment, 1);
            this.message = '';
          }
        },
        (error: any) => {
          console.log(error);
          this.message = 'Something went wrong in file attachmnet';
          this.showMessage = true;
        });
    }
  }

  /** Start button is enabled only when at least one process row is selected. */
  hasSelectedRows(): boolean {
    return this.PartDtsList?.some((item) => item.SelectPC === true) ?? false;
  }

  onFormSubmit(regForm: NgForm) {
    if (this.PartDtsList == null || this.PartDtsList.length == 0) {
      alert('No Data For Process! Cannot Save The Record');
      return;
    }

    let PCPrcPartDtsStk: string = '';
    if (this.strPFBCode == 'NEW') {
      for (const item of this.PartDtsList) {
        if (item.BatchQty < item.PrcSqft) {
          PCPrcPartDtsStk = '1';
          alert('Insufficient Stk For ' + item.KVA + ',' + item.ModelCPType + ',' + item.PlanCode);
          break;
        }
      }
    }

    if (PCPrcPartDtsStk != '') {
      return;
    }

    let PartDtsList: string = '';
    this.PartDtsList.forEach((item) => {
      if (item.PrcQty > 0 && item.SelectPC == true) {
        const row = item.PlanCode + '-->' + item.ProductCode + '-->' + item.BOMCode + '-->' + item.KitCode + '-->' + item.BatchQty + '-->'
          + item.Sqft + '-->' + item.PrcQty + '-->' + item.PfbCode + '-->' + item.EDt + '-->' + item.GroupPfbCode + '-->' + item.CatID;
        PartDtsList = (PartDtsList == '') ? row : PartDtsList + ',' + row;
      }
    });

    //Action Attachment Save
    let AttachFileDts: string = '';
    this.AttachmentfieldArray.forEach((itemAttachFile) => {
      const row = itemAttachFile.SrNo + '-->' + itemAttachFile.Attachfile;
      AttachFileDts = (AttachFileDts == '') ? row : AttachFileDts + '@#@' + row;
    });

    // PCCode_Act = selected line's PC (LineWisePC); PCCode = its ParentDgPC.
    const selectedLineObj = this.lineList.find((l) => l.LineWisePC === this.selectedLine);

    const payload: IpowdercoatingprcSave = {
      EmpCode: this.EmpCode,
      PCCode_Act: this.PC,
      PCCode: selectedLineObj?.ParentDgPC ?? '',
      SupplierCode: this.selectedSupplier,
      MachineCodeSrNo: this.selectedMachine,
      StdSqft: this.StdSqft,
      PrcDts: PartDtsList,
      Remark: 'Nil',
      AttachFileDts: AttachFileDts.toString().trim(),
      catID: this.PCCatID
    };

    this.loading = true;
    this.PowderCoatingPrcService.postPCSave(payload).subscribe((data) => {
      this.loading = false;
      // The controller can return Ok() with a validation message, so a 200
      // may still be a logical message — show whatever the server returned.
      alert((data ?? '').toString().trim());
      // Reload the Powder Coating Maker page so all dropdowns/grid reset
      // (same pattern as bending-maker's post-save navigation).
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate(['/canopy-process/powder-coating-maker']);
      });
    }, (error: any) => {
      this.loading = false;
      console.error(error);
      // Same message extraction bending-maker uses, so the user sees a
      // meaningful error instead of a silent failure.
      const apiMessage =
        (typeof error?.error === 'string' && error.error.trim()) ||
        error?.message ||
        'Something went wrong. Please try again.';
      alert(apiMessage);
    });
  }
}
