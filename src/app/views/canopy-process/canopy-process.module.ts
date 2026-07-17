import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
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
import { CanopyProcessRoutes } from './canopy-process.routing';
import { SheetMetalJobcardComponent } from './sheet-metal-jobcard/sheet-metal-jobcard.component';
import { SheetMetalJobcardCheckerComponent } from './sheet-metal-jobcard-checker/sheet-metal-jobcard-checker.component';
import { CNCMakerComponent } from './cnc-maker/cnc-maker.component';
import { CNCCheckerComponent } from './cnc-checker/cnc-checker.component';
import { BendingMakerComponent } from './bending-maker/bending-maker.component';
import { BendingCheckerComponent } from './bending-checker/bending-checker.component';
import { FabricationMakerComponent } from './fabrication-maker/fabrication-maker.component';
import { FabricationCheckerComponent } from './fabrication-checker/fabrication-checker.component';
import { PowderCoatingCheckerComponent } from './powder-coating-checker/powder-coating-checker.component';
import { PowderCoatingMakerComponent } from './powder-coating-maker/powder-coating-maker.component';
import { JobCardConopyReqInActiveComponent } from './job-card-conopy-req-in-active/job-card-conopy-req-in-active.component';
import { SheetMetalReverseProcessComponent } from './sheet-metal-reverse-process/sheet-metal-reverse-process.component';

@NgModule({
  declarations: [
    //CanopyPlanComponent,
    SheetMetalJobcardComponent,
    SheetMetalJobcardCheckerComponent,
    CNCMakerComponent,
    CNCCheckerComponent,
    BendingMakerComponent,
    BendingCheckerComponent,
    FabricationMakerComponent,
    FabricationCheckerComponent,
    PowderCoatingCheckerComponent,
    PowderCoatingMakerComponent,
    JobCardConopyReqInActiveComponent,
    SheetMetalReverseProcessComponent,
  ],
  imports: [
    CommonModule,
      MatInputModule,
      FormsModule,
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
      RouterModule.forChild(CanopyProcessRoutes)
  ]
})
export class CanopyProcessModule { }
