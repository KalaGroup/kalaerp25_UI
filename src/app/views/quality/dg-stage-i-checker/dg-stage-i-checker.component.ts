import { Component, OnInit } from '@angular/core';
import {
  QualityService,
  DgStageICheckerResponse,
  DgStage3CheckerResponse,
  DefectResponse,
  QualityCheckpointResponse,
} from '../quality.service';
import { FormControl } from '@angular/forms';
import { sub } from 'date-fns';

// Stage 1 & 2 JobCard Interface
export interface JobCard {
  jobCardNo: string;
  kva: number;
  jPriority: string;
  phase: string;
  model: string;
  engSrNo: string;
  altSrNo: string;
  batSrNo?: string;
  bat2SrNo?: string;
  bat3SrNo?: string;
  bat4SrNo?: string;
  bat5SrNo?: string;
  bat6SrNo?: string;
  cpySrNo?: string;
  partDesc?: string;
  partCode?: string;
}

// Stage 3 JobCard Interface
export interface Stage3JobCard {
  pfbCode: string;
  profitCenterCode: string;
  qpcStatus: string;
  kva: number;
  model: string;
  partDesc: string;
  partCode: string;
  engine: string;
  alternator: string;
  canopy: string;
  controlPanel1: string;
  controlPanel2: string;
  battery1: string;
  battery2: string;
  battery3: string;
  battery4: string;
  battery5: string;
  battery6: string;
  krm: string;
}

export interface StageOption {
  value: string;
  label: string;
}

export interface DefectItem {
  qdcCode: string;
  defectName: string;
  actualValue: string;
  tolerance: string;
  instrument: string;
  rate: number;
  fromRange: string;
  toRange: string;
  isEditing?: boolean;
  //isSelected?: boolean;  // NEW: Track if defect is selected
}

// Quality Checkpoint Interface
export interface QualityCheckpoint {
  srNo: number;
  subAssemblyPart: string;
  qualityProcessCheckpoint: string;
  specification: string;
  remark: string;
  ok: boolean;
  sixM: number | null;
  raiseEsp: string;
  stageWiseQcId: number;
}

@Component({
  selector: 'app-dg-stage-i-checker',
  templateUrl: './dg-stage-i-checker.component.html',
  styleUrls: ['./dg-stage-i-checker.component.scss'],
})
export class DgStageICheckerComponent implements OnInit {
  profitcenterName = '';
  pccode = '';
  cid = '';
  ecode = '';
  selectedStage = '';

  readonly stages: StageOption[] = [
    { value: 'Stage1', label: 'Stage 1' },
    { value: 'Stage2', label: 'Stage 2' },
    { value: 'Stage3', label: 'Stage 3' },
  ];

  // Stage 1 & 2 Columns
  readonly baseColumns = [
    'srNo',
    'jobCardNo',
    'jPriority',
    'kva',
    'phase',
    'model',
    'engSrNo',
    'altSrNo',
  ];
  readonly stage2Columns = [
    'batSrNo',
    'bat2SrNo',
    'bat3SrNo',
    'bat4SrNo',
    'bat5SrNo',
    'bat6SrNo',
    'cpySrNo',
  ];

  // Stage 3 Columns
  readonly stage3BaseColumns = [
    'srNo',
    'pfbCode',
    'kva',
    'engine',
    'alternator',
    'canopy',
  ];
  readonly stage3AdditionalColumns = [
    'controlPanel1',
    'controlPanel2',
    'battery1',
    'battery2',
    'battery3',
    'battery4',
    'battery5',
    'battery6',
    'krm',
  ];

  readonly invalidValues = new Set([
    '',
    'NA',
    'N/A',
    '0',
    'NULL',
    'UNDEFINED',
    '-',
  ]);

  displayedColumns: string[] = [...this.baseColumns];

  // Replace readonly employeeList with dynamic data
  employeeList: { value: string; label: string }[] = [];
  filteredEmployees: { value: string; label: string }[] = [];

  // Data sources
  dataSource: JobCard[] = [];
  stage3DataSource: Stage3JobCard[] = [];

  // ============================================
  // DEFECT MODAL
  // ============================================
  isModalOpen = false;
  selectedJobCard: JobCard | null = null;
  selectedStage3JobCard: Stage3JobCard | null = null;
  defectModalStage = '';
  defectActionType: 'Rework' | 'Reject' | '' = ''; // NEW: Track action type

