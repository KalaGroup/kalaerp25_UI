import { Component, OnInit } from '@angular/core';
import {
  QualityService,
  PartKvaResponse,
  QualityCheckListReportRow,
} from '../quality.service';

interface CheckpointItem {
  stageWiseQcdetailId?: number;
  srNo: number;
  subAssemblyPart: string;
  qualityProcessCheckpoint: string;
  specification: string;
  observation: string;
  ok_nok: string;
}

@Component({
  selector: 'app-quality-master-checker',
  templateUrl: './quality-master-checker.component.html',
  styleUrls: ['./quality-master-checker.component.scss'],
  standalone: false,
})
export class QualityMasterCheckerComponent implements OnInit {
  // Filter Options
  stages: string[] = ['Stage1', 'Stage2'];
  kvaOptions: PartKvaResponse[] = [];

  // Selected Values — pcCode hard-coded to match master form
  readonly selectedProfitCenter: string = '01.175';
  selectedStage: string = '';
  selectedFromKVA: string = '';
  selectedToKVA: string = '';

  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  // Maker / Checker Remarks
  makerRemark: string = '';
  checkerRemark: string = '';

  // Duplicate-check flag
  isDuplicateCombination: boolean = false;

  // Checkpoint items being added/edited
  checkpointItems: CheckpointItem[] = [
    { srNo: 1, subAssemblyPart: '', qualityProcessCheckpoint: '', specification: '', observation: '', ok_nok: '' },
  ];

  // Report state — loaded by default (no filter fetch)
  reportList: QualityCheckListReportRow[] = [];
  isLoadingReport: boolean = false;
  reportError: string = '';
  expandedReportRowId: number | null = null;

  // Edit / Delete / Authorize / Revert state
  editingId:          number | null = null;
  editingSummary:     string        = '';
  pendingDeletes:     number[]      = [];
  confirmDeleteId:    number | null = null;
  confirmAuthId:      number | null = null;   // row showing "Authorize? Yes/No"
  inlineAuthRemark:   string        = '';     // checker remark captured at moment of authorize
  confirmRevertId:    number | null = null;   // row showing "Revert? Yes/No"
  isSubmitting:       boolean       = false;

  constructor(private qualityService: QualityService) {}

  ngOnInit(): void {
    this.loadKvaOptions();
    this.loadReport();
  }

  loadKvaOptions(): void {
    this.qualityService.getActivePartKvaList().subscribe({
      next: (response) => { this.kvaOptions = response; },
      error: (err) => console.error('Error loading KVA options:', err),
    });
  }

  async onSelectionChange(): Promise<void> {
    this.warningMessage = '';
    this.isDuplicateCombination = false;
    if (this.editingId !== null) return;  // duplicate check makes no sense while editing

    if (this.selectedProfitCenter && this.selectedStage && this.selectedFromKVA && this.selectedToKVA) {
      await this.checkDuplicateCombination();
    }
  }

  async checkDuplicateCombination(): Promise<void> {
    try {
      const response = await this.qualityService.checkDuplicateQualityCheckList(
        this.selectedProfitCenter, this.selectedStage, this.selectedFromKVA, this.selectedToKVA,
      ).toPromise();
      if (response?.isDuplicate) {
        this.isDuplicateCombination = true;
        this.warningMessage = `Quality checklist already exists for ${this.selectedStage}, ${this.selectedFromKVA}–${this.selectedToKVA} kVA. Please choose a different combination.`;
      }
    } catch (error) {
      console.error('Error checking duplicate combination:', error);
      this.errorMessage = 'Error checking for existing records. Please try again.';
    }
  }

  // ── Checkpoint row helpers ───────────────────────────────────
  addRow(): void {
    this.checkpointItems.push({
      srNo: this.checkpointItems.length + 1,
      subAssemblyPart: '', qualityProcessCheckpoint: '',
      specification: '', observation: '', ok_nok: '',
    });
  }

  deleteRow(index: number): void {
    const removed = this.checkpointItems[index];
    if (this.editingId !== null && removed?.stageWiseQcdetailId && removed.stageWiseQcdetailId > 0) {
      this.pendingDeletes.push(removed.stageWiseQcdetailId);
    }
    this.checkpointItems.splice(index, 1);
    if (this.editingId === null && this.checkpointItems.length === 0) {
      this.checkpointItems.push({
        srNo: 1, subAssemblyPart: '', qualityProcessCheckpoint: '',
        specification: '', observation: '', ok_nok: '',
      });
    }
    this.checkpointItems.forEach((it, i) => { it.srNo = i + 1; });
  }

