import { Component, OnInit } from '@angular/core';
import {
  QualityService,
  DgStageICheckerResponse,
  DgStage3CheckerResponse,
  DefectResponse,
  QualityCheckpointResponse,
  LineRight,
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
    standalone: false
})
export class DgStageICheckerComponent implements OnInit {
  profitcenterName = '';
  pcDisplay: string = '';
  pccode = '';
  cid = '';
  ecode = '';
  selectedStage = '';
  profitcenter_act: string = '';
  profitcenter_old: string = '';

  // ── Line-wise PC selector (replaces login-derived PC) ──
  prmCode: string = '';
  lineRights: LineRight[] = [];
  selectedLineWisePC: string = '';

  // ── UI-only pagination for the QA-pending list ─────────────
  currentPage: number = 1;
  pageSize: number = 25;
  pageSizeOptions: number[] = [25, 50, 100, 250, 500, 0]; // 0 == "All"

  // ── Load-in-flight flag for the QA-pending jobcard list ────
  isLoadingPendingList: boolean = false;


  readonly stages: StageOption[] = [
    { value: 'Stage1', label: 'Stage 1' },
    { value: 'Stage2', label: 'Stage 2' },
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
    const pccode_Act = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    const pccode_Old = localStorage.getItem('ProfitCenter_old')?.trim() ?? '';
    if (pccode_Act) {
      this.profitcenter_act = pccode_Act;
      this.profitcenter_old = pccode_Old;
    }
    this.cid = localStorage.getItem('companyId') ?? '';
    this.ecode = localStorage.getItem('employeeCode') ?? '';

    if (profitCenterName) {
      this.profitcenterName = profitCenterName;
    }

    // Composite label shown in the Profit Center field — "Name --> Code".
    // Same convention used in jobcard1.
    this.pcDisplay = this.profitcenterName && this.profitcenter_act
      ? `${this.profitcenterName} --> ${this.profitcenter_act}`
      : this.profitcenterName || this.profitcenter_act;

    this.prmCode = localStorage.getItem('positionRoleId')?.trim() ?? '';
    this.loadLineRights();
    this.loadEmployeeList();
    this.load6MOptions();
  }

  /** Full LineRight object behind the dropdown selection. */
  get selectedLineRight(): LineRight | undefined {
    return this.lineRights.find(l => l.LineWisePC === this.selectedLineWisePC);
  }

  // ────────────────────────────────────────────────────────────
  //  UI-only pagination — reference: eng-alt-certificate component
  // ────────────────────────────────────────────────────────────

  /** Row count of whichever list is active (Stage 1/2 vs Stage 3). */
  private get activeRowCount(): number {
    return this.isStage3() ? this.stage3DataSource.length : this.dataSource.length;
  }

  /** Slice of stage 1/2 rows for the current page (pageSize = 0 → all). */
  get pagedDataSource(): JobCard[] {
    if (this.pageSize === 0) return this.dataSource;
    const start = (this.currentPage - 1) * this.pageSize;
    return this.dataSource.slice(start, start + this.pageSize);
  }

  /** Slice of stage 3 rows for the current page (pageSize = 0 → all). */
  get pagedStage3DataSource(): Stage3JobCard[] {
    if (this.pageSize === 0) return this.stage3DataSource;
    const start = (this.currentPage - 1) * this.pageSize;
    return this.stage3DataSource.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    if (this.pageSize === 0) return 1;
    return Math.max(1, Math.ceil(this.activeRowCount / this.pageSize));
  }

