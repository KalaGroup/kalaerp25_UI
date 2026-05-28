import { Component, OnInit } from '@angular/core';
import { EngAltCertificateService, EngAltCertRow } from './eng-alt-certificate.service';

export { EngAltCertRow };

/** One attachment shown inside the popup. */
export interface AttachmentRow {
  srNo: number;
  saveOrUpdate: 'S' | 'N';
  type: 'Image' | 'Video';
  fileType: string;
  fileName: string;
  videoId?: number;
  // For freshly inserted (saveOrUpdate === 'N') rows we keep the File handle
  // until Save fires so we can upload to the server.
  pendingFile?: File;
}

@Component({
  selector: 'app-eng-alt-certificate',
  standalone: false,
  templateUrl: './eng-alt-certificate.component.html',
  styleUrl: './eng-alt-certificate.component.scss',
})
export class EngAltCertificateComponent implements OnInit {
  // ── Filter strip ──────────────────────────────────────────────
  serialNoFilter: string = '';
  fromDate: string = '';
  toDate: string = '';

  // ── Context (read-only, derived from localStorage) ────────────
  pcCode: string = '';
  pcName: string = '';

  // ── Results table data ───────────────────────────────────────
  rows: EngAltCertRow[] = []; // raw from server (or empty for now)
  isLoading: boolean = false;
  loadError: string = '';

  // ── Pagination ───────────────────────────────────────────────
  currentPage: number = 1;
  pageSize: number = 25;
  pageSizeOptions: number[] = [25, 50, 100, 250, 500, 0]; // 0 == "All"

  // ── Attachment modal state ───────────────────────────────────
  showAttachmentModal: boolean = false;
  selectedTrCode: string = '';
  attachmentRows: AttachmentRow[] = [];
  selectedFileType: string = '';
  pendingFile?: File;
  readonly fileTypeOptions: string[] = [
    'Engine', 'Alternator', 'EWAP', 'KWH', 'CT',
  ];

  // ── Status modals ────────────────────────────────────────────
  successMessage: string = '';
  errorMessage: string = '';

  // ── Confirm (delete) modal ───────────────────────────────────
  confirmMessage: string = '';
  pendingDeleteIndex: number | null = null;

  // Column labels for the report table — keep in same order as the grid.
  readonly reportColumns: string[] = [
    'No', 'Attachment', 'TRCode', 'TR Date',
    'EngFile', 'AltFile', 'CTFile', 'KWHFile',
    'Eng Sr.No', 'Alt Sr.No', 'KVA', 'Phase', 'Model', 'Panel',
    'Part Desc', 'DI Status', 'Process Code', 'Process Date',
    'Profit Center', 'Remark', 'PartCode',
  ];

  constructor(private engAltCertService: EngAltCertificateService) {}

  ngOnInit(): void {
    // Default both date inputs to today (matches legacy behaviour).
    const today = this.todayIso();
    this.fromDate = today;
    this.toDate = today;

    // Same localStorage keys as the jobcard maker form.
    this.pcCode = localStorage.getItem('ProfitCenter')?.trim() ?? '';
    this.pcName = localStorage.getItem('profitCenterName')?.trim() ?? '';
    this.empCode = localStorage.getItem('employeeCode')?.trim() ?? '';
    this.compCode = localStorage.getItem('companyId')?.trim() ?? '';

    // Auto-load today's rows on first render so the page isn't blank.
    this.onSearch();
  }

  // ────────────────────────────────────────────────────────────
  //  Report list — search / pagination / export
  // ────────────────────────────────────────────────────────────

  onSearch(): void {
    console.log('[EngAltCert] onSearch() invoked', {
      fromDate: this.fromDate,
      toDate: this.toDate,
      serialNoFilter: this.serialNoFilter,
      pcCode: this.pcCode,
      isLoading: this.isLoading,
    });

    if (!this.fromDate || !this.toDate) {
      console.warn('[EngAltCert] aborting — fromDate or toDate empty');
      this.errorMessage = 'Please choose both From Date and To Date.';
      return;
    }

    this.isLoading = true;
    this.loadError = '';
    this.rows = [];
    this.currentPage = 1;
    console.log('[EngAltCert] firing HTTP request…');

    this.engAltCertService
      .getEngAltTrCertificate(this.fromDate, this.toDate, this.serialNoFilter)
      .subscribe({
        next: (data) => {
          console.log('[EngAltCert] HTTP next — type:', typeof data, 'isArray:', Array.isArray(data), 'length:', Array.isArray(data) ? data.length : 'n/a');
          if (Array.isArray(data) && data.length > 0) {
            console.log('[EngAltCert] first row keys:', Object.keys(data[0]));
            console.log('[EngAltCert] first row:', data[0]);
          }
          this.rows = Array.isArray(data) ? data : [];
          this.isLoading = false;
          console.log('[EngAltCert] bound rows.length =', this.rows.length);
        },
        error: (err) => {
          console.error('[EngAltCert] HTTP error', {
            status: err?.status,
            statusText: err?.statusText,
            url: err?.url,
            message: err?.message,
            error: err?.error,
          });
          this.isLoading = false;
          this.loadError = err?.error?.message || err?.message || 'Failed to load report.';
          this.errorMessage = this.loadError;
        },
        complete: () => {
          console.log('[EngAltCert] HTTP observable completed');
        },
      });
  }

