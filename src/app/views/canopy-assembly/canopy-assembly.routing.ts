import { Routes } from '@angular/router';
import { FlatpackCanopyAssemblyPlanReportComponent } from './flatpack-canopy-assembly-plan-report/flatpack-canopy-assembly-plan-report.component';
import { FlatpackCanopyAssemblyProcessComponent } from './flatpack-canopy-assembly-process/flatpack-canopy-assembly-process.component';

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
  }
]
