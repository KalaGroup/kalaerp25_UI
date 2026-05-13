import { Component, OnInit } from '@angular/core';
import {
  QualityService,
  PartKvaResponse,
  QualityCheckListReportRow,
} from '../quality.service';
import { th } from 'date-fns/locale';

interface CheckpointItem {
  // Present only on rows loaded from an existing checklist (used to reconcile on update).
  stageWiseQcdetailId?: number;
  srNo: number;
  subAssemblyPart: string;
  qualityProcessCheckpoint: string;
  specification: string;
  observation: string;
  ok_nok: string;
}

@Component({
    selector: 'app-dg-quality-master',
    templateUrl: './dg-quality-master.component.html',
    styleUrl: './dg-quality-master.component.scss',
    standalone: false
})
export class DgQualityMasterComponent implements OnInit {
  // Filter Options
  stages: string[] = ['Stage1', 'Stage2'];
  kvaOptions: PartKvaResponse[] = [];

  // Selected Values
  // Profit Center is hard-coded (combo removed) — used as the PCCode on save.
  readonly selectedProfitCenter: string = '01.175';
  selectedStage: string = '';
  selectedFromKVA: string = '';
  selectedToKVA: string = '';

  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  // Maker Remark
  makerRemark: string = '';

  // Flag to track if duplicate exists
  isDuplicateCombination: boolean = false;

  // Report state — saved Quality Check Lists shown under Maker Remark
  reportList:        QualityCheckListReportRow[] = [];
  isLoadingReport:   boolean                     = false;
  reportError:       string                      = '';
  expandedReportRowId: number | null             = null;

  // Edit / delete state
  editingId:        number | null = null;   // null = create mode
  editingSummary:   string        = '';
  pendingDeletes:   number[]      = [];     // detail IDs the user removed during edit
  confirmDeleteId:  number | null = null;   // row currently showing inline "Yes / No"
  isSubmitting:     boolean       = false;

  // Checkpoint Items
  checkpointItems: CheckpointItem[] = [
    {
      srNo: 1,
      subAssemblyPart: '',
      qualityProcessCheckpoint: '',
      specification: '',
      observation: '',
      ok_nok: '',
    },
  ];

  constructor(private qualityService: QualityService) {}

  ngOnInit(): void {
    this.loadKvaOptions();
    this.loadReport();
  }

  // ── Load the full Quality Check List report ──────────────────
  loadReport(): void {
    this.isLoadingReport = true;
    this.reportError = '';
    this.qualityService.getAllQualityCheckLists().subscribe({
      next: (data) => {
        this.reportList = data ?? [];
        this.isLoadingReport = false;
      },
      error: (err) => {
        this.isLoadingReport = false;
        if (err?.status !== 404) {
          this.reportError = 'Failed to load saved checklists. Please try again.';
        }
        console.error(err);
      }
    });
  }

  // Toggle the expanded item detail rows for one report row
  toggleReportRow(row: QualityCheckListReportRow): void {
    if (!row.Items || row.Items.length === 0) return;
    this.expandedReportRowId =
      this.expandedReportRowId === row.StageWiseQcid ? null : row.StageWiseQcid;
  }

  isReportRowExpanded(row: QualityCheckListReportRow): boolean {
    return this.expandedReportRowId === row.StageWiseQcid;
  }

  // Badge class for the AuthStatus pill in the report
  getStatusClass(value: string): string {
    const v = (value ?? '').toLowerCase();
    if (v === 'authorized') return 'status-ok';
    if (v === 'pending')    return 'status-pending';
    if (v === 'discarded')  return 'status-off';
    if (v === 'inactive')   return 'status-neutral';
    return 'status-neutral';
  }

  loadKvaOptions(): void {
    this.qualityService.getActivePartKvaList().subscribe({
      next: (response) => {
        console.log('KVA Options response:', response);
        this.kvaOptions = response;
      },
      error: (error) => {
        console.error('Error loading KVA options:', error);
      },
    });
  }

  // Called when any filter selection changes
  async onSelectionChange(): Promise<void> {
    // Clear previous warning
    this.warningMessage = '';
    this.isDuplicateCombination = false;

    // Check only if all four fields are selected
    if (
      this.selectedProfitCenter &&
      this.selectedStage &&
      this.selectedFromKVA &&
      this.selectedToKVA
    ) {
      await this.checkDuplicateCombination();
    }
  }

