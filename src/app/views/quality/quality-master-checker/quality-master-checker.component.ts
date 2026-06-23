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
      // Observation is numbered client-side so the DB stores "1. ...\n2. ..."
      // even when the API runs an older binary without NumberObservationLines.
      checkpointItems: this.checkpointItems.map(it => ({
        srNo:                     it.srNo,
        subAssemblyPart:          it.subAssemblyPart,
        qualityProcessCheckpoint: it.qualityProcessCheckpoint,
        specification:            it.specification,
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
        specification: it.specification,
        // Numbered client-side; see numberObservationForSave docs.
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
        specification: it.Specification,
        // Strip "1. ", "2. " prefixes so input boxes show clean text; the
        // API re-numbers on save (idempotent).
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

  // ── Observation: dynamic stacked inputs backed by a newline-joined string ──
  // Storage stays a plain string (API/DB contract unchanged). The list grows
  // as the user types into the trailing empty input; the × button removes any
  // line; trailing empty lines are trimmed automatically.
  readonly MAX_OBSERVATION_LINES = 4;

  getObservationLine(item: any, idx: number): string {
    const lines = String(item?.observation ?? '').split('\n');
    return lines[idx] ?? '';
  }

  setObservationLine(item: any, idx: number, value: string): void {
    const lines = String(item?.observation ?? '').split('\n');
    while (lines.length <= idx) lines.push('');
    lines[idx] = value;
    // No aggressive trim — user has explicit control via × and "+ Add line".
    // The API strips trailing empties at save time anyway.
    item.observation = lines.join('\n');
  }

  // Show exactly one input per stored line — no auto-grow. The user explicitly
  // grows the list with "+ Add line" and shrinks it with the × button per row.
  // This means a × click on a filled row immediately removes that visible row
  // (no surprise auto-re-added trailing empty taking its place).
  // Empty observation still shows a single input as the editing entry point.
  getObservationLineIndices(item: any): number[] {
    const raw = String(item?.observation ?? '');
    if (raw.length === 0) return [0];
    const lines = raw.split('\n');
    return Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i);
  }

  removeObservationLine(item: any, idx: number): void {
    const lines = String(item?.observation ?? '').split('\n');
    if (idx < 0 || idx >= lines.length) return;
    lines.splice(idx, 1);
    // No cascading trim — only the explicit click on × removes the line at
    // `idx`. Trailing empties (if any) stay until the user removes them or
    // the API trims them at save time.
    item.observation = lines.join('\n');
  }

  // Explicit "+ Add line" — appends a blank line so a new input renders.
  // Without this the user only discovers multi-line by typing in the
  // trailing input first; the button makes the option obvious.
  // Capped at MAX_OBSERVATION_LINES.
  addObservationLine(item: any): void {
    if (this.isObservationFull(item)) return;
    const current = String(item?.observation ?? '');
    item.observation = current.length === 0 ? '\n' : current + '\n';
  }

  // True when the row already has MAX_OBSERVATION_LINES entries.
  isObservationFull(item: any): boolean {
    const raw = String(item?.observation ?? '');
    if (raw.length === 0) return false;
    return raw.split('\n').length >= this.MAX_OBSERVATION_LINES;
  }

  trackObservationLine = (index: number) => index;

  // Strips any "1. ", "2. " etc. prefix from each line — used when loading a
  // saved observation into the edit inputs so the user sees clean text.
  stripObservationNumbering(value: string | null | undefined): string {
    if (!value) return '';
    return String(value)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(l => l.replace(/^\s*\d+\.\s*/, ''))
      .join('\n');
  }

  // Mirror of the API's NumberObservationLines — applied client-side at SAVE
  // so the payload reaches the DB already numbered (belt-and-suspenders even
  // if the API binary doesn't have the helper yet). Idempotent.
  numberObservationForSave(value: string | null | undefined): string | null {
    if (value == null) return null;
    if (String(value).length === 0) return value as string;

    const normalized = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let lines = normalized.split('\n')
      .map(l => l.replace(/^\s*\d+\.\s*/, ''));

    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

    if (lines.length === 0) return '';
    if (lines.length === 1) return lines[0];

    return lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
  }
}
