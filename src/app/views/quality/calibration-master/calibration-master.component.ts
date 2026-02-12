import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  QualityService,
  CompanyResponse,
  LocationPCResponse,
  CalibrationInstrumentResponse,
  CalibrationMstResponse,
} from '../quality.service';

@Component({
  selector: 'app-calibration-master',
  templateUrl: './calibration-master.component.html',
  styleUrls: ['./calibration-master.component.scss'],
})
export class CalibrationMasterComponent implements OnInit {
  calibrationForm!: FormGroup;
  companies: CompanyResponse[] = [];
  instruments: CalibrationInstrumentResponse[] = [];
  locations: LocationPCResponse[] = [];

  // Hardcoded designation - change to 'maker' or 'checker'
  designation: string = 'maker';

  constructor(
    private fb: FormBuilder,
    private qualityService: QualityService,
  ) {}

  ngOnInit(): void {
    this.loadCompanies();
    this.loadLocations();
    this.loadInstruments();
    this.initializeForm();
  }

  private loadCompanies(): void {
    this.qualityService.getCompanyList().subscribe({
      next: (data: CompanyResponse[]) => {
        this.companies = data;
      },
      error: (error) => {
        console.error('Error loading companies:', error);
      },
    });
  }

  private loadLocations(): void {
    this.qualityService.getPCNames().subscribe({
      next: (data: LocationPCResponse[]) => {
        this.locations = data;
      },
      error: (error) => {
        console.error('Error loading locations:', error);
      },
    });
  }

  private loadInstruments(): void {
    this.qualityService.getPartcodesForCalibration().subscribe({
      next: (data: CalibrationInstrumentResponse[]) => {
        this.instruments = data;
      },
      error: (error) => {
        console.error('Error loading instruments:', error);
      },
    });
  }

  private initializeForm(): void {
    this.calibrationForm = this.fb.group({
      company: ['', Validators.required],
      makerRemark: [''],
      checkerRemark: [''],
      entries: this.fb.array([]),
    });

    // For maker, add initial empty row
    if (this.designation === 'maker') {
      this.addEntry();
    }

    // Listen to company change for checker
    if (this.designation === 'checker') {
      this.calibrationForm.get('company')?.valueChanges.subscribe((companyId) => {
        if (companyId) {
          this.loadUnauthorizedData(companyId);
        } else {
          this.entries.clear();
        }
      });
    }
  }

  // private loadUnauthorizedData(companyId: number): void {
  //   this.qualityService.getUnauthorizedCalibrationData(companyId).subscribe({
  //     next: (data: CalibrationMstResponse[]) => {
  //       this.entries.clear();

  //       if (data.length === 0) {
  //         console.warn('No unauthorized records found for this company.');
  //         return;
  //       }

  //       data.forEach((record) => {
  //         const formGroup = this.createEntryFormGroupWithData(record);
  //         this.entries.push(formGroup);
  //       });

  //       // Set maker remark from first record (same for all rows)
  //       if (data[0]?.makerRemark) {
  //         this.calibrationForm.get('makerRemark')?.setValue(data[0].makerRemark);
  //       }
  //     },
  //     error: (error) => {
  //       console.error('Error loading unauthorized data:', error);
  //     },
  //   });
  // }

  private loadUnauthorizedData(companyId: number): void {
  console.log('Fetching data for companyId:', companyId);

  this.qualityService.getUnauthorizedCalibrationData(companyId).subscribe({
    next: (data: CalibrationMstResponse[]) => {
      console.log('Raw API Response:', data);
      console.log('Response type:', typeof data);
      console.log('Is Array:', Array.isArray(data));

      if (data && data.length > 0) {
        console.log('First record:', JSON.stringify(data[0], null, 2));
        console.log('First record keys:', Object.keys(data[0]));
      }

      this.entries.clear();

      if (!data || data.length === 0) {
        console.warn('No unauthorized records found for this company.');
        return;
      }

      data.forEach((record, index) => {
        console.log(`Record ${index}:`, {
          instrumentId: record.InstrumentId,
          instrumentName: record.PartCode,
          type: record.Type,
          idNo: record.IdNo,
          srNo: record.SrNo,
          location: record.Location,
          lc: record.Lc,
          calDate: record.CalDate,
          dueDate: record.DueDate,
          makerRemark: record.MakerRemark,
        });

        const formGroup = this.createEntryFormGroupWithData(record);
        console.log(`FormGroup ${index} value:`, formGroup.getRawValue());
        this.entries.push(formGroup);
      });

      if (data[0]?.MakerRemark) {
        this.calibrationForm.get('makerRemark')?.setValue(data[0].MakerRemark);
      }

      console.log('Total entries loaded:', this.entries.length);
      console.log('All entries:', this.entries.getRawValue());
    },
    error: (error) => {
      console.error('API Error:', error);
      console.error('Error status:', error.status);
      console.error('Error message:', error.message);
    },
  });
}

