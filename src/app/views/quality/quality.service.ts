import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import {
  CheckpointRequest,
  CheckpointResponse,
} from './quality-master-checker/quality-master-checker.component';

export interface CalibrationInstrumentResponse {
  partcode: string;
  instrument: string;
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

getUnauthorizedCalibrationData(companyId: number): Observable<CalibrationMstResponse[]> {
  const url = `${this.baseUrl}Quality/GetUnauthorizedCalibrationData/${companyId}`;
  return this.http.get<CalibrationMstResponse[]>(url);
}

}
