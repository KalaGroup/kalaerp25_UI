import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

// Mirrors LineDto returned by DGAssemblly/GetLineRights. Same shape as
// Canopy Plan so we can reuse the same line-rights dropdown pattern.
export interface LineRight {
  LineWisePC: string;
  LineDesc:   string;
  ParentDgPC: string;
}

export interface CanopyProcessMachine {
  AMCode:   string;
  Part:     string;
  PartCode: string;   // "Foam-->Foam1"
}

export interface CanopyProcessKva {
  KVA:  string;
  KVA1: string;
}

export interface CanopyProcessModel {
  Model:  string;
  Model1: string;
}

export interface CanopyProcessPlanContext {
  KVAMod:      string;
  KVA:         string;
  Model:       string;
  CPCode:      string;
  Dt:          string;
  Partcode:    string;
  Part:        string;
  CPQty:       number;
  PlanQtyBal:  number;
  PrcQty:      number;
  PFBCode:     string;
  EDt:         string;
  BOMCode:     string;
  SCode:       string;
}

export interface CanopyProcessKit {
  KitDesc: string;
  KitCode: string;   // "PartDesc-->PartCode"
  PfbCode: string;
  EDt:     string;
}

export interface CanopyProcessKitContext {
  Bal:   number;
  SRate: number;
}

export interface CanopyProcessPartRow {
  Part:     string;
  KitQty:   number;
  PrcQty:   number;
  StkQty:   number;
  Wt:       number;
  TotWt:    number;
  Sqft:     number;
  TotSqft:  number;
  Rate:     number;
  PartCode: string;
}

export interface CanopyProcessAssemblyKitRow {
  Part:     string;
  Qty:      number;
  PrcQty:   number;
  StkQty:   number;
  PartCode: string;
}

export interface CanopyProcessPartLine {
  PartCode: string;
  KitQty:   number;
  PrcQty:   number;
  Rate:     number;
  Wt:       number;
  Sqft:     number;
}

export interface CanopyProcessAttachment {
  SrNo:     number;
  FileName: string;
}

export interface SubmitCanopyProcessRequest {
  EmpCode:         string;
  PCCode:          string;   // LineWisePC
  ParentDgPC:      string;
  CompanyCode:     string;
  MachineCodeSrNo: string;
  PlanCode:        string;
  ProductCode:     string;
  BOMCode:         string;
  PFBCode:         string;   // "NEW/..." or "PSH/..."
  BatchQty:        number;
  PrcQty:          number;
  Remark:          string;
  PrcDts:          CanopyProcessPartLine[];
  Attachments:     CanopyProcessAttachment[];
}

export interface SubmitCanopyProcessResponse {
  Message: string;
  PFBCode: string;
}

@Injectable({ providedIn: 'root' })
export class CanopyAssemblyProcessService {
  private baseUrl = environment.apiURL;

  constructor(private http: HttpClient) {}

  getLineRights(prmCode: string): Observable<LineRight[]> {
    const url = `${this.baseUrl}DGAssemblly/GetLineRights?prmCode=${encodeURIComponent(prmCode)}`;
    return this.http.get<LineRight[]>(url);
  }

  getMachineList(pcCode: string): Observable<CanopyProcessMachine[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyProcessMachineList`
      + `?pcCode=${encodeURIComponent(pcCode)}`;
    return this.http.get<CanopyProcessMachine[]>(url);
  }

  getKvaList(machineCode: string, pcCode: string): Observable<CanopyProcessKva[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyProcessKvaList`
      + `?machineCode=${encodeURIComponent(machineCode)}`
      + `&pcCode=${encodeURIComponent(pcCode)}`;
    return this.http.get<CanopyProcessKva[]>(url);
  }

  getModelList(machineCode: string, kva: string, pcCode: string): Observable<CanopyProcessModel[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyProcessModelList`
      + `?machineCode=${encodeURIComponent(machineCode)}`
      + `&kva=${encodeURIComponent(kva)}`
      + `&pcCode=${encodeURIComponent(pcCode)}`;
    return this.http.get<CanopyProcessModel[]>(url);
  }

  getPlanContext(machineCode: string, kva: string, model: string, pcCode: string)
    : Observable<CanopyProcessPlanContext | null> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyProcessPlanContext`
      + `?machineCode=${encodeURIComponent(machineCode)}`
      + `&kva=${encodeURIComponent(kva)}`
      + `&model=${encodeURIComponent(model)}`
      + `&pcCode=${encodeURIComponent(pcCode)}`;
    return this.http.get<CanopyProcessPlanContext | null>(url);
  }