  readonly defectDisplayedColumns = [
    'srNo',
    'defectName',
    'actualValue',
    'tolerance',
    'instrument',
    'rate',
    'fromRange',
    'toRange',
    'action',
  ];
  defectDataSource: DefectItem[] = [];
  editBackup: DefectItem | null = null;

  // NEW: Temporary storage for defect data
  tempDefectData: DefectItem[] = [];
  hasDefectData = false; // NEW: Flag to show if defects are saved

  // ============================================
  // QUALITY CHECKPOINT MODAL
  // ============================================
  isQualityModalOpen = false;
  selectedJobCardForQuality: JobCard | null = null;
  selectedStage3JobCardForQuality: Stage3JobCard | null = null;

  // Modal Filters
  modalSelectedStage = '';
  modalFromKva: number | null = null;
  modalToKva: number | null = null;
  modalProfitCenter = '';

  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  // Quality Checkpoint Table
  readonly qualityCheckpointColumns = [
    'srNo',
    'subAssemblyPart',
    'qualityProcessCheckpoint',
    'specification',
    'remark',
    'ok',
    'sixM',
    'raiseEsp',
  ];
  qualityCheckpointDataSource: QualityCheckpoint[] = [];
  isLoadingCheckpoints = false;

  sixMOptions: { value: number; label: string }[] = [];

  constructor(private dgStageICheckerService: QualityService) {}

  ngOnInit(): void {
    const profitCenterName = localStorage.getItem('profitCenterName');
    const pccode = localStorage.getItem('ProfitCenter');
    this.cid = localStorage.getItem('companyId');
    this.ecode = localStorage.getItem('employeeCode');

    if (pccode) {
      this.pccode = pccode;
    }
    if (profitCenterName) {
      this.profitcenterName = profitCenterName;
    }
    this.loadEmployeeList();
    this.load6MOptions();
  }

  // Add this method
  loadEmployeeList(): void {
    this.dgStageICheckerService.getEmployeeList().subscribe({
      next: (response: any[]) => {
        this.employeeList = [
          { value: '', label: 'Select Employee' },
          ...response.map((emp) => ({
            value: emp.ECode,
            label: emp.EmployeeName,
          })),
        ];
        this.filteredEmployees = [...this.employeeList];
      },
      error: (error) => {
        console.error('Error fetching employee list:', error);
      },
    });
  }

  isValidValue(value: string | number | undefined | null): boolean {
    if (value == null) return false;
    return !this.invalidValues.has(String(value).trim().toUpperCase());
  }

  // Load 6M options from API
load6MOptions(): void {
  this.dgStageICheckerService.get6MOptions().subscribe({
    next: (response: any[]) => {
      this.sixMOptions = response.map((item) => ({
        value: item.Id,
        label: item.Name,
      }));
    },
    error: (error) => {
      console.error('Error fetching 6M options:', error);
    },
  });
}

  isStage3(): boolean {
    return this.selectedStage === 'Stage3';
  }

  loadJobCards(): void {
    if (this.selectedStage === 'Stage3') {
      this.loadStage3QAPendingList();
    } else {
      this.loadStage1Or2QAPendingList();
    }
  }

  loadStage1Or2QAPendingList(): void {
    this.stage3DataSource = [];
    this.dgStageICheckerService
      .getDgStageICheckerData(this.selectedStage, this.pccode)
      .subscribe({
        next: (response: DgStageICheckerResponse[]) => {
          console.log('Stage 1/2 API Response:', response);
          this.dataSource = response.map((item) => ({
            jobCardNo: item.JobCode,
            kva: item.KVA,
            phase: item.Phase,
            model: item.Model,
            jPriority: item.J2Priority.toString(),
            engSrNo: item.EngSrNo,
            altSrNo: item.AltSrno,
            batSrNo: item.BatSrNo,
            bat2SrNo: item.Bat2SrNo,
            bat3SrNo: item.Bat3SrNo,
            bat4SrNo: item.Bat4SrNo,
            bat5SrNo: item.Bat5SrNo,
            bat6SrNo: item.Bat6SrNo,
            cpySrNo: item.CpySrno,
            partDesc: item.PartDesc || '',
            partCode: item.Partcode || '',
          }));
          this.updateDisplayedColumns();
        },
        error: (error) => console.error('Error fetching data:', error),
      });
  }

