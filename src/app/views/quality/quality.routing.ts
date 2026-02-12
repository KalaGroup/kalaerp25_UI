import { Routes } from '@angular/router';
import{DgStageICheckerComponent} from './dg-stage-i-checker/dg-stage-i-checker.component';
import{DgQualityMasterComponent} from './dg-quality-master/dg-quality-master.component';
import{QualityMasterCheckerComponent} from './quality-master-checker/quality-master-checker.component';
import { CalibrationMasterComponent } from './calibration-master/calibration-master.component';

export const QualityRoutes: Routes = [
    {
         path: 'dg-stage-i-checker',
         component: DgStageICheckerComponent,
         data: { title: 'Quality', breadcrumb: 'Quality' }
   },
   {
         path: 'dg-quality-master',
         component: DgQualityMasterComponent,
         data: { title: 'Quality', breadcrumb: 'Quality' }
   },
   {
         path: 'quality-master-checker',
         component: QualityMasterCheckerComponent,
         data: { title: 'Quality', breadcrumb: 'Quality' }
   },
    {
         path: 'calibration-master',
          component: CalibrationMasterComponent,
          data: { title: 'Quality', breadcrumb: 'Quality' }
    }
];
