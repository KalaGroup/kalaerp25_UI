import { Routes } from '@angular/router';
import { DgStageIComponent } from './dg-stage-i/dg-stage-i.component';
import { DgStageIIComponent } from './dg-stage-ii/dg-stage-ii.component';
import { DgStageIIIComponent } from './dg-stage-iii/dg-stage-iii.component';
import { DgTestReport } from './dg-test-report/dg-test-report.component';
import { DgPackingSlip } from './dg-packing-slip/dg-packing-slip.component';
import { DgVideoUploadComponent } from './dg-video-upload/dg-video-upload.component';
import { Jobcard1Component } from './jobcard1/jobcard1.component';
import { Jobcard1CheckerComponent } from './jobcard1-checker/jobcard1-checker.component';
import { UserRoleGuard } from 'app/shared/guards/user-role.guard';
// import { config } from 'config';
import { title } from 'process';
import { Jobcard2Component } from './jobcard2/jobcard2.component';
import { DgReverseProcessComponent } from './dg-reverse-process/dg-reverse-process.component';
import { EngAltCertificateComponent } from './eng-alt-certificate/eng-alt-certificate.component';
import { DgMachineWiseDownTimeComponent } from './dg-machine-wise-down-time/dg-machine-wise-down-time.component'; //nik
import { DgManpowerStatusComponent } from './dg-manpower-status/dg-manpower-status.component'; //nik
import { DgMaterialStatusComponent } from './dg-material-status/dg-material-status.component'; //nik
import { JobcardMttrReportComponent } from './jobcard-mttr_report/jobcard-mttr_report.component';

export const DashboardRoutes: Routes = [
  {
    path: 'dg-stage-I',
    component: DgStageIComponent,
    data: { title: 'DG Stage-I', breadcrumb: 'DG Stage-I' }
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
    path: 'dg-test-report',
    component: DgTestReport,
    data: { title: 'DG Test Report', breadcrumb: 'DG Test Report' }
  },
  {
    path: 'dg-packing-slip',
    component: DgPackingSlip,
    data: { title: 'DG Packing Slip', breadcrumb: 'DG Packing Slip' }
  },
  {
    path: 'dg-video-upload',
    component: DgVideoUploadComponent,
    data: { title: 'DG Video Uplaod', breadcrumb: 'DG Video Uplaod' }
  },
  {
    path: 'jobcard1',
    component: Jobcard1Component,
    data: { title: 'Job Card 1', breadcrumb: 'Job Card 1' },
  },
  {
    path: 'jobcard1-checker',
    component: Jobcard1CheckerComponent,
    data: { title: 'Jobcard Checker', breadcrumb: 'Jobcard Checker' },
  },
  {
    path: 'jobcard2',
    component: Jobcard2Component,
    data: { title: 'Job Card 2', breadcrumb: 'Job Card 2' }
  },
  {
    path: 'dg-reverse-process',
    component: DgReverseProcessComponent,
    data: { title: 'DG Reverse Process', breadcrumb: 'DG Reverse Process' }
  },
  {
    path: 'eng-alt-certificate',
    component: EngAltCertificateComponent,
    data: { title: 'Engine Alternator Certificate', breadcrumb: 'Engine Alternator Certificate' }
  },
  //nik
  {
    path: 'dg-machine-wise-down-time',
    component: DgMachineWiseDownTimeComponent,
    data: { title: 'Machine Wise Down Time', breadcrumb: 'Machine Wise Down Time' }
  },
  {
    path: 'dg-manpower-status',
    component: DgManpowerStatusComponent,
    data: { title: 'Manpower Status (Unit-1)', breadcrumb: 'Manpower Status (Unit-1)' }
  },
  {
    path: 'dg-material-status',
    component: DgMaterialStatusComponent,
    data: { title: 'Material Entry', breadcrumb: 'Material Entry' }
  },
  {
    path: 'jobcard-mttr-report',
    component: JobcardMttrReportComponent,
    data: { title: 'Jobcard MTTR Report', breadcrumb: 'Jobcard MTTR Report' }
  },
];
