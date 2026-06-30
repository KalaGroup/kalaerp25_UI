import { Component, OnInit } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  DgMaterialStatusService,
  MaterialDept,
  KvaOption,
  MaterialRecord,
  SaveMaterialBatchRequest,
} from './dg-material-status.service';

@Component({
  selector: 'app-dg-material-status',
  templateUrl: './dg-material-status.component.html',
  styleUrls: ['./dg-material-status.component.scss'],
  standalone: false,
  animations: [
    trigger('collapse', [
      state('open', style({ height: '*', opacity: 1, paddingTop: '*', paddingBottom: '*' })),
      state('closed', style({ height: '0', opacity: 0, paddingTop: '0', paddingBottom: '0', overflow: 'hidden' })),
      transition('open <=> closed', animate('260ms cubic-bezier(0.4, 0, 0.2, 1)')),
    ]),
  ],
})
export class DgMaterialStatusComponent implements OnInit {
  form!: FormGroup;

  isFormVisible = false;   // false = View (records) page first; true = Add (entry form)
  isEditMode = false;

  departments: MaterialDept[] = [];
  kvaOptions: KvaOption[] = [];

  /** "Type of material" options — hardcoded (from the Excel sub-headers). */
  materialTypes: string[] = ['Raw', 'Consumable', 'Spares', 'Tools'];

  reportRows: MaterialRecord[] = [];
  recordsCollapsed = false;

