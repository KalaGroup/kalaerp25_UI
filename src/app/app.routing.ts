
import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './shared/components/layouts/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from './shared/components/layouts/auth-layout/auth-layout.component';
import { AuthGuard } from './shared/guards/auth.guard';

export const rootRouterConfig: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadChildren: () => import('./views/home/home.module').then(m => m.HomeModule),
    data: { title: 'KalaGen' }
  },
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'sessions',
        loadChildren: () => import('./views/sessions/sessions.module').then(m => m.SessionsModule),
        data: { title: 'Session'}
      }
    ]
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./views/dashboard/dashboard.module').then(m => m.DashboardModule),
        data: { title: 'Dashboard', breadcrumb: 'DASHBOARD'}
      },
      {
         path: 'marketing',
         loadChildren: () => import('./views/marketing/marketing.module').then(m => m.PpcMarketingModule),
         data: { title: 'Marketing', breadcrumb: 'MARKETING'}
      },
      {
        path: 'logistic',
        loadChildren: () => import('./views/logistic/logistic.module').then(m => m.LogisticModule),
        data: { title: 'Logistic', breadcrumb: 'LOGISTIC'}
      },
      {
        path: 'kala-service',
        loadChildren: () => import('./views/kala-service/kala-service.module').then(m => m.KalaServiceModule),
        data: { title: 'Kala Service', breadcrumb: 'KALA SERVICE'}
      },
      {
        path: 'quality',
        loadChildren: () => import('./views/quality/quality.module').then(m => m.QualityModule),
        data: { title: 'Quality', breadcrumb: 'QUALITY'}
      },
      {
        path: 'forms',
        loadChildren: () => import('./views/forms/forms.module').then(m => m.AppFormsModule),
        data: { title: 'Forms', breadcrumb: 'FORMS'}
      },
    ]
  },
  {
    path: '**',
    redirectTo: 'sessions/404'
  }
];

