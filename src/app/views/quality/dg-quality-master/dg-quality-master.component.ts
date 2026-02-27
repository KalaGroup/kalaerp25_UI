import { Component, OnInit } from '@angular/core';
import {
  QualityService,
  DGAssemblyProfitcenterResponse,
  PartKvaResponse,
} from '../quality.service';
import { th } from 'date-fns/locale';

interface CheckpointItem {
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
  profitCenters: DGAssemblyProfitcenterResponse[] = [];
  stages: string[] = ['Stage1', 'Stage2', 'Stage3'];
  kvaOptions: PartKvaResponse[] = [];

  // Selected Values
  selectedProfitCenter: string = '';
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
    this.loadProfitCenters();
    this.loadKvaOptions();
  }

  loadProfitCenters(): void {
    this.qualityService.getDGAssemblyProfitcenters().subscribe({
      next: (response) => {
        console.log('Profit Centers response:', response);
        this.profitCenters = response;
      },
      error: (error) => {
        console.error('Error loading profit centers:', error);
      },
    });
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
    if (this.checkpointItems.length > 1) {
      this.checkpointItems.splice(index, 1);

      // Reassign serial numbers
      this.checkpointItems.forEach((item, i) => {
        item.srNo = i + 1;
      });
    }
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

    // Validate checkpoint items
    if (this.checkpointItems.length === 0) {
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
    debugger
    // Clear previous messages
    this.clearMessages();

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    const payload = {
      pcCode: this.selectedProfitCenter,
      stageName: this.selectedStage,
      fromKVA: this.selectedFromKVA,
      toKVA: this.selectedToKVA,
      makerRemark: this.makerRemark,
      checkpointItems: this.checkpointItems,
    };

    console.log('Saving checkpoint data:', payload);

    try {
      await this.qualityService.insertDgQualityMaster(payload).toPromise();
      this.successMessage = 'Quality checklist saved successfully.';
      this.resetForm();
    } catch (error) {
      console.error('Error saving quality checklist:', error);
      this.errorMessage = 'Error saving quality checklist. Please try again.';
    }
  }

  resetForm(): void {
    this.selectedProfitCenter = '';
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
