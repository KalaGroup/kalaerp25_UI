import { Routes } from '@angular/router';
import { ServiceSiteVisitComponent } from './service-site-visit/service-site-visit.component';
import { SiteVisitDetailsComponent } from './site-visit-details/site-visit-details.component';

export const KalaServiceRoutes: Routes = [
   {
      path: 'service-site-visit',
      component: ServiceSiteVisitComponent,
      data: { title: 'Service Site Visit', breadcrumb: 'Service site visit' }
    },
    {
    path: 'site-visit-details/:id',
    component: SiteVisitDetailsComponent,
    data: { title: 'Site Visit Details', breadcrumb: 'Site visit details' }
  }
];
