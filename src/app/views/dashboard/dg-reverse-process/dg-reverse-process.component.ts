import { Component, OnInit } from '@angular/core';
import {
  DgReverseProcessService,
  ReverseTransOption,
  KvaOption,
  ModelOption,
  ReverseTransSearchResult,
  ReverseTransSubmitRequest,
  ReverseTransRow,
} from './dg-reverse-process-service.service';

@Component({
  selector: 'app-dg-reverse-process',
  standalone: false,
  templateUrl: './dg-reverse-process.component.html',
  styleUrl: './dg-reverse-process.component.scss'
})
export class DgReverseProcessComponent implements OnInit {
  // Header row
  reverseTranCode: string = '';
  reverseTranDate: string = '';
  profitcenter: string = '';

  // Filter row — `reverseTxnFor` is set after the API call resolves.
  reverseTxnFor: string = '';
  selectedKVA: string = '';
  selectedModel: string = '';

  // Footer
  remark: string = '';

  // User-facing status modals (matches Stage 1 pattern — no alert()).
  errorMessage: string = '';
  successMessage: string = '';

  // Populated from GetReverseTransMst SP via DgReverseProcessService.
  // Empty until the API resolves; template renders nothing in that interval.
  reverseTxnForOptions: ReverseTransOption[] = [];

  // Populated from GetReverseKvaList SP whenever the selected
  // Reverse-Transaction-For changes.
  kvaOptions: string[] = [];

  // Populated from GetReverseModelList SP whenever the selected KVA changes.
  modelOptions: string[] = [];

  // Table rows shown under "Reverse Details" — empty by default so the
  // template renders the "No Record(s) Found" placeholder.
  // Populated from GetRevTransDts SP when the user clicks Search.
  reverseDetails: ReverseTransSearchResult[] = [];

  // Columns mirror the SP `GetRevTransDts_Checker_Maker` output. SrNo +
  // Select are UI-only (auto-number and a checkbox bound to row.SelectR).
  readonly reverseColumns: string[] = [
    'SrNo', 'Select', 'Stage4Code', 'TRCode',
    'KVA', 'Phase', 'Model', 'Panel',
    'Eng SrNo', 'Alt SrNo', 'Cpy SrNo',
    'Bat SrNo', 'Bat2 SrNo', 'Bat3 SrNo', 'Bat4 SrNo',
    'CP SrNo', 'CP2 SrNo', 'KRM SrNo',
    'Partcode', 'JobCode', 'J2Priority', 'Dt',
    'JobCard1', 'PanelType',
  ];

  constructor(private rpService: DgReverseProcessService) {}

  ngOnInit(): void {
    this.reverseTranDate = this.formatNow();
    const pccode = localStorage.getItem('ProfitCenter')?.trim();
    const pcname = localStorage.getItem('profitCenterName')?.trim() || 'DG Assembly';
    this.profitcenter = pccode ? `${pcname}-->${pccode}` : `${pcname}-->01.004`;
    this.fetchReverseTransOptions(pccode || '01.004');
  }

  private fetchReverseTransOptions(pcCode: string): void {
    this.rpService.getReverseTransMst(pcCode).subscribe({
      next: (rows) => {
        this.reverseTxnForOptions = rows ?? [];
        // No auto-select — KVA + Model APIs fire only when the user
        // explicitly picks a transType (onReverseTxnForChange handler).
      },
      error: (err) => {
        console.error('[ReverseProcess] failed to load options', err);
      },
    });
  }

  // Resolves the int TransID for the currently bound TransName so the API
  // gets the parameter shape the SP expects.
  private get selectedTransID(): number {
    return (
      this.reverseTxnForOptions.find((o) => o.TransName === this.reverseTxnFor)
        ?.TransID ?? 0
    );
  }

  onReverseTxnForChange(): void {
    this.fetchKvaOptions();
  }