  getKitList(machineCode: string, pcCode: string, planCode: string, partCode: string)
    : Observable<CanopyProcessKit[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyProcessKitList`
      + `?machineCode=${encodeURIComponent(machineCode)}`
      + `&pcCode=${encodeURIComponent(pcCode)}`
      + `&planCode=${encodeURIComponent(planCode)}`
      + `&partCode=${encodeURIComponent(partCode)}`;
    return this.http.get<CanopyProcessKit[]>(url);
  }

  getKitContext(machineCode: string, kitCode: string, pcCode: string,
                planCode: string, partCode: string): Observable<CanopyProcessKitContext | null> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyProcessKitContext`
      + `?machineCode=${encodeURIComponent(machineCode)}`
      + `&kitCode=${encodeURIComponent(kitCode)}`
      + `&pcCode=${encodeURIComponent(pcCode)}`
      + `&planCode=${encodeURIComponent(planCode)}`
      + `&partCode=${encodeURIComponent(partCode)}`;
    return this.http.get<CanopyProcessKitContext | null>(url);
  }

  getPartRows(pcCode: string, prcQty: number, cpyPartCode: string,
              planCode: string, bomCode: string, pfbCode: string)
    : Observable<CanopyProcessPartRow[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyProcessPartRows`
      + `?pcCode=${encodeURIComponent(pcCode)}`
      + `&prcQty=${prcQty}`
      + `&cpyPartCode=${encodeURIComponent(cpyPartCode)}`
      + `&planCode=${encodeURIComponent(planCode)}`
      + `&bomCode=${encodeURIComponent(bomCode)}`
      + `&pfbCode=${encodeURIComponent(pfbCode)}`;
    return this.http.get<CanopyProcessPartRow[]>(url);
  }

  getAssemblyKitRows(pcCode: string, prcQty: number, cpyPartCode: string,
                     planCode: string, bomCode: string, pfbCode: string)
    : Observable<CanopyProcessAssemblyKitRow[]> {
    const url = `${this.baseUrl}CanopyAssembly/GetCanopyProcessAssemblyKitRows`
      + `?pcCode=${encodeURIComponent(pcCode)}`
      + `&prcQty=${prcQty}`
      + `&cpyPartCode=${encodeURIComponent(cpyPartCode)}`
      + `&planCode=${encodeURIComponent(planCode)}`
      + `&bomCode=${encodeURIComponent(bomCode)}`
      + `&pfbCode=${encodeURIComponent(pfbCode)}`;
    return this.http.get<CanopyProcessAssemblyKitRow[]>(url);
  }

  submit(req: SubmitCanopyProcessRequest): Observable<SubmitCanopyProcessResponse> {
    return this.http.post<SubmitCanopyProcessResponse>(
      `${this.baseUrl}CanopyAssembly/SubmitCanopyProcess`, req);
  }

  // Multipart upload with progress reporting. Callers subscribe to receive
  // HttpEvents (progress + response) directly.
  uploadFile(file: File, empCode: string): Observable<HttpEvent<any>> {
    const form = new FormData();
    form.append('fileUpload', file, file.name);
    form.append('FrmEcode', empCode);
    form.append('FileUploadType', 'Save');
    const req = new HttpRequest(
      'POST',
      `${this.baseUrl}CanopyAssembly/UploadCanopyProcessFile`,
      form,
      { reportProgress: true });
    return this.http.request(req);
  }

  deleteFile(fileName: string, empCode: string): Observable<any> {
    const form = new FormData();
    form.append('fileUpload', fileName);
    form.append('FrmEcode', empCode);
    form.append('FileUploadType', 'Delete');
    return this.http.post(
      `${this.baseUrl}CanopyAssembly/UploadCanopyProcessFile`, form);
  }
}