  onExportExcel(): void {
    // Stub for now — will use SheetJS once data is wired.
    console.log('[EngAltCert] exportExcel — rows:', this.rows.length);
  }

  get filteredRows(): EngAltCertRow[] {
    // Future hook: client-side filtering layered on top of server result.
    return this.rows;
  }

  get pagedRows(): EngAltCertRow[] {
    if (this.pageSize === 0) return this.filteredRows; // "All"
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    if (this.pageSize === 0) return 1;
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    // Show up to 7 page tabs around the current page.
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

  rowDisplayIndex(rowInPage: number): number {
    if (this.pageSize === 0) return rowInPage + 1;
    return (this.currentPage - 1) * this.pageSize + rowInPage + 1;
  }

  get recordRangeLabel(): string {
    const total = this.filteredRows.length;
    if (total === 0) return '0 of 0';
    if (this.pageSize === 0) return `1–${total} of ${total}`;
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `${start}–${end} of ${total}`;
  }

  // ────────────────────────────────────────────────────────────
  //  Row link handlers
  // ────────────────────────────────────────────────────────────

  onTrCodeClick(row: EngAltCertRow): void {
    // Placeholder: future route to a Test Report detail page.
    console.log('[EngAltCert] open TR detail', row.TRCode);
  }

  onTrPreviewClick(row: EngAltCertRow): void {
    // Placeholder: future report-viewer endpoint URL → open in new tab.
    console.log('[EngAltCert] open TR preview PDF', row.TRCode);
  }

  // ────────────────────────────────────────────────────────────
  //  Attachment modal
  // ────────────────────────────────────────────────────────────

  attachmentLoading: boolean = false;
  empCode: string = '';
  compCode: string = '';

  openAttachments(row: EngAltCertRow): void {
    this.selectedTrCode = row.TRCode ?? '';
    this.attachmentRows = [];
    this.selectedFileType = '';
    this.pendingFile = undefined;
    this.showAttachmentModal = true;

    if (!this.selectedTrCode) return;
    this.attachmentLoading = true;
    this.engAltCertService.getAttachmentsForTr(this.selectedTrCode).subscribe({
      next: (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        this.attachmentRows = list.map((r, i) => ({
          srNo: i + 1,
          saveOrUpdate: (r.SaveOrUpdate === 'N' ? 'N' : 'S') as 'S' | 'N',
          type: (r.Type === 'Video' ? 'Video' : 'Image') as 'Image' | 'Video',
          fileType: (r.FileType ?? '').toString(),
          fileName: (r.FileName ?? '').toString(),
          videoId: r.Video_ID ? Number(r.Video_ID) || undefined : undefined,
        }));
        this.attachmentLoading = false;
      },
      error: (err) => {
        this.attachmentLoading = false;
        this.errorMessage = err?.error?.message || err?.message || 'Failed to load attachments.';
      },
    });
  }

  closeAttachmentModal(): void {
    this.showAttachmentModal = false;
    this.selectedTrCode = '';
    this.attachmentRows = [];
    this.pendingFile = undefined;
    this.selectedFileType = '';
  }

  onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.pendingFile = input.files?.[0];
  }

  onInsertAttachment(): void {
    if (!this.selectedFileType) {
      this.errorMessage = 'Please select a file type.';
      return;
    }
    if (!this.pendingFile) {
      this.errorMessage = 'Please choose a file to upload.';
      return;
    }

    // Block duplicate FileType — each type (Engine/Alternator/CT/KWH/EWAP) may
    // appear only once in the list.
    const dupType = this.attachmentRows.some(
      (r) => (r.fileType || '').toLowerCase() === this.selectedFileType.toLowerCase()
    );
    if (dupType) {
      this.errorMessage = `A '${this.selectedFileType}' file is already added.`;
      return;
    }

    // Also block the exact same file name being added twice.
    const dupName = this.attachmentRows.some(
      (r) => r.fileName === this.pendingFile!.name
    );
    if (dupName) {
      this.errorMessage = 'File is already added.';
      return;
    }

    this.attachmentRows.push({
      srNo: this.attachmentRows.length + 1,
      saveOrUpdate: 'N',
      type: 'Image', // simple default; we'll refine when API is wired
      fileType: this.selectedFileType,
      fileName: this.pendingFile.name,
      pendingFile: this.pendingFile,
    });
    this.renumberAttachmentRows();

    // Reset the footer inputs for the next add.
    this.clearInsertRow();
  }