  isLoading = false;
  isExporting = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private service: DgMaterialStatusService,
  ) { }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.form = this.fb.group({
      date: [today, Validators.required],      // day-wise (filter + entry header)
      deptCode: [''],                           // ProfitCenter (with line)
      rows: this.fb.array([this.newRow()]),
    });

    this.loadDepartments();
    this.loadKva();
    this.searchReport();          // View page shown first
  }

  /* ---------------- form rows ---------------- */
  get rows(): FormArray {
    return this.form.get('rows') as FormArray;
  }

  private newRow(): FormGroup {
    return this.fb.group({
      plan: ['', Validators.required],                       // KVA
      materialType: ['Raw', Validators.required],            // hardcoded dropdown
      quantity: [null, [Validators.required, Validators.min(0)]],
      status: ['', Validators.required],                                          // data entry (the "OK"/note)
      person: [''],                                          // person to communicate (data entry)
    });
  }

  addRow(): void {
    if (this.rows.invalid) {
      this.rows.markAllAsTouched();
      this.errorMessage = 'Complete the current row(s) before adding another.';
      return;
    }
    this.clearMessages();
    this.rows.push(this.newRow());
  }

  removeRow(i: number): void {
    if (this.rows.length > 1) {
      this.rows.removeAt(i);
    } else {
      this.rows.at(0).reset({ plan: '', materialType: 'Raw', quantity: null, status: '', person: '' });
    }
  }

  /* ---------------- view <-> add ---------------- */
  showForm(): void {
    this.isFormVisible = true;
    this.isEditMode = false;
    this.lockHeader(false);
    this.rows.clear();
    this.rows.push(this.newRow());
    this.form.patchValue({ deptCode: '' });
    this.clearMessages();
  }

  showList(): void {
    this.isFormVisible = false;
    this.isEditMode = false;
    this.lockHeader(false);
    this.clearMessages();
    this.searchReport();
  }

  /** Open the Add form in edit mode, pre-loaded with that day + department's saved rows. */
  editRecord(r: MaterialRecord): void {
    this.isFormVisible = true;
    this.isEditMode = true;
    this.clearMessages();
    this.form.patchValue({ date: r.date, deptCode: r.deptCode });
    this.lockHeader(true);          // don't let date/department change mid-edit

    this.isLoading = true;
    this.service.getMaterialRecords(r.date, r.deptCode).subscribe({
      next: (rows) => {
        this.isLoading = false;
        this.rows.clear();
        (rows || []).forEach((x) =>
          this.rows.push(
            this.fb.group({
              plan: [x.plan, Validators.required],
              materialType: [x.materialType || 'Raw', Validators.required],
              quantity: [x.quantity, [Validators.required, Validators.min(0)]],
              status: [x.status || '', Validators.required],
              person: [x.person || ''],
            }),
          ),
        );
        if (this.rows.length === 0) this.rows.push(this.newRow());
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Could not load the rows for editing.';
      },
    });
  }

  /** Soft-delete one material line. */
  deleteRecord(r: MaterialRecord): void {
    const ok = confirm(`Delete material row "${r.plan}" (${r.materialType}) on ${r.date}?`);
    if (!ok) return;
    this.isLoading = true;
    this.service.deleteMaterialRecord(r.mcode, r.srNo).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Record deleted.';
        this.searchReport();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Could not delete the record.';
      },
    });
  }

  /** Lock/unlock date + department (during edit). */
  private lockHeader(lock: boolean): void {
    const opts = { emitEvent: false };
    ['date', 'deptCode'].forEach((c) => {
      const ctrl = this.form.get(c);
      if (!ctrl) return;
      lock ? ctrl.disable(opts) : ctrl.enable(opts);
    });
  }

  /* ---------------- records (view) ---------------- */
  searchReport(): void {
    this.clearMessages();
    this.isLoading = true;
    const date = this.form.get('date')?.value || null;
    const dept = this.form.get('deptCode')?.value || null;
    this.service.getMaterialRecords(date, dept).subscribe({
      next: (rows) => {
        this.reportRows = rows || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Could not load records.';
      },
    });
  }

  toggleRecords(): void {
    this.recordsCollapsed = !this.recordsCollapsed;
  }

  /* ---------------- lookups ---------------- */
  private loadDepartments(): void {
    this.service.getDepartments(this.service.companyCode).subscribe({
      next: (d) => (this.departments = d),
      error: () => (this.errorMessage = 'Could not load departments.'),
    });
  }

  private loadKva(): void {
    this.service.getKvaList().subscribe({
      next: (k) => (this.kvaOptions = k),
      error: () => (this.errorMessage = 'Could not load KVA list.'),
    });
  }

  get selectedDeptName(): string {
    const d = this.departments.find((x) => x.deptCode === this.form.get('deptCode')?.value);
    return d ? d.deptName : '';
  }

  /* ---------------- save ---------------- */
  submit(): void {
    this.clearMessages();

    if (this.form.get('date')?.invalid) {
      this.form.get('date')?.markAsTouched();
      this.errorMessage = 'Please select a date.';
      return;
    }
    if (!this.form.get('deptCode')?.value) {
      this.form.get('deptCode')?.markAsTouched();
      this.errorMessage = 'Please select a department.';
      return;
    }

    // Every row must be complete: Plan, Type of material, Quantity and Status.
    if (this.rows.invalid) {
      this.rows.markAllAsTouched();
      this.errorMessage = 'Each row needs Plan, Type of material, Quantity and Status.';
      return;
    }

    // const valid = this.rows.controls.filter((r) => {
    //   const v = r.value;
    //   return v.plan && v.materialType && v.quantity !== null && v.quantity !== '';
    // });

    // if (valid.length === 0) {
    //   this.errorMessage = 'Add at least one complete row (Plan, Type of material, Quantity).';
    //   return;
    // }

    const payload: SaveMaterialBatchRequest = {
      date: this.form.get('date')?.value,
      companyCode: this.service.companyCode,
      deptCode: this.form.get('deptCode')?.value,
      deptName: this.selectedDeptName,
      createdBy: this.service.sessionUser,
      entries: this.rows.controls.map((r) => ({
        plan: r.value.plan,
        materialType: r.value.materialType,
        quantity: Number(r.value.quantity),
        status: r.value.status || '',
        person: r.value.person || '',
      })),
    };

    this.isLoading = true;
    this.service.saveMaterialBatch(payload).subscribe({
      next: () => {
        this.isLoading = false;
        const n = payload.entries.length;
        this.successMessage = `Saved ${n} material ${n === 1 ? 'row' : 'rows'} for ${this.selectedDeptName}.`;
        this.isFormVisible = false;
        this.isEditMode = false;
        this.lockHeader(false);
        this.searchReport();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Save failed. Please try again.';
      },
    });
  }

  clear(): void {
    this.clearMessages();
    this.rows.clear();
    this.rows.push(this.newRow());
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  trackByIndex(i: number): number {
    return i;
  }

  /* ============================================================= */
  /* Exports (flat table — ExcelJS + jsPDF via CDN, same as the    */
  /* other forms)                                                  */
  /* ============================================================= */
  private exportDateLabel(): string {
    const d = this.form.get('date')?.value;
    return d ? d.split('-').reverse().join('-') : '';
  }

  /** Pretty date for the grid strip: '2026-06-26' -> '26 Jun 2026'. */
  niceDate(s: string | null | undefined): string {
    if (!s) return '';
    const parts = String(s).split('-');
    if (parts.length !== 3) return String(s);
    const y = +parts[0], m = +parts[1], d = +parts[2];
    if (!y || !m || !d) return String(s);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d} ${months[m - 1]} ${y}`;
  }

  private exportFileName(ext: string): string {
    const d = this.form.get('date')?.value || 'all';
    return `Material_U1_${d}.${ext}`;
  }

  async exportExcel(): Promise<void> {
    if (this.isExporting || this.reportRows.length === 0) return;
    this.isExporting = true;
    try {
      if (!(window as any).ExcelJS) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
      }
      const ExcelJS = (window as any).ExcelJS;
      if (!ExcelJS) { this.errorMessage = 'Excel library failed to load.'; return; }

      const TEAL = 'FF0F6C8D';
      const thin = { style: 'thin', color: { argb: 'FFB0B0B0' } };
      const allBorders = { top: thin, left: thin, bottom: thin, right: thin };
      const center = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Material');
      ws.columns = [
        { width: 6 }, { width: 12 }, { width: 26 }, { width: 14 },
        { width: 16 }, { width: 10 }, { width: 28 }, { width: 24 },
      ];

      ws.mergeCells('A1:H1');
      const t1 = ws.getCell('A1');
      t1.value = {
        richText: [
          { text: this.service.companyName + '\n', font: { bold: true, size: 15, color: { argb: 'FFFFFFFF' } } },
          { text: `Production Material U1        ${this.exportDateLabel()}`, font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } } },
        ],
      };
      t1.alignment = center;
      t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
      ws.getRow(1).height = 40;

      const headers = ['Sr.no', 'Date', 'Department', 'Plan (KVA)', 'Type of material', 'Quantity', 'Status / Remark', 'Person to communicate'];
      headers.forEach((h, i) => {
        const c = ws.getCell(2, i + 1);
        c.value = h;
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
        c.alignment = center;
        c.border = allBorders;
      });

      let sr = 1, rowNum = 3;
      for (const r of this.reportRows) {
        ws.getRow(rowNum).values = [
          sr++, r.date, r.deptName, r.plan, r.materialType, r.quantity, r.status || '', r.person || '',
        ];
        for (let c = 1; c <= 8; c++) {
          const cell = ws.getRow(rowNum).getCell(c);
          cell.border = allBorders;
          cell.alignment = { horizontal: c === 1 || c === 6 ? 'center' : 'left', vertical: 'middle', wrapText: c === 7 };
        }
        rowNum++;
      }

      const buf = await wb.xlsx.writeBuffer();
      this.downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), this.exportFileName('xlsx'));
    } catch {
      this.errorMessage = 'Excel export failed.';
    } finally {
      this.isExporting = false;
    }
  }

  async exportPdf(): Promise<void> {
    if (this.isExporting || this.reportRows.length === 0) return;
    this.isExporting = true;
    try {
      if (!(window as any).jspdf) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }
      const jsPDF = (window as any).jspdf?.jsPDF;
      if (!jsPDF) { this.errorMessage = 'PDF library failed to load.'; return; }
      if (!jsPDF.API || !jsPDF.API.autoTable) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const M = 40;

      // main heading — centered
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(20, 30, 40);
      doc.text('Production Material U1', pageW / 2, 40, { align: 'center' });

      // company name — left, below the heading
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 108, 141);
      doc.text(this.service.companyName, M, 62);

      // date — right, same line as the company name
      const dateLabel = this.exportDateLabel();
      if (dateLabel) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(90, 90, 90);
        doc.text(`Date: ${dateLabel}`, pageW - M, 62, { align: 'right' });
      }

      // divider
      doc.setDrawColor(15, 108, 141);
      doc.setLineWidth(1);
      doc.line(M, 72, pageW - M, 72);

      const body = this.reportRows.map((r, i) => [
        i + 1, r.date, r.deptName, r.plan, r.materialType, r.quantity, r.status || '', r.person || '',
      ]);

      (doc as any).autoTable({
        head: [['Sr.no', 'Date', 'Department', 'Plan (KVA)', 'Type of material', 'Qty', 'Status / Remark', 'Person to communicate']],
        body,
        startY: 84,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [15, 108, 141], textColor: 255 },
        alternateRowStyles: { fillColor: [247, 249, 251] },
      });

      doc.save(this.exportFileName('pdf'));
    } catch {
      this.errorMessage = 'PDF export failed.';
    } finally {
      this.isExporting = false;
    }
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
      if (existing) {
        if ((existing as any).dataset.loaded === '1') { resolve(); return; }
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error(`Failed to load: ${src}`)));
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => { (script as any).dataset.loaded = '1'; resolve(); };
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  }
}