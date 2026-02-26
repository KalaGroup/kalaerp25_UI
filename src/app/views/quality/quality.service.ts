import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import {
  CheckpointRequest,
  CheckpointResponse,
} from './quality-master-checker/quality-master-checker.component';

export interface KaizenSheetRecord {
  id: number;
  kaizenSheetNo: string;
  divisionId: number | null;
  divisionName: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  workstationCode: string | null;
  workstationName: string | null;
  kaizenTheme: string | null;
  kaizenInitiationDate: string | null;
  completionDate: string | null;
  problemWhat: string | null;
  problemWhen: string | null;
  problemWhere: string | null;
  problemWho: string | null;
  problemWhy: string | null;
  problemHow: string | null;
  problemHowMuch: string | null;
  beforePhotoPath: string | null;
  beforePhotoName: string | null;
  afterPhotoPath: string | null;
  afterPhotoName: string | null;
  rcaWhy1: string | null;
  rcaWhy2: string | null;
  rcaWhy3: string | null;
  rcaWhy4: string | null;
  rcaWhy5: string | null;
  idea: string | null;
  ideaRemark: string | null;
  countermeasureRemark: string | null;
  result: string | null;
  improvement: string | null;
  benefit: string | null;
  investmentArea: string | null;
  savingArea: string | null;
  horizontalDeployment: string | null;
  impactGraphPath: string | null;
  impactGraphName: string | null;
  sustenanceWhatToDo: string | null;
  sustenanceHowToDo: string | null;
  sustenanceFrequency: string | null;
  dataSubmittedBy: string | null;
  dataSubmittedOn: string | null;
  isActive: boolean;
  isDiscard: boolean;
  isAuth: boolean;
}

export interface CreateKaizenSheetResponse {
 // id: number;
  kaizenSheetNo: string;
  message: string;
}

export interface DivisionResponse {
  DivisionId: number;
  DivisionName: string;
}

export interface DepartmentResponse {
  DepartmentCode: number;
  DepartmentName: string;
}

export interface CalibrationInstrumentResponse {
  partcode: string;
  instrument: string;
}

export interface WorkstationResponse {
  WorkstationCode: string;
  WorkstationName: string;
}

export interface CalibrationMstResponse {
  InstrumentId: number;
  CompanyId: number;
  PartCode: string;
  Type: string;
  IdNo: string;
  SrNo: string;
  Make: string;
  Range: string;
  Unit: string;
  Lc: string;
  Location: string;
  CalDate: string;
  DueDate: string;
  IsActive: number;
  IsDiscard: number;
  Auth: number;
  MakerRemark: string;
  CheckerRemark: string;
}

export interface CompanyResponse {
  CID: string;
  CCode: string | null;
  CName: string;
}

export interface LocationPCResponse {
  PCName: string;
  PCCode: string;
}

export interface DgStageICheckerResponse {
  Stage4Code: string;
  TRCode: string;
  SelectR: number;
  KVA: number;
  Phase: string;
  PartDesc: string;
  Model: string;
  Panel: string;
  EngSrNo: string;
  AltSrno: string;
  CpySrno: string;
  BatSrNo: string;
  Bat2SrNo: string;
  Bat3SrNo: string;
  Bat4SrNo: string;
  Bat5SrNo: string;
  Bat6SrNo: string;
  CPSrNo: string;
  CP2SrNo: string;
  KRMSrNo: string;
  Partcode: string;
  JobCode: string;
  J2Priority: number;
  Dt: string;
  JobCard1: string;
  PanelType: string;
}

// Stage 3 Response - Match API response exactly
export interface DgStage3CheckerResponse {
  PFBCode: string;
  ProfitCenterCode: string;
  QPCStatus: string;
  KVA: number;
  Phase: string;
  Model: string;
  PartDesc: string;
  Partcode: string;
  Engine: string;
  Alternator: string;
  Canopy: string;
  ControlPanel1: string;
  ControlPanel2: string;
  Battery1: string;
  Battery2: string;
  Battery3: string;
  Battery4: string;
  Battery5: string;
  Battery6: string;
  KRM: string;
}

