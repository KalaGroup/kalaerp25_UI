import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'
import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule as MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule as MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule as MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule as MatTableModule } from '@angular/material/table';
import { MatTabsModule as MatTabsModule } from '@angular/material/tabs';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { NgChartsModule } from 'ng2-charts';
import { NgxEchartsModule } from 'ngx-echarts';
import * as echarts from 'echarts';
import { NgApexchartsModule } from 'ng-apexcharts';
import { SharedPipesModule } from '../../shared/pipes/shared-pipes.module';
import { MatFormFieldModule } from '@angular/material/form-field';

import { DashboardRoutes } from './dashboard.routing';
import { DgStageIComponent } from './dg-stage-i/dg-stage-i.component';
import { DgStageIIComponent } from './dg-stage-ii/dg-stage-ii.component';
import { DgStageIIIComponent } from './dg-stage-iii/dg-stage-iii.component';
import { DgTestReport } from './dg-test-report/dg-test-report.component';
import { DgPackingSlip } from './dg-packing-slip/dg-packing-slip.component';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { MatRadioModule } from '@angular/material/radio';
import { from } from 'rxjs';
import { DgVideoUploadComponent } from './dg-video-upload/dg-video-upload.component';


@NgModule({
  imports: [
    CommonModule,
    MatInputModule,
    FormsModule,
    MatIconModule,
    MatCardModule,
    MatMenuModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatRadioModule,
    MatButtonModule,
    MatChipsModule,
    MatListModule,
    MatTabsModule,
    MatTableModule,
    MatGridListModule,
    MatFormFieldModule,
    NgChartsModule,
    NgxEchartsModule.forRoot({
      echarts
    }),
    NgApexchartsModule,
    SharedPipesModule,
    RouterModule.forChild(DashboardRoutes),
    ZXingScannerModule,
  ],
  declarations: [
    DgStageIComponent,
    DgStageIIComponent,
    DgStageIIIComponent,
    DgTestReport,
    DgPackingSlip,
    DgVideoUploadComponent,
  ],

})
export class DashboardModule {

}
