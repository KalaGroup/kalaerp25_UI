import { Routes } from '@angular/router';

import { BasicFormComponent } from './basic-form/basic-form.component';
import { RichTextEditorComponent } from './rich-text-editor/rich-text-editor.component';
import { WizardComponent } from './wizard/wizard.component';
import { RolePermissionsComponent } from './role-permissions/role-permissions.component';
import { AdminPageComponent } from './admin-page/admin-page.component';
import { EmpMasterComponent } from './emp-master/emp-master.component';
import { title } from 'process';
import { RoleMasterComponent } from './role-master/role-master.component';
import { JobcardPrimaryPlanComponent } from './Jobcardprimaryplan/Jobcardprimaryplan.component';
import { JobcardWithCPPlanComponent } from './Jobcardwithcpplan/Jobcardwithcpplan.component';
import { DgStageIComponent } from '../dashboard/dg-stage-i/dg-stage-i.component';

export const FormsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'basic',
        component: BasicFormComponent,
        data: { title: 'Basic', breadcrumb: 'BASIC' }
      },
      {
        path: 'editor',
        component: RichTextEditorComponent,
        data: { title: 'Editor', breadcrumb: 'EDITOR' }
      }, {
        path: 'wizard',
        component: WizardComponent,
        data: { title: 'Wizard', breadcrumb: 'WIZARD' }
      },{ 
        path:'manage-permissions',
        component: RolePermissionsComponent,
        data:{title:'Manage-Permissions', breadcrumb:'PC-Permissions'}
      },{
        path:'admin-page',
        component:AdminPageComponent,
        data:{title:'Admin-Page', breadcrumb:'Admin-Page'}
      },{
        path:'emp-master',
        component:EmpMasterComponent,
        data:{title:'Emp-Master', breadcrumb:'Emp-Master'}
      },
      {
        path:'role-master',
        component:RoleMasterComponent,
        data:{title:'Role-Matser', breadcrumb:'Role-Master'}
      },
      {
       path:'dg-stage-i',
       component:DgStageIComponent,
       data:{title:'DG-Stage-I', breadcrumb:'DG-Stage-I'}
      },
      {
       path:'Jobcardprimaryplan',
       component:JobcardPrimaryPlanComponent,
       data:{title:'Jobcard(Primary-Plan)', breadcrumb:'Jobcard(Primary-Plan)'}
      },
      {
       path:'Jobcardwithcpplan',
       component:JobcardWithCPPlanComponent,
       data:{title:'Jobcard(With-CP-Plan)', breadcrumb:'Jobcard(With-CP-Plan)'}
      }
    ]
  }
];