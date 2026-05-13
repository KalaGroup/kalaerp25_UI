import { Routes } from '@angular/router';
import { MtfScanComponent } from './mtf-scan/mtf-scan.component';
import { MtfWipInternalComponent } from './mtf-wip-internal/mtf-wip-internal.component';

export const LogisticRoutes: Routes = [
   {
      path: 'mtf-scan',
      component: MtfScanComponent,
      data: { title: 'MTF Scan', breadcrumb: 'MTF Scan' }
    },
    {
      path: 'mtf-wip-internal',
      component: MtfWipInternalComponent,
      data: { title: 'MTF WIP Internal', breadcrumb: 'MTF WIP Internal' }
    }
];
