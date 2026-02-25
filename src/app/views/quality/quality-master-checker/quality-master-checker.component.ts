import { Component, OnInit } from '@angular/core';
import { QualityService } from '../quality.service';
import { th } from 'date-fns/locale';

// Interface matching API response for dropdown data
export interface PendingAuthQcResponse {
  StageWiseQcid: number;
  Pccode: string;
  PCName: string;
  StageName: string;
  FromKva: number;
  ToKva: number;
}

// Interface for checkpoint data from API
export interface CheckpointResponse {
  SrNo: number;
  SubAssemblyPart: string;
  QualityProcessCheckpoint: string;
  Specification: string;
  Observation: string;
  OkNok: string;
}


// Interface for table binding
interface CheckpointItem {
  srNo: number;
  subAssemblyPart: string;
  checkpoint: string;
  specification: string;
  observation: string;
  ok: string;
}

// Updated Interface - using StageWiseQcid
export interface CheckpointRequest {
  StageWiseQcid: number;
}

@Component({
    selector: 'app-quality-master-checker',
    templateUrl: './quality-master-checker.component.html',
    styleUrls: ['./quality-master-checker.component.scss'],
    standalone: false
})
export class QualityMasterCheckerComponent implements OnInit {
  // API Data
  stageWiseQcData: PendingAuthQcResponse[] = [];

  // Filter Options (derived from API data)
  profitCenters: { Pccode: string; PCName: string }[] = [];
  stages: string[] = [];
  fromKvaOptions: number[] = [];
  toKvaOptions: number[] = [];

  // Selected Values
  selectedProfitCenter: string = '';
  selectedStage: string = '';
  selectedFromKVA: number | null = null;
  selectedToKVA: number | null = null;

  //modal messages
  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  // Checker Remark
  checkerRemark: string = '';

  // Loading state
  isLoading: boolean = false;

  // Checkpoint Items for table
  checkpointItems: CheckpointItem[] = [];

  constructor(private qualityService: QualityService) {}

  ngOnInit(): void {
    this.loadPendingAuthorizationQcData();
  }

  loadPendingAuthorizationQcData(): void {
    this.qualityService.getPendingAuthQcData().subscribe({
      next: (response: PendingAuthQcResponse[]) => {
        this.stageWiseQcData = response;
        this.extractFilterOptions();
      },
      error: (error) => {
        console.error('Error loading stage wise QC data:', error);
      },
    });
  }

  extractFilterOptions(): void {
    // Extract unique Profit Centers
    const pcMap = new Map<string, string>();
    this.stageWiseQcData.forEach((item) => {
      if (!pcMap.has(item.Pccode)) {
        pcMap.set(item.Pccode, item.PCName);
      }
    });
    this.profitCenters = Array.from(pcMap, ([Pccode, PCName]) => ({
      Pccode,
      PCName,
    }));

    // Extract unique Stages
    this.stages = [
      ...new Set(this.stageWiseQcData.map((item) => item.StageName)),
    ];

    // Extract unique FromKva values (sorted)
    this.fromKvaOptions = [
      ...new Set(this.stageWiseQcData.map((item) => item.FromKva)),
    ].sort((a, b) => a - b);

    // Extract unique ToKva values (sorted)
    this.toKvaOptions = [
      ...new Set(this.stageWiseQcData.map((item) => item.ToKva)),
    ].sort((a, b) => a - b);
  }

  // Find StageWiseQcid based on selected filters
  getStageWiseQcid(): number | null {
    const matchedItem = this.stageWiseQcData.find(
      (item) =>
        item.Pccode === this.selectedProfitCenter &&
        item.StageName === this.selectedStage &&
        item.FromKva === this.selectedFromKVA &&
        item.ToKva === this.selectedToKVA
    );

    return matchedItem ? matchedItem.StageWiseQcid : null;
  }

  // Fetch checkpoint data based on selected filters
  fetchCheckpointData(): void {
    // Validate all filters are selected
    if (
      !this.selectedProfitCenter ||
      !this.selectedStage ||
      this.selectedFromKVA === null ||
      this.selectedToKVA === null
    ) {
      this.warningMessage = 'Please select all filters before fetching data.';
      return;
    }

    // Get StageWiseQcid from selected filters
    const stageWiseQcid = this.getStageWiseQcid();

    if (stageWiseQcid === null) {
      this.warningMessage = 'No matching record found for the selected filters.';
      return;
    }
    this.isLoading = true;

    // Pass stageWiseQcid directly as parameter
    this.qualityService.getCheckpointData(stageWiseQcid).subscribe({
      next: (response: CheckpointResponse[]) => {
        this.checkpointItems = response.map((item, index) => ({
          srNo: item.SrNo || index + 1,
          subAssemblyPart: item.SubAssemblyPart || '',
          checkpoint: item.QualityProcessCheckpoint || '',
          specification: item.Specification || '',
          observation: item.Observation || '',
          ok: item.OkNok || '',
        }));

        // If no data returned, add an empty row
        if (this.checkpointItems.length === 0) {
          this.addRow();
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching checkpoint data:', error);
        this.isLoading = false;
        this.errorMessage = 'Error fetching checkpoint data. Please try again.';
      },
    });
  }

  // Optional: Auto-fetch when all filters are selected
  onFilterChange(): void {
    // Reset table when filter changes
    // Uncomment below line if you want auto-fetch
    // this.fetchCheckpointData();
  }

  addRow(): void {
    const newSrNo =
      this.checkpointItems.length > 0
        ? Math.max(...this.checkpointItems.map((item) => item.srNo)) + 1
        : 1;

    this.checkpointItems.push({
      srNo: newSrNo,
      subAssemblyPart: '',
      checkpoint: '',
      specification: '',
      observation: '',
      ok: '',
    });
  }

  deleteRow(index: number): void {
    if (this.checkpointItems.length > 1) {
      this.checkpointItems.splice(index, 1);
    }
  }

  trackByIndex(index: number, item: CheckpointItem): number {
    return index;
  }

  onSave(): void {
    if (
      !this.selectedProfitCenter ||
      !this.selectedStage ||
      this.selectedFromKVA === null ||
      this.selectedToKVA === null
    ) {
      this.warningMessage = 'Please select all filters before saving.';
      return;
    }

    // Get StageWiseQcid from selected filters
    const stageWiseQcid = this.getStageWiseQcid();

    if (stageWiseQcid === null) {
      this.errorMessage = 'No matching record found for the selected filters.';
      return;
    }

    const saveData = {
      StageWiseQcid: stageWiseQcid,
      CheckpointItems: this.checkpointItems,
      CheckerRemark: this.checkerRemark,
    };

    this.qualityService.saveCheckpointData(saveData).subscribe({
      next: (response) => {
       this.successMessage = 'Data saved successfully.';
      },
      error: (error) => {
       this.errorMessage = 'Error saving data. Please try again.';
      }
    });
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
  }
}