  loadStage3QAPendingList(): void {
    this.dataSource = [];
    this.dgStageICheckerService
      .getDgStage3CheckerData(this.selectedStage, this.pccode)
      .subscribe({
        next: (response: DgStage3CheckerResponse[]) => {
          console.log('Stage 3 API Response:', response);
          this.stage3DataSource = response.map((item) => ({
            pfbCode: item.PFBCode || '',
            profitCenterCode: item.ProfitCenterCode || '',
            qpcStatus: item.QPCStatus || '',
            kva: item.KVA || 0,
            model: item.Model || '',
            partDesc: item.PartDesc || '',
            partCode: item.Partcode || '',
            engine: item.Engine || '',
            alternator: item.Alternator || '',
            canopy: item.Canopy || '',
            controlPanel1: item.ControlPanel1 || '',
            controlPanel2: item.ControlPanel2 || '',
            battery1: item.Battery1 || '',
            battery2: item.Battery2 || '',
            battery3: item.Battery3 || '',
            battery4: item.Battery4 || '',
            battery5: item.Battery5 || '',
            battery6: item.Battery6 || '',
            krm: item.KRM || '',
          }));
          this.updateDisplayedColumns();
        },
        error: (error) => console.error('Error fetching Stage 3 data:', error),
      });
  }

  updateDisplayedColumns(): void {
    if (this.selectedStage === 'Stage3') {
      this.displayedColumns = [...this.stage3BaseColumns];
      this.stage3AdditionalColumns.forEach((col) => {
        if (
          this.stage3DataSource.some((row) =>
            this.isValidValue((row as any)[col]),
          )
        ) {
          this.displayedColumns.push(col);
        }
      });
    } else {
      this.displayedColumns = [...this.baseColumns];
      if (this.selectedStage === 'Stage2') {
        this.stage2Columns.forEach((col) => {
          if (
            this.dataSource.some((row) => this.isValidValue((row as any)[col]))
          ) {
            this.displayedColumns.push(col);
          }
        });
      }
    }
  }

  onStageChange(): void {
    this.dataSource = [];
    this.stage3DataSource = [];
    this.displayedColumns = [];
    if (this.selectedStage) {
      this.loadJobCards();
    }
  }

  // ============================================
  // QUALITY CHECKPOINT MODAL
  // ============================================
  onJobCardClick(element: any): void {
    if (this.selectedStage === 'Stage3') {
      this.selectedStage3JobCardForQuality = element as Stage3JobCard;
      this.selectedJobCardForQuality = null;
    } else {
      this.selectedJobCardForQuality = element as JobCard;
      this.selectedStage3JobCardForQuality = null;
    }

    this.modalSelectedStage = this.selectedStage;
    this.modalProfitCenter = 'unit1';
    if (this.selectedJobCardForQuality) {
      this.modalFromKva = this.selectedJobCardForQuality.kva;
      this.modalToKva = this.selectedJobCardForQuality.kva;
    } else {
      this.modalFromKva = null;
      this.modalToKva = null;
    }

    // Reset defect data when opening new quality modal
    this.tempDefectData = [];
    this.hasDefectData = false;
    this.defectActionType = '';

    this.isQualityModalOpen = true;
    this.loadQualityCheckpointData();
  }

  loadQualityCheckpointData(): void {
    let kvaValue: number | null = null;

    if (this.selectedJobCardForQuality) {
      kvaValue = this.selectedJobCardForQuality.kva;
    } else if (this.selectedStage3JobCardForQuality) {
      kvaValue = this.selectedStage3JobCardForQuality.kva;
    }

    if (!this.modalSelectedStage || !this.pccode || kvaValue === null) {
      console.warn('Missing required parameters: Stage, PCCode or KVA');
      this.qualityCheckpointDataSource = [];
      return;
    }

    this.isLoadingCheckpoints = true;

    this.dgStageICheckerService
      .getStageAndKvaWiseCheckpointList(
        this.modalSelectedStage,
        this.pccode,
        kvaValue,
      )
      .subscribe({
        next: (response: QualityCheckpointResponse[]) => {
          console.log('Quality Checkpoint API Response:', response);
          this.qualityCheckpointDataSource = response.map((item) => ({
            srNo: item.SrNo,
            subAssemblyPart: item.SubAssemblyPart || '',
            qualityProcessCheckpoint: item.QualityProcessCheckpoint || '',
            specification: item.Specification || '',
            remark: '',
            ok: false,
            sixM: null,
            raiseEsp: '',
            stageWiseQcId: item.StageWiseQcid || 0,
          }));
          this.isLoadingCheckpoints = false;
        },
        error: (error) => {
          console.error('Error fetching quality checkpoint data:', error);
          this.qualityCheckpointDataSource = [];
          this.isLoadingCheckpoints = false;
        },
      });
  }

