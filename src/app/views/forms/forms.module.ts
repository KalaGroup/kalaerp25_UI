import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTabsModule as MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule as MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule as MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule as MatRadioModule } from '@angular/material/radio';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { QuillModule } from 'ngx-quill';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';

import { BasicFormComponent } from './basic-form/basic-form.component';
import { RichTextEditorComponent } from './rich-text-editor/rich-text-editor.component';

import { FormsRoutes } from './forms.routing';
import { WizardComponent } from './wizard/wizard.component';
import { RolePermissionsComponent } from './role-permissions/role-permissions.component';
import { AdminPageComponent } from './admin-page/admin-page.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { EmpMasterComponent } from './emp-master/emp-master.component';
import { RoleMasterComponent } from './role-master/role-master.component';
import { JobcardPrimaryPlanComponent } from './Jobcardprimaryplan/Jobcardprimaryplan.component';
import { JobcardWithCPPlanComponent } from './Jobcardwithcpplan/Jobcardwithcpplan.component';
import { ZXingScannerModule } from '@zxing/ngx-scanner';

//import { DgStageIComponent } from '../dashboard/dg-stage-i/dg-stage-i.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatListModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatRadioModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatExpansionModule,
    ZXingScannerModule,
    MatTooltipModule,
    QuillModule.forRoot(),
    RouterModule.forChild(FormsRoutes),
  ],
  declarations: [RichTextEditorComponent, WizardComponent, BasicFormComponent,RolePermissionsComponent,AdminPageComponent,EmpMasterComponent,RoleMasterComponent,JobcardPrimaryPlanComponent,JobcardWithCPPlanComponent],
})
export class AppFormsModule {}