  private createEntryFormGroupWithData(record: CalibrationMstResponse): FormGroup {
  const calDate = record.CalDate ? record.CalDate.substring(0, 10) : '';
  const dueDate = record.DueDate ? record.DueDate.substring(0, 10) : '';

  return this.fb.group({
    instrumentId: [record.InstrumentId],
    srNo: [{ value: 0, disabled: true }],
    instrumentName: [record.PartCode, Validators.required],
    type: [record.Type || ''],
    idNo: [record.IdNo || ''],
    srNoField: [record.SrNo || ''],
    make: [record.Make || ''],
    range: [record.Range || ''],
    unit: [record.Unit || ''],
    lc: [record.Lc || ''],
    locationPC: [record.Location || ''],
    calDate: [calDate],
    dueDate: [dueDate],
  });
}

  get entries(): FormArray {
    return this.calibrationForm.get('entries') as FormArray;
  }

  private createEntryFormGroup(srNo: number): FormGroup {
    return this.fb.group({
      instrumentId: [0],
      srNo: [{ value: srNo, disabled: true }],
      instrumentName: ['', Validators.required],
      type: [''],
      idNo: [''],
      srNoField: [''],
      make: [''],
      range: [''],
      unit: [''],
      lc: [''],
      locationPC: [''],
      calDate: [''],
      dueDate: [''],
    });
  }

  addEntry(): void {
    const newSrNo = this.entries.length + 1;
    this.entries.push(this.createEntryFormGroup(newSrNo));
  }

  removeEntry(index: number): void {
    if (this.entries.length > 1) {
      this.entries.removeAt(index);
      this.updateSerialNumbers();
    }
  }

  private updateSerialNumbers(): void {
    this.entries.controls.forEach((control, index) => {
      control.get('srNo')?.setValue(index + 1);
    });
  }

  onSubmit(): void {
    if (!this.calibrationForm.get('company')?.value) {
      console.warn('Please select a company.');
      return;
    }

    if (this.entries.length === 0) {
      console.warn('Please add at least one calibration entry.');
      return;
    }

    const rawEntries = this.entries.getRawValue();
    for (let i = 0; i < rawEntries.length; i++) {
      const entry = rawEntries[i];
      const rowNo = i + 1;

      if (!entry.instrumentName) {
        console.warn(`Please select Instrument Name in Row ${rowNo}.`);
        return;
      }
      if (!entry.type || entry.type.trim() === '') {
        console.warn(`Please enter Type in Row ${rowNo}.`);
        return;
      }
      if (!entry.idNo || entry.idNo.trim() === '') {
        console.warn(`Please enter ID No. in Row ${rowNo}.`);
        return;
      }
      if (!entry.locationPC) {
        console.warn(`Please select Location/PC in Row ${rowNo}.`);
        return;
      }
      if (!entry.calDate) {
        console.warn(`Please select Calibration Date in Row ${rowNo}.`);
        return;
      }
      if (!entry.dueDate) {
        console.warn(`Please select Due Date in Row ${rowNo}.`);
        return;
      }

      if (entry.calDate && entry.dueDate) {
        const calDate = new Date(entry.calDate);
        const dueDate = new Date(entry.dueDate);
        if (dueDate <= calDate) {
          console.warn(`Due Date must be after Calibration Date in Row ${rowNo}.`);
          return;
        }
      }
    }

    const instrumentIds = rawEntries.map(e => e.instrumentName);
    const duplicates = instrumentIds.filter((id, index) => instrumentIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      console.warn('Duplicate instrument entries found. Please remove duplicates.');
      return;
    }

    const formData = {
      companyId: this.calibrationForm.get('company')?.value,
      makerRemark: this.calibrationForm.get('makerRemark')?.value || '',
      checkerRemark: this.calibrationForm.get('checkerRemark')?.value || '',
      designation: this.designation,
      entries: rawEntries.map((entry) => ({
        instrumentId: entry.instrumentId || 0,
        partCode: entry.instrumentName,
        type: entry.type,
        idNo: entry.idNo,
        srNo: entry.srNoField,
        make: entry.make,
        range: entry.range,
        unit: entry.unit,
        lc: entry.lc,
        location: entry.locationPC,
        calDate: entry.calDate || null,
        dueDate: entry.dueDate || null,
      })),
    };

    console.log('Form Data:', formData);

    this.qualityService.saveCalibrationMaster(formData).subscribe({
      next: (res) => {
        console.log('Calibration data saved successfully.', res);
        this.onReset();
      },
      error: (err) => {
        console.error('Failed to save calibration data.', err);
      },
    });
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.values(formGroup.controls).forEach((control) => {
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }

  onReset(): void {
    this.calibrationForm.reset();
    this.entries.clear();
    if (this.designation === 'maker') {
      this.addEntry();
    }
  }
}
