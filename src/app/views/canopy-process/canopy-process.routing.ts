import { Routes } from '@angular/router';
import { CanopyPlanComponent } from './canopy-plan/canopy-plan.component';

export const CanopyProcessRoutes: Routes = [
     {
      path: 'canopy-plan',
      component: CanopyPlanComponent,
      data: { title: 'Canopy Process', breadcrumb: 'Canopy Process' }
     }
]
