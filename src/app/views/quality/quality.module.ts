import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { MatToolbar } from "@angular/material/toolbar";
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatCheckbox } from "@angular/material/checkbox";
import { QualityRoutes } from './quality.routing';
import { DgQualityMasterComponent } from './dg-quality-master/dg-quality-master.component';
import { DgStageICheckerComponent } from './dg-stage-i-checker/dg-stage-i-checker.component';
import { QualityMasterCheckerComponent } from './quality-master-checker/quality-master-checker.component';
import { CalibrationMasterComponent } from './calibration-master/calibration-master.component';

@NgModule({
  declarations: [
    DgStageICheckerComponent,
    DgQualityMasterComponent,
    QualityMasterCheckerComponent,
    CalibrationMasterComponent
  ],
  imports: [
    CommonModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatIconModule,
    MatCardModule,
    MatMenuModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatRadioModule,
    MatButtonModule,
    MatChipsModule,
    MatListModule,
    MatTabsModule,
    MatTableModule,
    MatGridListModule,
    MatFormFieldModule,
    MatFormFieldModule,
    MatSelectModule,
    ZXingScannerModule,
    MatToolbar,
    MatProgressSpinner,
    RouterModule.forChild(QualityRoutes),
    MatCheckbox
]
})
export class QualityModule { }