  private fetchKvaOptions(): void {
    const transType = this.selectedTransID;
    if (!transType) {
      this.kvaOptions = [];
      this.selectedKVA = '';
      this.modelOptions = [];
      this.selectedModel = '';
      return;
    }
    const pccode = localStorage.getItem('ProfitCenter')?.trim() || '01.004';
    this.rpService.getReverseKvaList(transType, pccode).subscribe({
      next: (rows: KvaOption[]) => {
        this.kvaOptions = (rows ?? []).map((r) => r.KVA);
        // No auto-select — Model API fires only when the user explicitly
        // picks a KVA (onSelectedKVAChange handler).
        this.selectedKVA = '';
        this.modelOptions = [];
        this.selectedModel = '';
      },
      error: (err) => {
        this.kvaOptions = [];
        this.selectedKVA = '';
        this.modelOptions = [];
        this.selectedModel = '';
        console.error('[ReverseProcess] failed to load KVA', err);
      },
    });
  }

  onSelectedKVAChange(): void {
    this.fetchModelOptions();
  }

  private fetchModelOptions(): void {
    const transType = this.selectedTransID;
    const kva = this.selectedKVA;
    if (!transType || !kva) {
      this.modelOptions = [];
      this.selectedModel = '';
      return;
    }
    const pccode = localStorage.getItem('ProfitCenter')?.trim() || '01.004';
    this.rpService.getReverseModelList(transType, pccode, kva).subscribe({
      next: (rows: ModelOption[]) => {
        this.modelOptions = (rows ?? []).map((r) => r.Model);
        this.selectedModel = this.modelOptions[0] ?? '';
      },
      error: (err) => {
        this.modelOptions = [];
        this.selectedModel = '';
        console.error('[ReverseProcess] failed to load Model', err);
      },
    });
  }

  onSearch(): void {
    const transType = this.selectedTransID;
    const pccode = localStorage.getItem('ProfitCenter')?.trim() || '01.004';
    const kva = this.selectedKVA;
    const model = this.selectedModel;

    if (!transType || !kva || !model) {
      console.warn(
        '[ReverseProcess] Search ignored — transType, KVA, Model must all be selected.'
      );
      return;
    }

    this.rpService.getRevTransDts(transType, pccode, kva, model).subscribe({
      next: (rows) => {
        this.reverseDetails = rows ?? [];
      },
      error: (err) => {
        this.reverseDetails = [];
        console.error('[ReverseProcess] search failed', err);
      },
    });
  }

  onSubmit(): void {
    const selectedRows = this.reverseDetails.filter((r) => !!r?.SelectR);

    if (selectedRows.length === 0) {
      console.warn('[ReverseProcess] no rows selected');
      return;
    }

    const transType = this.selectedTransID;
    const pccode = localStorage.getItem('ProfitCenter')?.trim() || '01.004';

    if (!transType) {
      console.warn('[ReverseProcess] transType not set; cannot submit');
      return;
    }

    const payload: ReverseTransSubmitRequest = {
      PCCode: pccode,
      RevTransFor: transType,
      Remark: this.remark || '',
      Rows: selectedRows.map<ReverseTransRow>((r) => ({
        EngSrNo: r.EngSrNo,
        JobCode: r.JobCode,
        J2Priority: r.J2Priority,
        Partcode: r.Partcode,
        JobCard1: r.JobCard1,
        PanelType: r.PanelType,
        Stage4Code: r.Stage4Code,
        TRCode: r.TRCode,
      })),
    };

    this.rpService.submitReverseTrans(payload).subscribe({
      next: (rtCodes) => {
        console.log('[ReverseProcess] submit success:', rtCodes);
        this.successMessage =
          'Reverse transaction submitted.\nRTCode(s): ' + rtCodes;
        this.reverseDetails = [];
        this.remark = '';
      },
      error: (err) => {
        console.error('[ReverseProcess] submit failed', err);
        this.errorMessage =
          'Submit failed: ' + (err?.error || err?.message || 'Unknown error');
      },
    });
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private formatNow(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const hours24 = d.getHours();
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return (
      `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ` +
      `${pad(hours12)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`
    );
  }
}