  // ── Validation ───────────────────────────────────────────────
  validateForm(): boolean {
    if (!this.selectedStage)   { this.errorMessage = 'Please select a Stage.'; return false; }
    if (!this.selectedFromKVA) { this.errorMessage = 'Please select From KVA.'; return false; }
    if (!this.selectedToKVA)   { this.errorMessage = 'Please select To KVA.'; return false; }
    if (Number(this.selectedFromKVA) > Number(this.selectedToKVA)) {
      this.errorMessage = 'From KVA should be less than or equal to To KVA.'; return false;
    }
    if (this.isDuplicateCombination && this.editingId === null) {
      this.errorMessage = 'Cannot save. Quality checklist already exists for selected KVA combination.';
      return false;
    }
    if (this.checkpointItems.length === 0 && this.editingId === null) {
      this.errorMessage = 'Please add at least one checkpoint item.'; return false;
    }
    for (let i = 0; i < this.checkpointItems.length; i++) {
      const item = this.checkpointItems[i];
      if (!item.subAssemblyPart?.trim())          { this.errorMessage = `Sub-Assembly Part missing on row ${i + 1}.`; return false; }
      if (!item.qualityProcessCheckpoint?.trim()) { this.errorMessage = `Checkpoint missing on row ${i + 1}.`; return false; }
      if (!item.specification?.trim())            { this.errorMessage = `Specification missing on row ${i + 1}.`; return false; }
      if (!item.observation?.trim())              { this.errorMessage = `Observation missing on row ${i + 1}.`; return false; }
      if (!item.ok_nok?.trim())                   { this.errorMessage = `OK/NOK status missing on row ${i + 1}.`; return false; }
    }
    return true;
  }

  // ── Save router (insert vs update) ───────────────────────────
  async onSave(): Promise<void> {
    this.clearMessages();
    if (!this.validateForm()) return;
    if (this.editingId !== null) await this.updateRecord();
    else                          await this.insertRecord();
  }