export interface DefectResponse {
  PCCode: string;
  QDCCode: string;
  QDCName: string;
  Stage: string;
  Rate: number;
  CID: string;
  CompanyCode: string;
}

export interface DGAssemblyProfitcenterResponse {
  ProfitCenter_Act: string;
  PCName: string;
}

export interface PartKvaResponse {
  KVA: number;
}

export interface PendingAuthQcResponse {
  StageWiseQcid: number;
  Pccode: string;
  PCName: string;
  StageName: string;
  FromKva: number;
  ToKva: number;
}

export interface QualityCheckpointResponse {
  StageWiseQcid: number;
  SrNo: number;
  SubAssemblyPart: string;
  QualityProcessCheckpoint: string;
  Specification: string;
}

@Injectable({
  providedIn: 'root',
})
export class QualityService {
  private baseUrl = environment.apiURL;
  constructor(private http: HttpClient) {}
  getDgStageICheckerData(stageName: string, pccode: string): Observable<any> {
    const url = `${this.baseUrl}DgStageChecker/GetStageQAPendingList/${stageName}/${pccode}`;
    return this.http.get<any>(url);
  }

  // Get Company List for dropdown
  getCompanyList(): Observable<CompanyResponse[]> {
    const url = `${this.baseUrl}Quality/GetCompany`;
    return this.http.get<CompanyResponse[]>(url);
  }

  getPCNames(): Observable<LocationPCResponse[]> {
    const url = `${this.baseUrl}Quality/GetPCNames`;
    return this.http.get<LocationPCResponse[]>(url);
  }

  // fetch Division Code and Name for kaizen form dropdown
  getDivisionCodeAndName(): Observable<DivisionResponse[]> {
    const url = `${this.baseUrl}Quality/GetDivisionCodeAndName`;
    return this.http.get<DivisionResponse[]>(url);
  }

  // fetch Division Code and Name for kaizen form dropdown
  getDepartmentsByDivisionId(
    divisionId: number,
  ): Observable<DepartmentResponse[]> {
    const url = `${this.baseUrl}Quality/GetDepartmentsByDivisionId/${divisionId}`;
    return this.http.get<DepartmentResponse[]>(url);
  }

  // fetch Division Code and Name for kaizen form dropdown
  getWorkstationCodeAndName(): Observable<WorkstationResponse[]> {
    const url = `${this.baseUrl}Quality/GetWorkstationCodeAndName`;
    return this.http.get<WorkstationResponse[]>(url);
  }

  // For Stage 3
  getDgStage3CheckerData(
    stageName: string,
    pccode: string,
  ): Observable<DgStage3CheckerResponse[]> {
    const url = `${this.baseUrl}DgStageChecker/GetStageQAPendingList/${stageName}/${pccode}`;
    return this.http.get<DgStage3CheckerResponse[]>(url);
  }

  getDefectData(
    stageName: string,
    profitCenter: string,
  ): Observable<DefectResponse[]> {
    return this.http.get<DefectResponse[]>(
      `${this.baseUrl}DgStageChecker/GetStageQualityDefect/${stageName}/${profitCenter}`,
    );
  }

  getDGAssemblyProfitcenters(): Observable<DGAssemblyProfitcenterResponse[]> {
    const url = `${this.baseUrl}DgStageChecker/GetDGAssemblyProfitcenters`;
    return this.http.get<DGAssemblyProfitcenterResponse[]>(url);
  }

  getActivePartKvaList(): Observable<PartKvaResponse[]> {
    const url = `${this.baseUrl}DgStageChecker/GetActivePartKvaList`;
    return this.http.get<PartKvaResponse[]>(url);
  }

  insertDgQualityMaster(data: any): Observable<any> {
    const url = `${this.baseUrl}DgStageChecker/SaveStageWiseQualityCheckList`;
    return this.http.post<any>(url, data);
  }

  // Add to quality.service.ts
  checkDuplicateQualityCheckList(
    pcCode: string,
    stageName: string,
    fromKva: string,
    toKva: string,
  ): Observable<{ isDuplicate: boolean }> {
    const url = `${this.baseUrl}DgStageChecker/CheckDuplicateQualityCheckList/${pcCode}/${stageName}/${fromKva}/${toKva}`;
    return this.http.get<{ isDuplicate: boolean }>(url);
  }

