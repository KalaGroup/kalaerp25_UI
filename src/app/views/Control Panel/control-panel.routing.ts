import { Routes } from '@angular/router';
import { ControlPanelJobcardComponent } from './control-panel-jobcard/control-panel-jobcard.component';
import { ControlPanelJobcardCheckerComponent } from './control-panel-jobcard-checker/control-panel-jobcard-checker.component';
import { CncCpMakerComponent } from './cnc-cp-maker/cnc-cp-maker.component';

export const ControlPanelRoutes: Routes = [
  {
    path: 'control-panel-jobcard',
    component: ControlPanelJobcardComponent,
    data: { title: 'Control Panel JobCard', breadcrumb: 'Control Panel JobCard' }
  },
  {
    path: 'control-panel-jobcard-checker',
    component: ControlPanelJobcardCheckerComponent,
    data: { title: 'Control Panel JobCard Checker', breadcrumb: 'Control Panel JobCard Checker' }
  },
  {
    path: 'cnc-cp-maker',
    component: CncCpMakerComponent,
    data: { title: 'CNC CP Maker', breadcrumb: 'CNC CP Maker' }
  }
];