  private async insertRecord(): Promise<void> {
    const payload = {
      pcCode: this.selectedProfitCenter,
      stageName: this.selectedStage,
      fromKVA: this.selectedFromKVA,
      toKVA: this.selectedToKVA,
      makerRemark: this.makerRemark,
      checkpointItems: this.checkpointItems,
    };
    this.isSubmitting = true;
    try {
      await this.qualityService.insertDgQualityMaster(payload).toPromise();
      this.successMessage = 'Quality checklist saved successfully.';
      this.resetForm();
      this.loadReport();
    } catch (e) {
      console.error(e);
      this.errorMessage = 'Error saving quality checklist. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  private async updateRecord(): Promise<void> {
    if (this.editingId === null) return;
    const payload = {
      stageWiseQcid: this.editingId,
      makerRemark: this.makerRemark,
      checkpointItems: this.checkpointItems.map(it => ({
        stageWiseQcdetailId: it.stageWiseQcdetailId ?? null,
        srNo: it.srNo, subAssemblyPart: it.subAssemblyPart,
        qualityProcessCheckpoint: it.qualityProcessCheckpoint,
        specification: it.specification, observation: it.observation,
        ok_nok: it.ok_nok,
      })),
      deletedItemIds: this.pendingDeletes,
    };
    this.isSubmitting = true;
    try {
      await this.qualityService.updateDgQualityMaster(payload).toPromise();
      this.successMessage = this.checkpointItems.length === 0
        ? 'All checkpoints removed — checklist has been deactivated.'
        : 'Quality checklist updated successfully.';
      this.cancelEdit();
      this.loadReport();
    } catch (e) {
      console.error(e);
      this.errorMessage = 'Error updating quality checklist. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  // ── Edit / Cancel ────────────────────────────────────────────
  startEdit(row: QualityCheckListReportRow): void {
    this.clearMessages();
    this.editingId       = row.StageWiseQcid;
    this.editingSummary  = `${row.StageName} · ${row.FromKva}–${row.ToKva} kVA · ${row.ItemCount} checkpoint${row.ItemCount === 1 ? '' : 's'}`;
    this.selectedStage   = row.StageName;
    this.selectedFromKVA = String(row.FromKva);
    this.selectedToKVA   = String(row.ToKva);
    this.makerRemark     = row.MakerRemark ?? '';
    this.checkerRemark   = row.CheckerAuthRemark ?? '';
    this.pendingDeletes  = [];

    this.checkpointItems = (row.Items ?? [])
      .slice().sort((a, b) => a.SrNo - b.SrNo)
      .map((it, i) => ({
        stageWiseQcdetailId: it.StageWiseQcdetailId,
        srNo: i + 1,
        subAssemblyPart: it.SubAssemblyPart,
        qualityProcessCheckpoint: it.QualityProcessCheckpoint,
        specification: it.Specification, observation: it.Observation,
        ok_nok: it.OkNok,
      }));

    if (this.checkpointItems.length === 0) {
      this.checkpointItems.push({ srNo: 1, subAssemblyPart: '', qualityProcessCheckpoint: '', specification: '', observation: '', ok_nok: '' });
    }
    this.expandedReportRowId = null;
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  }

  cancelEdit(): void {
    this.editingId       = null;
    this.editingSummary  = '';
    this.pendingDeletes  = [];
    this.resetForm();
  }

  // ── Delete (soft) ────────────────────────────────────────────
  requestDelete(row: QualityCheckListReportRow): void { this.confirmDeleteId = row.StageWiseQcid; }
  cancelDelete(): void { this.confirmDeleteId = null; }
  async confirmDelete(row: QualityCheckListReportRow): Promise<void> {
    try {
      await this.qualityService.softDeleteDgQualityMaster(row.StageWiseQcid).toPromise();
      this.confirmDeleteId = null;
      if (this.editingId === row.StageWiseQcid) this.cancelEdit();
      this.loadReport();
      this.successMessage = 'Checklist removed.';
    } catch (e) {
      console.error(e);
      this.errorMessage = 'Error deleting checklist. Please try again.';
    }
  }

  // ── Authorize (with inline remark) ───────────────────────────
  requestAuth(row: QualityCheckListReportRow): void {
    this.cancelDelete();
    this.cancelRevert();
    this.confirmAuthId = row.StageWiseQcid;
    this.inlineAuthRemark = '';
  }
  cancelAuth(): void {
    this.confirmAuthId = null;
    this.inlineAuthRemark = '';
  }
  async confirmAuth(row: QualityCheckListReportRow): Promise<void> {
    try {
      await this.qualityService.authorizeDgQualityMaster(row.StageWiseQcid, (this.inlineAuthRemark || '').trim()).toPromise();
      this.confirmAuthId = null;
      this.inlineAuthRemark = '';
      this.loadReport();
      this.successMessage = `Checklist ${row.StageName} · ${row.FromKva}–${row.ToKva} kVA authorized.`;
    } catch (e) {
      console.error(e);
      this.errorMessage = 'Error authorizing checklist. Please try again.';
    }
  }

  // ── Revert authorization ─────────────────────────────────────
  requestRevert(row: QualityCheckListReportRow): void {
    this.cancelDelete();
    this.cancelAuth();
    this.confirmRevertId = row.StageWiseQcid;
  }
  cancelRevert(): void { this.confirmRevertId = null; }
  async confirmRevert(row: QualityCheckListReportRow): Promise<void> {
    try {
      await this.qualityService.revertAuthDgQualityMaster(row.StageWiseQcid).toPromise();
      this.confirmRevertId = null;
      this.loadReport();
      this.successMessage = `Authorization reverted for ${row.StageName} · ${row.FromKva}–${row.ToKva} kVA.`;
    } catch (e) {
      console.error(e);
      this.errorMessage = 'Error reverting authorization. Please try again.';
    }
  }

  // ── Report (default load — no filter required) ───────────────
  loadReport(): void {
    this.isLoadingReport = true;
    this.reportError = '';
    this.qualityService.getAllQualityCheckLists().subscribe({
      next: (data) => { this.reportList = data ?? []; this.isLoadingReport = false; },
      error: (err) => {
        this.isLoadingReport = false;
        if (err?.status !== 404) this.reportError = 'Failed to load saved checklists. Please try again.';
        console.error(err);
      }
    });
  }

  toggleReportRow(row: QualityCheckListReportRow): void {
    if (!row.Items || row.Items.length === 0) return;
    this.expandedReportRowId = this.expandedReportRowId === row.StageWiseQcid ? null : row.StageWiseQcid;
  }
  isReportRowExpanded(row: QualityCheckListReportRow): boolean {
    return this.expandedReportRowId === row.StageWiseQcid;
  }

  getStatusClass(value: string): string {
    const v = (value ?? '').toLowerCase();
    if (v === 'authorized') return 'status-ok';
    if (v === 'pending')    return 'status-pending';
    if (v === 'discarded')  return 'status-off';
    if (v === 'inactive')   return 'status-neutral';
    return 'status-neutral';
  }

  // ── Reset ────────────────────────────────────────────────────
  private resetForm(): void {
    this.selectedStage = '';
    this.selectedFromKVA = '';
    this.selectedToKVA = '';
    this.isDuplicateCombination = false;
    this.checkpointItems = [
      { srNo: 1, subAssemblyPart: '', qualityProcessCheckpoint: '', specification: '', observation: '', ok_nok: '' },
    ];
    this.makerRemark = '';
    this.checkerRemark = '';
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
  }
}
