import { Routes } from '@angular/router';
//import { CanopyPlanComponent } from './canopy-plan/canopy-plan.component';
import { SheetMetalJobcardComponent } from './sheet-metal-jobcard/sheet-metal-jobcard.component';
import { SheetMetalJobcardCheckerComponent } from './sheet-metal-jobcard-checker/sheet-metal-jobcard-checker.component';
import { CNCMakerComponent } from './cnc-maker/cnc-maker.component';
import { CNCCheckerComponent } from './cnc-checker/cnc-checker.component';
import { BendingMakerComponent } from './bending-maker/bending-maker.component';
import { BendingCheckerComponent } from './bending-checker/bending-checker.component';
import { FabricationMakerComponent } from './fabrication-maker/fabrication-maker.component';
import { FabricationCheckerComponent } from './fabrication-checker/fabrication-checker.component';
import { PowderCoatingMakerComponent } from './powder-coating-maker/powder-coating-maker.component';
import { PowderCoatingCheckerComponent } from './powder-coating-checker/powder-coating-checker.component';
import { JobCardConopyReqInActiveComponent } from './job-card-conopy-req-in-active/job-card-conopy-req-in-active.component';
import { SheetMetalReverseProcessComponent } from './sheet-metal-reverse-process/sheet-metal-reverse-process.component';

export const CanopyProcessRoutes: Routes = [
  // {
  //   path: 'canopy-plan',
  //   component: CanopyPlanComponent,
  //   data: { title: 'Canopy Process', breadcrumb: 'Canopy Process' }
  // },
  {
    path: 'sheet-metal-jobcard',
    component: SheetMetalJobcardComponent,
    data: { title: 'Sheet Metal JobCard', breadcrumb: 'Sheet Metal JobCard' }
  },
  {
    path: 'sheet-metal-jobcard-checker',
    component: SheetMetalJobcardCheckerComponent,
    data: { title: 'Sheet Metal JobCard Checker', breadcrumb: 'Sheet Metal JobCard Checker' }
  },
  {
    path: 'cnc-maker',
    component: CNCMakerComponent,
    data: { title: 'CNC Maker', breadcrumb: 'CNC Maker' }
  },
  {
    path: 'cnc-checker',
    component: CNCCheckerComponent,
    data: { title: 'CNC Checker', breadcrumb: 'CNC Checker' }
  },
    {
    path: 'bending-maker',
    component: BendingMakerComponent,
    data: { title: 'Bending Maker', breadcrumb: 'Bending Maker' }
  }
  ,
  {
    path: 'bending-checker',
    component: BendingCheckerComponent,
    data: { title: 'Bending Checker', breadcrumb: 'Bending Checker' }
  },
  {
    path: 'fabrication-maker',
    component: FabricationMakerComponent,
    data: { title: 'Fabrication Maker', breadcrumb: 'Fabrication Maker' }
  },
  {
    path: 'fabrication-checker',
    component: FabricationCheckerComponent,
    data: { title: 'Fabrication Checker', breadcrumb: 'Fabrication Checker' }
  },
  {
    path: 'powder-coating-maker',
    component: PowderCoatingMakerComponent,
    data: { title: 'Powder Coating Maker', breadcrumb: 'Powder Coating Maker' }
  },
  {
    path: 'powder-coating-checker',
    component: PowderCoatingCheckerComponent,
    data: { title: 'Powder Coating Checker', breadcrumb: 'Powder Coating Checker' }
  },
  {
    path: 'job-card-conopy-req-in-active',
    component: JobCardConopyReqInActiveComponent,
    data: { title: 'Job Card Canopy Req In-Active', breadcrumb: 'Job Card Canopy Req In-Active' }
  },
  {
    path: 'sheet-metal-reverse-process',
    component: SheetMetalReverseProcessComponent,
    data: { title: 'Sheet Metal Reverse Process', breadcrumb: 'Sheet Metal Reverse Process' }
  }

  
];