  onModalProfitCenterChange(): void {
    this.loadQualityCheckpointData();
  }

  onModalStageChange(): void {
    this.loadQualityCheckpointData();
  }

  onModalFromKvaChange(): void {
    if (
      this.modalFromKva &&
      this.modalToKva &&
      this.modalFromKva > this.modalToKva
    ) {
      this.modalToKva = this.modalFromKva;
    }
    this.loadQualityCheckpointData();
  }

  onModalToKvaChange(): void {
    if (
      this.modalFromKva &&
      this.modalToKva &&
      this.modalToKva < this.modalFromKva
    ) {
      this.modalFromKva = this.modalToKva;
    }
    this.loadQualityCheckpointData();
  }

  closeQualityModal(): void {
    this.isQualityModalOpen = false;
    this.selectedJobCardForQuality = null;
    this.selectedStage3JobCardForQuality = null;
    this.qualityCheckpointDataSource = [];
    this.modalSelectedStage = '';
    this.modalFromKva = null;
    this.modalToKva = null;
    this.modalProfitCenter = '';

    // Reset defect data
    this.tempDefectData = [];
    this.hasDefectData = false;
    this.defectActionType = '';

    // Also close defect modal if open
    this.isModalOpen = false;
    this.defectDataSource = [];
  }

  onToggleOk(element: QualityCheckpoint): void {
    element.ok = !element.ok;
  }

  // ============================================
  // ACTION BUTTONS - Accept, Rework, Reject
  // ============================================
  onAccept(): void {
    this.saveQualityData('Accept');
  }

  onRework(): void {
    this.defectActionType = 'Rework';
    this.openDefectModal();
  }

  onReject(): void {
    this.defectActionType = 'Reject';
    this.openDefectModal();
  }

  // Final save for Rework/Reject (called from Quality Modal)
  // onSaveReworkReject(): void {
  //   if (!this.defectActionType) {
  //     this.warningMessage =
  //       'Please select Rework or Reject and add defects first.';
  //     return;
  //   }

  //   if (this.tempDefectData.length === 0) {
  //     this.warningMessage = 'Please add defects before saving.';
  //     return;
  //   }

  //   this.saveQualityData(this.defectActionType);
  // }
  // Final save for Rework/Reject (called from Quality Modal)
onSaveReworkReject(): void {
  if (!this.defectActionType) {
    this.warningMessage = 'Please select Rework or Reject and add defects first.';
    return;
  }

  if (this.tempDefectData.length === 0) {
    this.warningMessage = 'Please add defects before saving.';
    return;
  }

  // NEW: Validate 6M and Raise ESP
  const invalidRows = this.qualityCheckpointDataSource.filter(
    (item) => this.is6MSelected(item) && !item.raiseEsp
  );

  if (invalidRows.length > 0) {
    this.warningMessage = 'Please select an employee for all rows where 6M is selected.';
    return;
  }

  this.saveQualityData(this.defectActionType);
}

