import { Routes } from '@angular/router';
import { FlatpackCanopyAssemblyPlanReportComponent } from './flatpack-canopy-assembly-plan-report/flatpack-canopy-assembly-plan-report.component';
import { FlatpackCanopyAssemblyProcessComponent } from './flatpack-canopy-assembly-process/flatpack-canopy-assembly-process.component';
import { CanopyAssemblyPlanComponent } from './canopy-assembly-plan/canopy-assembly-plan.component';
import { CanopyAssemblyProcessComponent } from './canopy-assembly-process/canopy-assembly-process.component';
import { CanopyAssemblyProcessCheckerComponent } from './canopy-assembly-process-checker/canopy-assembly-process-checker.component';

export const CanopyAssemblyRoutes: Routes = [
  {
    path: 'flatpack-canopy-assembly-plan',
    component: FlatpackCanopyAssemblyPlanReportComponent,
    data: { title: 'Flatpack Canopy Report', breadcrumb: 'Flatpack Canopy Report' }
  },
  {
    path: 'flatpack-canopy-assembly-process',
    component: FlatpackCanopyAssemblyProcessComponent,
    data: { title: 'Flatpack Canopy Process', breadcrumb: 'Flatpack Canopy Process' }
  },
  {
    path: 'canopy-assembly-plan',
    component: CanopyAssemblyPlanComponent,
    data: { title: 'Canopy Plan', breadcrumb: 'Canopy Plan' }
  },
  {
    path: 'canopy-assembly-process',
    component: CanopyAssemblyProcessComponent,
    data: { title: 'Canopy Assembly Process', breadcrumb: 'Canopy Assembly Process' }
  },
  {
    path: 'canopy-assembly-process-checker',
    component: CanopyAssemblyProcessCheckerComponent,
    data: { title: 'Canopy Assembly Process Checker', breadcrumb: 'Canopy Assembly Process Checker' }
  }
]