  /** Up to 7 page-tab buttons centred around the current page. */
  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(this.currentPage - 3, total - 6));
    return Array.from({ length: 7 }, (_, i) => start + i);
  }

  goToPage(n: number): void {
    if (n < 1 || n > this.totalPages) return;
    this.currentPage = n;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  /** Renders "absolute" row number across pages — e.g. row 1 on page 3 with
   *  pageSize 25 displays as 51. */
  rowDisplayIndex(rowInPage: number): number {
    if (this.pageSize === 0) return rowInPage + 1;
    return (this.currentPage - 1) * this.pageSize + rowInPage + 1;
  }

  get recordRangeLabel(): string {
    const total = this.activeRowCount;
    if (total === 0) return '0 of 0';
    if (this.pageSize === 0) return `1–${total} of ${total}`;
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `${start}–${end} of ${total}`;
  }

  // ── Fetch the lines this position is entitled to post against ──
  private loadLineRights(): void {
    if (!this.prmCode) {
      console.warn('[DgStageIChecker] no positionRoleId in localStorage — skipping line rights fetch');
      this.lineRights = [];
      return;
    }
    this.dgStageICheckerService.getLineRights(this.prmCode).subscribe({
      next: (rows) => {
        this.lineRights = Array.isArray(rows) ? rows : [];
        console.log('[DgStageIChecker] line rights for', this.prmCode, '=>', this.lineRights);
        // Single-line position: auto-select so the dropdown isn't blank.
        if (this.lineRights.length === 1) {
          this.selectedLineWisePC = this.lineRights[0].LineWisePC;
        }
      },
      error: (err) => {
        console.error('[DgStageIChecker] line rights error', err);
        this.lineRights = [];
      },
    });
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
    this.dataSource = [];
    this.currentPage = 1;
    this.isLoadingPendingList = true;
    // Use the line picked from the dropdown (LineWisePC), not the login PC.
    const linePc = this.selectedLineRight?.LineWisePC ?? '';
    this.dgStageICheckerService
      .getDgStageICheckerData(this.selectedStage, linePc)
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
          this.isLoadingPendingList = false;
        },
        error: (error) => {
          console.error('Error fetching data:', error);
          this.isLoadingPendingList = false;
        },
      });
  }

  loadStage3QAPendingList(): void {
    this.dataSource = [];
    this.stage3DataSource = [];
    this.currentPage = 1;
    this.isLoadingPendingList = true;
    // Use the line picked from the dropdown (LineWisePC), not the login PC.
    const linePc = this.selectedLineRight?.LineWisePC ?? '';
    this.dgStageICheckerService
      .getDgStage3CheckerData(this.selectedStage, linePc)
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
          this.isLoadingPendingList = false;
        },
        error: (error) => {
          console.error('Error fetching Stage 3 data:', error);
          this.isLoadingPendingList = false;
        },
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

    // Quality checkpoint MASTERS are authored once against PC '01.175' (the
    // template profit centre used by dg-quality-master). Every line/checker
    // reads from this same master list — they don't have line-specific
    // copies — so we lookup against '01.175' regardless of which line the
    // operator is checking.
    const MASTER_PC_CODE = '01.175';

    if (!this.modalSelectedStage || kvaValue === null) {
      console.warn('Missing required parameters: Stage or KVA');
      this.qualityCheckpointDataSource = [];
      return;
    }

    this.isLoadingCheckpoints = true;

    this.dgStageICheckerService
      .getStageAndKvaWiseCheckpointList(
        this.modalSelectedStage,
        MASTER_PC_CODE,
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
            sixM: 0,
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

  // Accept enabled: all checkboxes OK and all 6M are None (0)
  get isAcceptEnabled(): boolean {
    if (this.qualityCheckpointDataSource.length === 0) return false;
    return this.qualityCheckpointDataSource.every(item => item.ok) &&
           this.qualityCheckpointDataSource.every(item => !this.is6MSelected(item));
  }

  // Rework enabled: at least one row has 6M selected (not None)
  get isReworkEnabled(): boolean {
    if (this.qualityCheckpointDataSource.length === 0) return false;
    return this.qualityCheckpointDataSource.some(item => this.is6MSelected(item));
  }

  onAcceptClick(): void {
    // Guard 1: an assembly line MUST be selected — pccode_act / pccode_old are
    // stamped from this pick. Catches the empty-dropdown case before any other
    // validation so the user sees the most useful next-step message first.
    if (!this.selectedLineRight) {
      this.warningMessage = 'Please select an Assembly Line before accepting.';
      return;
    }

    if (!this.isAcceptEnabled) {
      const allOk = this.qualityCheckpointDataSource.every(item => item.ok);
      const has6M = this.qualityCheckpointDataSource.some(item => this.is6MSelected(item));
      if (!allOk) {
        this.warningMessage = 'Please check all OK checkboxes before accepting.';
      } else if (has6M) {
        this.warningMessage = 'Cannot accept when 6M is selected. Set all 6M to None or use Rework.';
      }
      return;
    }
    this.saveQualityData('Accept');
  }

  onReworkClick(): void {
    if (!this.isReworkEnabled) {
      const has6M = this.qualityCheckpointDataSource.some(item => this.is6MSelected(item));
      if (!has6M) {
        this.warningMessage = 'Please select at least one 6M option to enable Rework.';
      } else {
        const missingEsp = this.qualityCheckpointDataSource.filter(item => this.is6MSelected(item) && !item.raiseEsp);
        if (missingEsp.length > 0) {
          this.warningMessage = 'Please select Raise ESP (employee) for all rows where 6M is selected.';
        }
      }
      return;
    }
    this.defectActionType = 'Rework';
    this.openDefectModal();
  }

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
    // Base data (common for all stages). pccode_act ← LineWisePC, pccode_old ← ParentDgPC
    // from the Select-Line dropdown — NOT the login profit centre. Same convention used by
    // jobcard1, dg-stage-i, etc., so the saved QA row is stamped against the line the user
    // is actually checking on, with the rolled-up parent PC alongside.
    const QPCheckerData: any = {
      pccode_act: this.selectedLineRight?.LineWisePC ?? '',
      pccode_old: this.selectedLineRight?.ParentDgPC ?? '',
      cid: this.cid,
      stageName: this.modalSelectedStage,
      qualityStatus: qualityStatus,
      ecode: this.ecode,
    };

    // Stage 1 & 2: Add JobCode and related fields
    // Field-name casing must match the backend DTO `QProcessCheckerData` exactly
    // (PascalCase for these properties; mixed-case elsewhere — see comparison below).
    if (
      this.modalSelectedStage === 'Stage1' ||
      this.modalSelectedStage === 'Stage2'
    ) {
      QPCheckerData.JobCode = this.selectedJobCardForQuality?.jobCardNo || '';
      QPCheckerData.partCode = this.selectedJobCardForQuality?.partCode || '';
      QPCheckerData.Kva = this.selectedJobCardForQuality?.kva || 0;
      QPCheckerData.priority = parseInt(
        this.selectedJobCardForQuality?.jPriority || '0',
        10,
      );
      QPCheckerData.model = this.selectedJobCardForQuality?.model || '';
      QPCheckerData.EngSrNo = this.selectedJobCardForQuality?.engSrNo || '';
      QPCheckerData.AltSrNo = this.selectedJobCardForQuality?.altSrNo || '';
    }

    // Stage 2: Add battery and canopy fields
    if (this.modalSelectedStage === 'Stage2') {
      QPCheckerData.CpySrNo = this.selectedJobCardForQuality?.cpySrNo || '';
      QPCheckerData.BatSrNo = this.selectedJobCardForQuality?.batSrNo || '';
      QPCheckerData.Bat2SrNo = this.selectedJobCardForQuality?.bat2SrNo || '';
      QPCheckerData.Bat3SrNo = this.selectedJobCardForQuality?.bat3SrNo || '';
      QPCheckerData.Bat4SrNo = this.selectedJobCardForQuality?.bat4SrNo || '';
      QPCheckerData.Bat5SrNo = this.selectedJobCardForQuality?.bat5SrNo || '';
      QPCheckerData.Bat6SrNo = this.selectedJobCardForQuality?.bat6SrNo || '';
    }

    // Stage 3: Add PFBCode and all Stage 3 specific fields
    if (this.modalSelectedStage === 'Stage3') {
      QPCheckerData.PFBCode =
        this.selectedStage3JobCardForQuality?.pfbCode || '';
      QPCheckerData.partCode =
        this.selectedStage3JobCardForQuality?.partCode || '';
      QPCheckerData.Kva = this.selectedStage3JobCardForQuality?.kva || 0;
      QPCheckerData.model = this.selectedStage3JobCardForQuality?.model || '';
      QPCheckerData.Engine = this.selectedStage3JobCardForQuality?.engine || '';
      QPCheckerData.Alternator =
        this.selectedStage3JobCardForQuality?.alternator || '';
      QPCheckerData.Canopy = this.selectedStage3JobCardForQuality?.canopy || '';
      QPCheckerData.ControlPanel1 =
        this.selectedStage3JobCardForQuality?.controlPanel1 || '';
      QPCheckerData.ControlPanel2 =
        this.selectedStage3JobCardForQuality?.controlPanel2 || '';
      QPCheckerData.Battery1 =
        this.selectedStage3JobCardForQuality?.battery1 || '';
      QPCheckerData.Battery2 =
        this.selectedStage3JobCardForQuality?.battery2 || '';
      QPCheckerData.Battery3 =
        this.selectedStage3JobCardForQuality?.battery3 || '';
      QPCheckerData.Battery4 =
        this.selectedStage3JobCardForQuality?.battery4 || '';
      QPCheckerData.Battery5 =
        this.selectedStage3JobCardForQuality?.battery5 || '';
      QPCheckerData.Battery6 =
        this.selectedStage3JobCardForQuality?.battery6 || '';
      QPCheckerData.Krm = this.selectedStage3JobCardForQuality?.krm || '';
    }

    // Quality Checkpoint data — key casing matches the backend CheckpointDetail DTO.
    const QPCheckerDetailsData = this.qualityCheckpointDataSource.map(
      (item) => ({
        SrNo: item.srNo,
        subAssemblyPart: item.subAssemblyPart,
        StageWiseQcId: item.stageWiseQcId,
        Remark: item.remark,
        Ok: item.ok ? 'OK' : 'NOK',
        sixM: this.sixMOptions.find(opt => opt.value === item.sixM)?.label || '',
        RaiseEsp: item.raiseEsp,
      }),
    );

    // Combined payload — root keys match QualityProcessCheckerRequest.
    const payload: any = {
      QProcessCheckerData: QPCheckerData,
      CheckpointsDetails: QPCheckerDetailsData,
    };

    // Add defect data for Rework/Reject — key casing matches DefectDetail DTO.
    if (qualityStatus === 'Rework' || qualityStatus === 'Reject') {
      payload.DefectDetails = this.tempDefectData.map((item, index) => ({
        QdcCode: item.qdcCode,
        ActualValue: item.actualValue ? parseFloat(item.actualValue) : 0,
        Tolerance: item.tolerance ? parseFloat(item.tolerance) : 0,
        Instrument: item.instrument || '',
        Rate: item.rate || 0,
        FromRange: item.fromRange ? parseFloat(item.fromRange) : 0,
        ToRange: item.toRange ? parseFloat(item.toRange) : 0,
      }));
    }

    // ===== ACTUAL API CALL =====
    console.log('SaveQAStatusStagewise Payload:', JSON.stringify(payload, null, 2));
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
      .getDefectData(this.defectModalStage, this.profitcenter_act)
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