  saveQualityData(qualityStatus: string): void {
    // Base data (common for all stages)
    const QPCheckerData: any = {
      pccode: this.pccode,
      cid: this.cid,
      stageName: this.modalSelectedStage,
      qualityStatus: qualityStatus,
      ecode: this.ecode,
    };

    // Stage 1 & 2: Add JobCode and related fields
    if (
      this.modalSelectedStage === 'Stage1' ||
      this.modalSelectedStage === 'Stage2'
    ) {
      QPCheckerData.jobCode = this.selectedJobCardForQuality?.jobCardNo || '';
      QPCheckerData.partCode = this.selectedJobCardForQuality?.partCode || '';
      QPCheckerData.kva = this.selectedJobCardForQuality?.kva || 0;
      QPCheckerData.priority = parseInt(
        this.selectedJobCardForQuality?.jPriority || '0',
        10,
      );
      QPCheckerData.model = this.selectedJobCardForQuality?.model || '';
      QPCheckerData.engSrNo = this.selectedJobCardForQuality?.engSrNo || '';
      QPCheckerData.altSrNo = this.selectedJobCardForQuality?.altSrNo || '';
    }

    // Stage 2: Add battery and canopy fields
    if (this.modalSelectedStage === 'Stage2') {
      QPCheckerData.cpySrNo = this.selectedJobCardForQuality?.cpySrNo || '';
      QPCheckerData.batSrNo = this.selectedJobCardForQuality?.batSrNo || '';
      QPCheckerData.bat2SrNo = this.selectedJobCardForQuality?.bat2SrNo || '';
      QPCheckerData.bat3SrNo = this.selectedJobCardForQuality?.bat3SrNo || '';
      QPCheckerData.bat4SrNo = this.selectedJobCardForQuality?.bat4SrNo || '';
      QPCheckerData.bat5SrNo = this.selectedJobCardForQuality?.bat5SrNo || '';
      QPCheckerData.bat6SrNo = this.selectedJobCardForQuality?.bat6SrNo || '';
    }

    // Stage 3: Add PFBCode and all Stage 3 specific fields
    if (this.modalSelectedStage === 'Stage3') {
      QPCheckerData.pfbCode =
        this.selectedStage3JobCardForQuality?.pfbCode || '';
      QPCheckerData.partCode =
        this.selectedStage3JobCardForQuality?.partCode || '';
      QPCheckerData.kva = this.selectedStage3JobCardForQuality?.kva || 0;
      QPCheckerData.model = this.selectedStage3JobCardForQuality?.model || '';
      QPCheckerData.engine = this.selectedStage3JobCardForQuality?.engine || '';
      QPCheckerData.alternator =
        this.selectedStage3JobCardForQuality?.alternator || '';
      QPCheckerData.canopy = this.selectedStage3JobCardForQuality?.canopy || '';
      QPCheckerData.controlPanel1 =
        this.selectedStage3JobCardForQuality?.controlPanel1 || '';
      QPCheckerData.controlPanel2 =

        this.selectedStage3JobCardForQuality?.controlPanel2 || '';
      QPCheckerData.battery1 =
        this.selectedStage3JobCardForQuality?.battery1 || '';
      QPCheckerData.battery2 =
        this.selectedStage3JobCardForQuality?.battery2 || '';
      QPCheckerData.battery3 =
        this.selectedStage3JobCardForQuality?.battery3 || '';
      QPCheckerData.battery4 =
        this.selectedStage3JobCardForQuality?.battery4 || '';
      QPCheckerData.battery5 =
        this.selectedStage3JobCardForQuality?.battery5 || '';
      QPCheckerData.battery6 =
        this.selectedStage3JobCardForQuality?.battery6 || '';
      QPCheckerData.krm = this.selectedStage3JobCardForQuality?.krm || '';
    }

    // Quality Checkpoint data
    const QPCheckerDetailsData = this.qualityCheckpointDataSource.map(
      (item) => ({
        srNo: item.srNo,
        subAssemblyPart: item.subAssemblyPart,
        stageWiseQcId: item.stageWiseQcId,
        remark: item.remark,
        ok: item.ok ? 'OK' : 'NOK',
        sixM: this.sixMOptions.find(opt => opt.value === item.sixM)?.label || '',
        raiseEsp: item.raiseEsp,
      }),
    );

    // Combined payload
    const payload: any = {
      QProcessCheckerData: QPCheckerData,
      checkpointsDetails: QPCheckerDetailsData,
    };

    // Add defect data for Rework/Reject
    if (qualityStatus === 'Rework' || qualityStatus === 'Reject') {
      payload.defectDetails = this.tempDefectData.map((item, index) => ({
        qdcCode: item.qdcCode,
        actualValue: item.actualValue ? parseFloat(item.actualValue) : 0,
        tolerance: item.tolerance ? parseFloat(item.tolerance) : 0,
        instrument: item.instrument || '',
        rate: item.rate || 0,
        fromRange: item.fromRange ? parseFloat(item.fromRange) : 0,
        toRange: item.toRange ? parseFloat(item.toRange) : 0,
      }));
    }

    // ===== ACTUAL API CALL =====
    this.dgStageICheckerService.saveQAStatusStagewise(payload).subscribe({
      next: (response) => {
        console.log('API Response:', response);

        // Close the quality modal first
        this.closeQualityModal();

        // Show success message
        this.successMessage = `Quality status "${qualityStatus}" saved successfully!`;

        // Reload the job cards list
        this.loadJobCards();
      },
      error: (error) => {
        console.error('API Error:', error);

        // Show error message - DO NOT close modal
        this.errorMessage =
          error?.error?.message ||
          error?.message ||
          'Error saving quality status. Please try again.';
      },
    });
  }