  async checkDuplicateCombination(): Promise<void> {
    try {
      const response = await this.qualityService
        .checkDuplicateQualityCheckList(
          this.selectedProfitCenter,
          this.selectedStage,
          this.selectedFromKVA,
          this.selectedToKVA
        )
        .toPromise();

      if (response?.isDuplicate) {
        this.isDuplicateCombination = true;
        this.warningMessage = `Quality checklist already exists for selected combination: ${this.selectedStage}, From KVA: ${this.selectedFromKVA}, To KVA: ${this.selectedToKVA}. Please select a different KVA combination.`;
      }
    } catch (error) {
      console.error('Error checking duplicate combination:', error);
      this.errorMessage = 'Error checking for existing records. Please try again.';
    }
  }

  addRow(): void {
    this.checkpointItems.push({
      srNo: this.checkpointItems.length + 1,
      subAssemblyPart: '',
      qualityProcessCheckpoint: '',
      specification: '',
      observation: '',
      ok_nok: '',
    });
  }

  deleteRow(index: number): void {
    const removed = this.checkpointItems[index];
    // If the removed row came from an existing checklist (edit mode), remember
    // its id so the backend hard-deletes it on Update.
    if (this.editingId !== null && removed?.stageWiseQcdetailId && removed.stageWiseQcdetailId > 0) {
      this.pendingDeletes.push(removed.stageWiseQcdetailId);
    }

    this.checkpointItems.splice(index, 1);

    // While editing, allow removing all rows (which will soft-delete the master
    // on Update). In Create mode keep at least one blank row for input.
    if (this.editingId === null && this.checkpointItems.length === 0) {
      this.checkpointItems.push({
        srNo: 1,
        subAssemblyPart: '',
        qualityProcessCheckpoint: '',
        specification: '',
        observation: '',
        ok_nok: '',
      });
    }

    // Reassign serial numbers
    this.checkpointItems.forEach((item, i) => { item.srNo = i + 1; });
  }

  validateForm(): boolean {
    // Validate all selections
    if (!this.selectedProfitCenter) {
      this.errorMessage = 'Please select a Profit Center.';
      return false;
    }

    if (!this.selectedStage) {
      this.errorMessage = 'Please select a Stage.';
      return false;
    }

    if (!this.selectedFromKVA) {
      this.errorMessage = 'Please select From KVA.';
      return false;
    }

    if (!this.selectedToKVA) {
      this.errorMessage = 'Please select To KVA.';
      return false;
    }

    // Validate From KVA should be less than or equal to To KVA
    if (Number(this.selectedFromKVA) > Number(this.selectedToKVA)) {
      this.errorMessage = 'From KVA should be less than or equal to To KVA.';
      return false;
    }

    // Check if duplicate combination exists
    if (this.isDuplicateCombination) {
      this.errorMessage = 'Cannot save. Quality checklist already exists for selected KVA combination.';
      return false;
    }

    // Validate checkpoint items — in Edit mode we allow zero (which deactivates the master).
    if (this.checkpointItems.length === 0 && this.editingId === null) {
      this.errorMessage = 'Please add at least one checkpoint item.';
      return false;
    }

    // Validate each checkpoint item has required fields filled
    for (let i = 0; i < this.checkpointItems.length; i++) {
      const item = this.checkpointItems[i];

      if (!item.subAssemblyPart || item.subAssemblyPart.trim() === '') {
        this.errorMessage = `Please enter Sub-Assembly Part for row ${i + 1}.`;
        return false;
      }

      if (!item.qualityProcessCheckpoint || item.qualityProcessCheckpoint.trim() === '') {
        this.errorMessage = `Please enter Quality/Process Checkpoint for row ${i + 1}.`;
        return false;
      }

      if (!item.specification || item.specification.trim() === '') {
        this.errorMessage = `Please enter Specification for row ${i + 1}.`;
        return false;
      }

      if (!item.observation || item.observation.trim() === '') {
        this.errorMessage = `Please enter Observation for row ${i + 1}.`;
        return false;
      }

      if (!item.ok_nok || item.ok_nok.trim() === '') {
        this.errorMessage = `Please enter OK/NOK status for row ${i + 1}.`;
        return false;
      }
    }

    return true;
  }