  getPendingAuthQcData(): Observable<PendingAuthQcResponse[]> {
    return this.http.get<PendingAuthQcResponse[]>(
      `${this.baseUrl}DgStageChecker/GetAllPendingAuthQualityList`,
    );
  }

  // Fetch checkpoint data using StageWiseQcid - GET with route parameter
  getCheckpointData(stageWiseQcid: number): Observable<CheckpointResponse[]> {
    return this.http.get<CheckpointResponse[]>(
      `${this.baseUrl}DgStageChecker/GetPendingAuthQAListDetails/${stageWiseQcid}`,
    );
  }

  // Save checkpoint data
  saveCheckpointData(data: any): Observable<any> {
    const url = `${this.baseUrl}DgStageChecker/SaveOrUpdateQualityCheckpoint`;
    return this.http.post<any>(url, data);
  }

  getStageAndKvaWiseCheckpointList(
    stageName: string,
    pcCode: string,
    kva: number,
  ): Observable<QualityCheckpointResponse[]> {
    return this.http.get<QualityCheckpointResponse[]>(
      `${this.baseUrl}DgStageChecker/GetStageAndKvaWiseCheckpointList/${stageName}/${pcCode}/${kva}`,
    );
  }

  // Save Quality Process Check Status
  saveQAStatusStagewise(data: any): Observable<any> {
    const url = `${this.baseUrl}DgStageChecker/SaveQAStatusStagewise`;
    return this.http.post<any>(url, data);
  }

  //fetch Employee List to raise ESP
  getEmployeeList(): Observable<any[]> {
    const url = `${this.baseUrl}DgStageChecker/FetchEmployeeListToRaiseESP`;
    return this.http.get<any[]>(url);
  }

  // Fetch 6M dropdown options
  get6MOptions(): Observable<any[]> {
    const url = `${this.baseUrl}DgStageChecker/Select6MFromDB`;
    return this.http.get<any[]>(url);
  }

  getPartcodesForCalibration(): Observable<CalibrationInstrumentResponse[]> {
    const url = `${this.baseUrl}Quality/GetPartcodesForCalibration`;
    return this.http.get<CalibrationInstrumentResponse[]>(url);
  }

  saveCalibrationMaster(data: any): Observable<any> {
    const url = `${this.baseUrl}Quality/SaveCalibrationMaster`;
    return this.http.post<any>(url, data);
  }

  getUnauthorizedCalibrationData(
    companyId: number,
  ): Observable<CalibrationMstResponse[]> {
    const url = `${this.baseUrl}Quality/GetUnauthorizedCalibrationData/${companyId}`;
    return this.http.get<CalibrationMstResponse[]>(url);
  }

  // Save Kaizen Sheet (FormData with file uploads)
  saveKaizenSheet(formData: FormData): Observable<CreateKaizenSheetResponse> {
    const url = `${this.baseUrl}Quality/SaveKaizenSheet`;
    return this.http.post<CreateKaizenSheetResponse>(url, formData);
  }

  getAllKaizenSheets(): Observable<KaizenSheetRecord[]> {
    const url = `${this.baseUrl}Quality/GetAllKaizenSheets`;
    return this.http.get<KaizenSheetRecord[]>(url);
  }

  deleteKaizenSheet(id: number): Observable<any> {
    const url = `${this.baseUrl}Quality/DeleteKaizenSheet/${id}`;
    return this.http.delete<any>(url);
  }

  updateKaizenSheet(id: number, formData: FormData): Observable<CreateKaizenSheetResponse> {
    const url = `${this.baseUrl}Quality/UpdateKaizenSheet/${id}`;
    return this.http.put<CreateKaizenSheetResponse>(url, formData);
  }

  // Build URL to fetch Kaizen uploaded file (image/graph)
  getKaizenFileUrl(filePath: string): string {
    if (!filePath) return '';
    return `${this.baseUrl}Quality/GetKaizenFile?path=${encodeURIComponent(filePath)}`;
  }

  authorizeKaizenSheet(id: number): Observable<any> {
    const url = `${this.baseUrl}Quality/AuthorizeKaizenSheet/${id}`;
    return this.http.put<any>(url, {});
  }

}