  openDefectModal(): void {
    this.defectModalStage = this.modalSelectedStage;

    if (this.selectedJobCardForQuality) {
      this.selectedJobCard = { ...this.selectedJobCardForQuality };
      this.selectedStage3JobCard = null;
    } else if (this.selectedStage3JobCardForQuality) {
      this.selectedStage3JobCard = { ...this.selectedStage3JobCardForQuality };
      this.selectedJobCard = null;
    }

    this.isModalOpen = true;

    // If we have temp data, restore it; otherwise load fresh
    if (this.tempDefectData.length > 0) {
      this.defectDataSource = [...this.tempDefectData];
    } else {
      this.loadDefectData();
    }
  }

  loadDefectData(): void {
    this.dgStageICheckerService
      .getDefectData(this.defectModalStage, this.pccode)
      .subscribe({
        next: (response: DefectResponse[]) => {
          console.log('Defect Data API Response:', response);
          this.defectDataSource = response.map((item) => ({
            qdcCode: item.QDCCode,
            defectName: item.QDCName,
            actualValue: '',
            tolerance: '',
            instrument: '',
            rate: item.Rate,
            fromRange: '',
            toRange: '',
            isEditing: false,
            //isSelected: false,  // NEW: Default not selected
          }));
        },
        error: (error) => {
          console.error('Error fetching defect data:', error);
          this.defectDataSource = [];
        },
      });
  }

  isStage3ForDefect(): boolean {
    return this.defectModalStage === 'Stage3';
  }

  // UPDATE: Get count of defects (all defects count)
  getDefectsCount(): number {
    return this.defectDataSource.length;
  }

  // UPDATE: Get count from temp data
  getDefectsCountFromTemp(): number {
    return this.tempDefectData.length;
  }

  // UPDATE: Check if defects exist
  hasDefects(): boolean {
    return this.defectDataSource.length > 0;
  }

  onEditDefect(element: DefectItem): void {
    this.defectDataSource.forEach((item) => (item.isEditing = false));
    this.editBackup = { ...element };
    element.isEditing = true;
  }

  // onUpdateDefect(element: DefectItem): void {
  //   element.isEditing = false;
  //   this.editBackup = null;
  //   console.log('Updated defect:', element);
  // }

  onUpdateDefect(element: DefectItem): void {
  // Validate all required fields
  const errors: string[] = [];

  if (!element.actualValue || element.actualValue.trim() === '') {
    errors.push('Actual Value');
  }
  if (!element.tolerance || element.tolerance.trim() === '') {
    errors.push('Tolerance');
  }
  if (!element.instrument || element.instrument.trim() === '') {
    errors.push('Instrument');
  }
  if (!element.fromRange || element.fromRange.trim() === '') {
    errors.push('From Range');
  }
  if (!element.toRange || element.toRange.trim() === '') {
    errors.push('To Range');
  }

  // Validate From Range <= To Range
  if (element.fromRange && element.toRange) {
    const fromVal = parseFloat(element.fromRange);
    const toVal = parseFloat(element.toRange);
    if (!isNaN(fromVal) && !isNaN(toVal) && fromVal > toVal) {
      errors.push('From Range must be less than or equal to To Range');
    }
  }

  if (errors.length > 0) {
    this.warningMessage = `Please fill: ${errors.join(', ')}`;
    return;
  }

  element.isEditing = false;
  this.editBackup = null;
  console.log('Updated defect:', element);
}

// Check if defect row has all required values filled
isDefectComplete(element: DefectItem): boolean {
  return !!(
    element.actualValue && element.actualValue.trim() !== '' &&
    element.tolerance && element.tolerance.trim() !== '' &&
    element.instrument && element.instrument.trim() !== '' &&
    element.fromRange && element.fromRange.trim() !== '' &&
    element.toRange && element.toRange.trim() !== ''
  );
}

// Get count of complete defects
getCompleteDefectsCount(): number {
  return this.defectDataSource.filter(d => this.isDefectComplete(d)).length;
}