  async onSave(): Promise<void> {
    this.clearMessages();
    if (!this.validateForm()) return;

    // Route to Update vs Insert based on edit mode.
    if (this.editingId !== null) {
      await this.updateRecord();
    } else {
      await this.insertRecord();
    }
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
    } catch (error) {
      console.error('Error saving quality checklist:', error);
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
        stageWiseQcdetailId:      it.stageWiseQcdetailId ?? null,
        srNo:                     it.srNo,
        subAssemblyPart:          it.subAssemblyPart,
        qualityProcessCheckpoint: it.qualityProcessCheckpoint,
        specification:            it.specification,
        observation:              it.observation,
        ok_nok:                   it.ok_nok,
      })),
      deletedItemIds: this.pendingDeletes,
    };

    this.isSubmitting = true;
    try {
      await this.qualityService.updateDgQualityMaster(payload).toPromise();
      const wasEmpty = this.checkpointItems.length === 0;
      this.successMessage = wasEmpty
        ? 'All checkpoints removed — checklist has been deactivated.'
        : 'Quality checklist updated successfully.';
      this.cancelEdit();      // exits edit mode + resets the form
      this.loadReport();
    } catch (error) {
      console.error('Error updating quality checklist:', error);
      this.errorMessage = 'Error updating quality checklist. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  // ── Edit ──────────────────────────────────────────────────────
  startEdit(row: QualityCheckListReportRow): void {
    this.clearMessages();
    this.editingId      = row.StageWiseQcid;
    this.editingSummary = `${row.StageName} · ${row.FromKva}–${row.ToKva} kVA · ${row.ItemCount} checkpoint${row.ItemCount === 1 ? '' : 's'}`;
    this.selectedStage  = row.StageName;
    this.selectedFromKVA = String(row.FromKva);
    this.selectedToKVA   = String(row.ToKva);
    this.makerRemark    = row.MakerRemark ?? '';
    this.pendingDeletes = [];

    // Hydrate the checkpoint table from the row's items (sorted by SrNo).
    this.checkpointItems = (row.Items ?? [])
      .slice()
      .sort((a, b) => a.SrNo - b.SrNo)
      .map((it, i) => ({
        stageWiseQcdetailId:      it.StageWiseQcdetailId,
        srNo:                     i + 1,
        subAssemblyPart:          it.SubAssemblyPart,
        qualityProcessCheckpoint: it.QualityProcessCheckpoint,
        specification:            it.Specification,
        observation:              it.Observation,
        ok_nok:                   it.OkNok,
      }));

    if (this.checkpointItems.length === 0) {
      this.checkpointItems.push({
        srNo: 1, subAssemblyPart: '', qualityProcessCheckpoint: '',
        specification: '', observation: '', ok_nok: '',
      });
    }

    // Close any open detail panel and scroll the form into view.
    this.expandedReportRowId = null;
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  }

  cancelEdit(): void {
    this.editingId      = null;
    this.editingSummary = '';
    this.pendingDeletes = [];
    this.resetForm();
  }

  // ── Delete (soft) ─────────────────────────────────────────────
  requestDelete(row: QualityCheckListReportRow): void {
    this.confirmDeleteId = row.StageWiseQcid;
  }

  cancelDelete(): void {
    this.confirmDeleteId = null;
  }

  async confirmDelete(row: QualityCheckListReportRow): Promise<void> {
    try {
      await this.qualityService.softDeleteDgQualityMaster(row.StageWiseQcid).toPromise();
      this.confirmDeleteId = null;
      // If we're currently editing the row being deleted, exit edit mode.
      if (this.editingId === row.StageWiseQcid) this.cancelEdit();
      this.loadReport();
      this.successMessage = 'Checklist removed.';
    } catch (error) {
      console.error('Error deleting checklist:', error);
      this.errorMessage = 'Error deleting checklist. Please try again.';
    }
  }

  resetForm(): void {
    // selectedProfitCenter is readonly (hard-coded to '01.175') so it isn't reset here.
    this.selectedStage = '';
    this.selectedFromKVA = '';
    this.selectedToKVA = '';
    this.isDuplicateCombination = false;
    this.checkpointItems = [
      {
        srNo: 1,
        subAssemblyPart: '',
        qualityProcessCheckpoint: '',
        specification: '',
        observation: '',
        ok_nok: '',
      },
    ];
    this.makerRemark = '';
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
  }
}
