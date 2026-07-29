import { Routes } from '@angular/router';
import { ControlPanelJobcardComponent } from './control-panel-jobcard/control-panel-jobcard.component';

export const ControlPanelRoutes: Routes = [
  {
    path: 'control-panel-jobcard',
    component: ControlPanelJobcardComponent,
    data: { title: 'Control Panel JobCard', breadcrumb: 'Control Panel JobCard' }
  }
];
