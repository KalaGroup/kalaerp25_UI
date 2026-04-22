import { Routes } from '@angular/router';
import { ApplicationMasterComponent } from './application-master/application-master.component';

export const DefenceRoutes: Routes = [
  {
    path: 'application-master',
    component: ApplicationMasterComponent,
    data: { title: 'Application Master', breadcrumb: 'Application Master' }
  }
];