  onCancelEdit(element: DefectItem): void {
    if (this.editBackup) {
      Object.assign(element, {
        actualValue: this.editBackup.actualValue,
        tolerance: this.editBackup.tolerance,
        instrument: this.editBackup.instrument,
        fromRange: this.editBackup.fromRange,
        toRange: this.editBackup.toRange,
      });
    }
    element.isEditing = false;
    this.editBackup = null;
  }

  // NEW: Save defects temporarily and close modal
  // Save defects temporarily and close modal
  // onSaveDefectsTemp(): void {
  //   if (this.defectDataSource.length === 0) {
  //     this.warningMessage = 'No defects available.';
  //     return;
  //   }

  //   // Store all defects temporarily
  //   this.tempDefectData = [...this.defectDataSource];
  //   this.hasDefectData = true;

  //   console.log('Defects saved temporarily:', this.tempDefectData);

  //   // Close defect modal
  //   this.closeModal();
  // }

  onSaveDefectsTemp(): void {
  if (this.defectDataSource.length === 0) {
    this.warningMessage = 'No defects available.';
    return;
  }

  // Check if any defect is currently being edited
  const editingDefect = this.defectDataSource.find(d => d.isEditing);
  if (editingDefect) {
    this.warningMessage = 'Please complete or cancel the current edit before saving.';
    return;
  }

  // Check if at least one defect is complete
  const completeDefects = this.defectDataSource.filter(d => this.isDefectComplete(d));
  if (completeDefects.length === 0) {
    this.warningMessage = 'Please fill at least one defect with all required values.';
    return;
  }

  // Store only complete defects temporarily
  this.tempDefectData = [...completeDefects];
  this.hasDefectData = true;

  console.log('Defects saved temporarily:', this.tempDefectData);

  // Close defect modal
  this.closeModal();
}

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedJobCard = null;
    this.selectedStage3JobCard = null;
    this.defectDataSource = [];
    this.editBackup = null;
    this.defectModalStage = '';
    // Don't reset defectActionType and tempDefectData here!
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  getStageLabel(stageValue: string): string {
    return this.stages.find((s) => s.value === stageValue)?.label || stageValue;
  }

  getCurrentJobCardNo(): string {
    if (this.selectedJobCardForQuality) {
      return this.selectedJobCardForQuality.jobCardNo;
    } else if (this.selectedStage3JobCardForQuality) {
      return this.selectedStage3JobCardForQuality.pfbCode;
    }
    return '';
  }

  getCurrentKva(): number | null {
    if (this.selectedJobCardForQuality) {
      return this.selectedJobCardForQuality.kva;
    }
    return null;
  }

  hasStage2AdditionalDetails(): boolean {
    if (!this.selectedJobCardForQuality) return false;
    return (
      this.isValidValue(this.selectedJobCardForQuality.batSrNo) ||
      this.isValidValue(this.selectedJobCardForQuality.bat2SrNo) ||
      this.isValidValue(this.selectedJobCardForQuality.bat3SrNo) ||
      this.isValidValue(this.selectedJobCardForQuality.bat4SrNo) ||
      this.isValidValue(this.selectedJobCardForQuality.bat5SrNo) ||
      this.isValidValue(this.selectedJobCardForQuality.bat6SrNo) ||
      this.isValidValue(this.selectedJobCardForQuality.cpySrNo)
    );
  }

  hasStage3QualityBatteries(): boolean {
    if (!this.selectedStage3JobCardForQuality) return false;
    return (
      this.isValidValue(this.selectedStage3JobCardForQuality.krm) ||
      this.isValidValue(this.selectedStage3JobCardForQuality.battery1) ||
      this.isValidValue(this.selectedStage3JobCardForQuality.battery2) ||
      this.isValidValue(this.selectedStage3JobCardForQuality.battery3) ||
      this.isValidValue(this.selectedStage3JobCardForQuality.battery4) ||
      this.isValidValue(this.selectedStage3JobCardForQuality.battery5) ||
      this.isValidValue(this.selectedStage3JobCardForQuality.battery6)
    );
  }

