import { Routes } from '@angular/router';
import { ControlPanelJobcardComponent } from './control-panel-jobcard/control-panel-jobcard.component';
import { ControlPanelPlanComponent } from './control-panel-plan/control-panel-plan.component';

export const ControlPanelRoutes: Routes = [
  {
    path: 'control-panel-jobcard',
    component: ControlPanelJobcardComponent,
    data: { title: 'Control Panel JobCard', breadcrumb: 'Control Panel JobCard' }
  },
  {
    path: 'control-panel-plan',
    component: ControlPanelPlanComponent,
    data: { title: 'Control Panel Plan', breadcrumb: 'Control Panel Plan' }
  }
];
