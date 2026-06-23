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
      // Observation is optional — UI permits blank / multi-line freeform text.
      // OK/NOK column was removed; ok_nok is always sent as null at save time.
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
      // OK/NOK column removed from UI — always send null so the DB stores NULL.
      // Observation + Specification are numbered client-side so the DB stores
      // "1. ...\n2. ..." even when the API runs an older binary.
      checkpointItems: this.checkpointItems.map(it => ({
        srNo:                     it.srNo,
        subAssemblyPart:          it.subAssemblyPart,
        qualityProcessCheckpoint: it.qualityProcessCheckpoint,
        specification:            this.numberSpecificationForSave(it.specification),
        observation:              this.numberObservationForSave(it.observation),
        ok_nok:                   null,
      })),
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
        // Numbered client-side; the API re-applies idempotently.
        specification: this.numberSpecificationForSave(it.specification),
        observation: this.numberObservationForSave(it.observation),
        // OK/NOK column removed from UI — always send null.
        ok_nok: null,
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
        // Strip "1. ", "2. " prefixes so input boxes show clean text; the
        // API re-numbers on save (idempotent).
        specification: this.stripSpecificationNumbering(it.Specification),
        observation: this.stripObservationNumbering(it.Observation),
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

  // ── Multi-line stacked inputs (Observation + Specification) ────────────
  // Both fields share the same UX: one input per stored line, explicit
  // "+ Add line" to grow, × per row to remove, capped at MAX_LINES.
  readonly MAX_OBSERVATION_LINES   = 4;
  readonly MAX_SPECIFICATION_LINES = 4;

  // ── Generic primitives (parameterised by item property name) ──────────
  private getLine(item: any, prop: string, idx: number): string {
    const lines = String(item?.[prop] ?? '').split('\n');
    return lines[idx] ?? '';
  }

  private setLine(item: any, prop: string, idx: number, value: string): void {
    const lines = String(item?.[prop] ?? '').split('\n');
    while (lines.length <= idx) lines.push('');
    lines[idx] = value;
    item[prop] = lines.join('\n');
  }

  private getLineIndices(item: any, prop: string): number[] {
    const raw = String(item?.[prop] ?? '');
    if (raw.length === 0) return [0];
    const lines = raw.split('\n');
    return Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i);
  }

  private removeLine(item: any, prop: string, idx: number): void {
    const lines = String(item?.[prop] ?? '').split('\n');
    if (idx < 0 || idx >= lines.length) return;
    lines.splice(idx, 1);
    item[prop] = lines.join('\n');
  }

  private addLine(item: any, prop: string, max: number): void {
    if (this.isFull(item, prop, max)) return;
    const current = String(item?.[prop] ?? '');
    item[prop] = current.length === 0 ? '\n' : current + '\n';
  }

  private isFull(item: any, prop: string, max: number): boolean {
    const raw = String(item?.[prop] ?? '');
    if (raw.length === 0) return false;
    return raw.split('\n').length >= max;
  }

  // ── Observation wrappers ──
  getObservationLine(item: any, idx: number)              { return this.getLine(item, 'observation', idx); }
  setObservationLine(item: any, idx: number, value: string) { this.setLine(item, 'observation', idx, value); }
  getObservationLineIndices(item: any)                    { return this.getLineIndices(item, 'observation'); }
  removeObservationLine(item: any, idx: number)           { this.removeLine(item, 'observation', idx); }
  addObservationLine(item: any)                           { this.addLine(item, 'observation', this.MAX_OBSERVATION_LINES); }
  isObservationFull(item: any)                            { return this.isFull(item, 'observation', this.MAX_OBSERVATION_LINES); }
  trackObservationLine = (index: number) => index;

  // ── Specification wrappers ──
  getSpecificationLine(item: any, idx: number)              { return this.getLine(item, 'specification', idx); }
  setSpecificationLine(item: any, idx: number, value: string) { this.setLine(item, 'specification', idx, value); }
  getSpecificationLineIndices(item: any)                    { return this.getLineIndices(item, 'specification'); }
  removeSpecificationLine(item: any, idx: number)           { this.removeLine(item, 'specification', idx); }
  addSpecificationLine(item: any)                           { this.addLine(item, 'specification', this.MAX_SPECIFICATION_LINES); }
  isSpecificationFull(item: any)                            { return this.isFull(item, 'specification', this.MAX_SPECIFICATION_LINES); }
  trackSpecificationLine = (index: number) => index;

  // ── Numbering helpers ──
  private stripNumbering(value: string | null | undefined): string {
    if (!value) return '';
    return String(value)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(l => l.replace(/^\s*\d+\.\s*/, ''))
      .join('\n');
  }

  private numberForSave(value: string | null | undefined): string | null {
    if (value == null) return null;
    if (String(value).length === 0) return value as string;

    const normalized = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let lines = normalized.split('\n').map(l => l.replace(/^\s*\d+\.\s*/, ''));
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

    if (lines.length === 0) return '';
    if (lines.length === 1) return lines[0];
    return lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
  }

  stripObservationNumbering(value: string | null | undefined): string  { return this.stripNumbering(value); }
  numberObservationForSave(value: string | null | undefined)            { return this.numberForSave(value); }
  stripSpecificationNumbering(value: string | null | undefined): string { return this.stripNumbering(value); }
  numberSpecificationForSave(value: string | null | undefined)           { return this.numberForSave(value); }
}
