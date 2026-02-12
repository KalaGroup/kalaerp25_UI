import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { KalaServiceRoutes } from './kala-service.routing';
import { MatSelectModule } from '@angular/material/select';
import { ServiceSiteVisitComponent } from './service-site-visit/service-site-visit.component';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { MatToolbar } from "@angular/material/toolbar";
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatCheckbox } from "@angular/material/checkbox";
import { SiteVisitDetailsComponent } from './site-visit-details/site-visit-details.component';

@NgModule({
  declarations: [
    ServiceSiteVisitComponent,
    SiteVisitDetailsComponent
  ],
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
    MatFormFieldModule,
    MatSelectModule,
    ZXingScannerModule,
    MatToolbar,
    MatProgressSpinner,
    RouterModule.forChild(KalaServiceRoutes),
    MatCheckbox
]
})
export class KalaServiceModule { }
