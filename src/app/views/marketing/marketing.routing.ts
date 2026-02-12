import { Routes } from '@angular/router';
import { MofNfaLevelComponent } from './mof-nfa-level/mof-nfa-level.component';

export const PpcMarketingRoutes: Routes = [
  {
    path: 'mof-nfa-level',
    component: MofNfaLevelComponent,
    data: { title: 'MOF-NFA Level', breadcrumb: 'MOF-NFA Level' }
  }
];