  hasStage3AdditionalDetails(): boolean {
    if (!this.selectedStage3JobCard) return false;
    return (
      this.isValidValue(this.selectedStage3JobCard.canopy) ||
      this.isValidValue(this.selectedStage3JobCard.controlPanel1) ||
      this.isValidValue(this.selectedStage3JobCard.controlPanel2) ||
      this.isValidValue(this.selectedStage3JobCard.krm) ||
      this.isValidValue(this.selectedStage3JobCard.battery1) ||
      this.isValidValue(this.selectedStage3JobCard.battery2)
    );
  }

  hasStage3MoreBatteries(): boolean {
    if (!this.selectedStage3JobCard) return false;
    return (
      this.isValidValue(this.selectedStage3JobCard.battery3) ||
      this.isValidValue(this.selectedStage3JobCard.battery4) ||
      this.isValidValue(this.selectedStage3JobCard.battery5) ||
      this.isValidValue(this.selectedStage3JobCard.battery6)
    );
  }

  // ============================================
  // NUMERIC INPUT HANDLERS
  // ============================================
  onNumericKeyPress(event: KeyboardEvent): void {
    const char = event.key;
    const input = event.target as HTMLInputElement;

    if (char === '.' && input.value.includes('.')) {
      event.preventDefault();
    } else if (!/[\d.]/.test(char)) {
      event.preventDefault();
    }
  }

  onNumericPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const pasted = event.clipboardData?.getData('text') || '';

    let sanitized = pasted.replace(/[^\d.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }
    if (input.value.includes('.')) {
      sanitized = sanitized.replace('.', '');
    }

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    input.value =
      input.value.slice(0, start) + sanitized + input.value.slice(end);
    input.dispatchEvent(new Event('input'));
  }

  onNumericInput(event: Event, element: DefectItem, field: string): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^\d.]/g, '');

    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    (element as any)[field] = value;
    input.value = value;
  }

  onNumericBlur(event: Event, element: DefectItem, field: string): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    if (value === '.') value = '';
    else if (value.startsWith('.')) value = '0' + value;
    else if (value.endsWith('.')) value = value.slice(0, -1);

    (element as any)[field] = value;
    input.value = value;
  }

  // ============================================
  // RAISE ESP AUTOCOMPLETE METHODS
  // ============================================

  filterEmployees(event: Event): void {
    const input = event.target as HTMLInputElement;
    const filterValue = input.value.toLowerCase().trim();

    if (!filterValue) {
      this.filteredEmployees = [...this.employeeList];
    } else {
      this.filteredEmployees = this.employeeList.filter(
        (emp) =>
          emp.label.toLowerCase().includes(filterValue) ||
          emp.value.toLowerCase().includes(filterValue),
      );
    }
  }

  onEmployeeSelected(element: QualityCheckpoint, selectedValue: string): void {
    element.raiseEsp = selectedValue;
  }

  getEmployeeLabel(value: string): string {
    if (!value) return '';
    const emp = this.employeeList.find((e) => e.value === value);
    return emp ? emp.label : value;
  }

  displayEmployeeFn = (value: string): string => {
    return this.getEmployeeLabel(value);
  };

  onEspFocus(): void {
    // Reset filter when input is focused
    this.filteredEmployees = [...this.employeeList];
  }

  clearEspSelection(element: QualityCheckpoint, event: Event): void {
    event.stopPropagation();
    element.raiseEsp = '';
  }

  // ============================================
  // MESSAGE HANDLERS
  // ============================================
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
  }

  onSuccessOk(): void {
    this.successMessage = '';
  }

  onErrorOk(): void {
    this.errorMessage = '';
  }

  onWarningOk(): void {
    this.warningMessage = '';
  }

  // Check if 6M is selected (not null and not 0/None)
is6MSelected(element: QualityCheckpoint): boolean {
  return element.sixM !== null && element.sixM !== 0;
}

// Handle 6M change - clear raiseEsp if 6M is cleared
on6MChange(element: QualityCheckpoint): void {
  if (!this.is6MSelected(element)) {
    element.raiseEsp = '';  // Clear employee selection when 6M is None/cleared
  }
}



}