  /** Clears the footer add-row inputs (file type + chosen file). */
  clearInsertRow(): void {
    this.selectedFileType = '';
    this.pendingFile = undefined;
    const fileInput = document.getElementById(
      'attachmentFileInput'
    ) as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  }

  onViewAttachment(row: AttachmentRow): void {
    if (!row.fileName) return;

    // Pending (in-memory) files: open from the cached File handle via blob URL.
    if (row.saveOrUpdate === 'N' && row.pendingFile) {
      const url = URL.createObjectURL(row.pendingFile);
      window.open(url, '_blank');
      return;
    }

    // Saved files: stream from the API.
    const url = this.engAltCertService.buildDownloadUrl(
      this.selectedTrCode,
      row.fileName,
      row.fileType,
      row.videoId != null ? String(row.videoId) : null
    );
    window.open(url, '_blank');
  }

  onDeleteAttachment(index: number): void {
    const row = this.attachmentRows[index];
    if (!row) return;

    // Pending ('N') rows: just drop from the in-memory list.
    if (row.saveOrUpdate === 'N') {
      this.attachmentRows.splice(index, 1);
      this.renumberAttachmentRows();
      return;
    }

    // Saved ('S') rows: open the in-app confirm modal, then delete immediately.
    this.pendingDeleteIndex = index;
    this.confirmMessage = `Delete saved file "${row.fileName}"? This cannot be undone.`;
  }

  confirmDeleteYes(): void {
    const index = this.pendingDeleteIndex;
    this.confirmMessage = '';
    this.pendingDeleteIndex = null;
    if (index == null) return;

    const row = this.attachmentRows[index];
    if (!row) return;

    this.attachmentLoading = true;
    this.engAltCertService
      .deleteAttachment(
        this.selectedTrCode,
        row.fileName,
        row.fileType,
        row.videoId != null ? String(row.videoId) : null,
        this.empCode,
        this.compCode
      )
      .subscribe({
        next: (resp) => {
          this.attachmentLoading = false;
          this.attachmentRows.splice(index, 1);
          this.renumberAttachmentRows();
          this.successMessage = resp?.message || 'Attachment deleted successfully.';
          // Refresh the report so the row's Yes/No flags reflect the removal.
          this.onSearch();
        },
        error: (err) => {
          this.attachmentLoading = false;
          this.errorMessage = err?.error?.message || err?.message || 'Failed to delete attachment.';
        },
      });
  }

  confirmDeleteNo(): void {
    this.confirmMessage = '';
    this.pendingDeleteIndex = null;
  }

  isPending(row: AttachmentRow): boolean {
    return row.saveOrUpdate === 'N';
  }

  hasPendingRows(): boolean {
    return this.attachmentRows.some((r) => r.saveOrUpdate === 'N' && r.pendingFile);
  }

  saveAttachmentChanges(): void {
    const adds = this.attachmentRows
      .filter((r) => r.saveOrUpdate === 'N' && r.pendingFile)
      .map((r) => ({ fileType: r.fileType, file: r.pendingFile! }));

    if (adds.length === 0) {
      this.errorMessage = 'Please add at least one file attachment before saving.';
      return;
    }

    this.attachmentLoading = true;
    this.engAltCertService
      .saveAttachments(this.selectedTrCode, this.empCode, this.compCode, adds)
      .subscribe({
        next: (resp) => {
          this.attachmentLoading = false;
          this.successMessage = resp?.message || 'Attachments saved successfully.';
          this.closeAttachmentModal();
          // Refresh the report so the row's Yes/No flags reflect the new files.
          this.onSearch();
        },
        error: (err) => {
          this.attachmentLoading = false;
          this.errorMessage = err?.error?.message || err?.message || 'Failed to save attachments.';
        },
      });
  }

  // ────────────────────────────────────────────────────────────
  //  Status modal close
  // ────────────────────────────────────────────────────────────

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  // ────────────────────────────────────────────────────────────
  //  Helpers
  // ────────────────────────────────────────────────────────────

  private todayIso(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private renumberAttachmentRows(): void {
    this.attachmentRows.forEach((r, i) => (r.srNo = i + 1));
  }
}
