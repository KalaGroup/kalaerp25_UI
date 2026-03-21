import { Routes } from '@angular/router';
import { ScanInvoiceComponent } from './scan-invoice/scan-invoice.component';

export const AccountRoutes: Routes = [
  {
    path: 'scan-invoice',
    component: ScanInvoiceComponent,
    data: { title: 'Scan Invoice', breadcrumb: 'Scan Invoice' }
  }
];
