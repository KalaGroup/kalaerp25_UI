import { Routes } from '@angular/router';
import { MtfScanComponent } from './mtf-scan/mtf-scan.component';

export const LogisticRoutes: Routes = [
   {
      path: 'mtf-scan',
      component: MtfScanComponent,
      data: { title: 'MTF Scan', breadcrumb: 'MTF Scan' }
    }
];
