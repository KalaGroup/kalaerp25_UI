import { Routes } from '@angular/router';
import { DgStageIComponent } from './dg-stage-i/dg-stage-i.component';
import { DgStageIIComponent } from './dg-stage-ii/dg-stage-ii.component';
import { DgStageIIIComponent } from './dg-stage-iii/dg-stage-iii.component';
import { DgTestReport } from './dg-test-report/dg-test-report.component';
import { DgPackingSlip } from './dg-packing-slip/dg-packing-slip.component';
import {DgVideoUploadComponent} from'./dg-video-upload/dg-video-upload.component';
import { UserRoleGuard } from 'app/shared/guards/user-role.guard';
import { config } from 'config';
import { title } from 'process';

export const DashboardRoutes: Routes = [
  {
    path: 'dg-stage-I',
    component: DgStageIComponent,
    data: { title: 'DG Stage-I', breadcrumb: 'DG Stage-I'}
  },
  {
    path: 'dg-stage-II',
    component: DgStageIIComponent,
    data: { title: 'DG Stage-II', breadcrumb: 'DG Stage-II' }
  },
  {
    path: 'dg-stage-III',
    component: DgStageIIIComponent,
    data: { title: 'DG Stage-III', breadcrumb: 'DG Stage-III' }
  },
  {
    path:'dg-test-report',
    component: DgTestReport,
    data: {title: 'DG Test Report', breadcrumb: 'DG Test Report'}
  },
  {
    path:'dg-packing-slip',
    component: DgPackingSlip,
    data:{title: 'DG Packing Slip', breadcrumb: 'DG Packing Slip'}
  },
   {
    path:'dg-video-upload',
    component: DgVideoUploadComponent,
    data:{title: 'DG Video Uplaod', breadcrumb: 'DG Video Uplaod'}
  },
 ];
