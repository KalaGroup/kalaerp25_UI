import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { KalaService } from '../kala-service.service';

interface SiteVisit {
  id: number;
  siteName: string;
  siteAddress: string;
  serialNo: string;
  assDate: string;
  workDetails: string;
  lastWorkDt: string;
  kva: number;
  ph: number;
  model: string;
  panel: string;
  custName: string;
  contactPerson: string;
  contactNo: string;
  pcaCode?: string;
  problemCode?: string;
  problemSubCode?: string;
  ename?: string;
}

@Component({
    selector: 'app-service-site-visit',
    templateUrl: './service-site-visit.component.html',
    styleUrl: './service-site-visit.component.scss',
    standalone: false
})
export class ServiceSiteVisitComponent {
  searchSerialNo: string = '';
  siteVisits: SiteVisit[] = [];
  filteredSiteVisits: SiteVisit[] = [];
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  constructor(private router: Router, private kalaService: KalaService) {}

  // ngOnInit(): void {
  //   // const employeeCode = localStorage.getItem('employeeCode');
  //   // this.loadSiteVisits(employeeCode);
  //   // this.filteredSiteVisits = [...this.siteVisits];

  //   // const navigation = history.state;
  //   // if (navigation && navigation.refresh) {
  //   //   this.loadSiteVisits(employeeCode);
  //   // }
  //    const employeeCode = localStorage.getItem('employeeCode');
  //   const navigation = history.state;

  //   if (navigation && navigation.refresh) {
  //     // Submit was done — fetch fresh data
  //     this.kalaService.clearCache();
  //     this.loadSiteVisits(employeeCode);
  //   } else {
  //     // No changes — use cache if available
  //     const cached = this.kalaService.getCachedSiteVisits();
  //     if (cached) {
  //       this.siteVisits = this.mapApiResponseToSiteVisits(cached);
  //       this.filteredSiteVisits = [...this.siteVisits];
  //     } else {
  //       // First time load
  //       this.loadSiteVisits(employeeCode);
  //     }
  //   }
  // }

  ngOnInit(): void {
  const employeeCode = localStorage.getItem('employeeCode');
  const navigation = history.state;

  if (navigation && navigation.refresh) {
    this.kalaService.clearCache();
    this.loadSiteVisits(employeeCode);
  } else {
    const cached = this.kalaService.getCachedSiteVisits(employeeCode);
    if (cached) {
      this.siteVisits = this.mapApiResponseToSiteVisits(cached);
      this.filteredSiteVisits = [...this.siteVisits];
    } else {
      // Different user or first time — hit API
      this.kalaService.clearCache();
      this.loadSiteVisits(employeeCode);
    }
  }
}

  loadSiteVisits(employeeCode): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.kalaService.getKalaServiceData(employeeCode).subscribe({
      next: (response) => {
        this.kalaService.setCachedSiteVisits(response, employeeCode);
        this.siteVisits = this.mapApiResponseToSiteVisits(response);
        this.filteredSiteVisits = [...this.siteVisits];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading site visits:', error);
        this.errorMessage = 'Failed to load site visits. Please try again.';
        this.isLoading = false;
      },
    });
  }

  private mapApiResponseToSiteVisits(apiData: any[]): SiteVisit[] {
    return apiData.map((item, index) => ({
      id: index + 1,
      siteName: item.SiteName || '',
      siteAddress: item.SiteAddress || '',
      serialNo: item.SerialNo || '',
      assDate: item.AssDt || '',
      workDetails: item.BreakDownName || '',
      lastWorkDt: item.LastWork || null,
      kva: item.kVA || 0,
      ph: item.Phase ? parseInt(item.Phase) : null,
      model: item.Model || '',
      panel: item.Panel || '',
      custName: item.CCName || '',
      contactPerson: item.ContactPerson ? item.ContactPerson.trim() : '',
      contactNo: item.MobileNo || '',
      pcaCode: item.PCACode || '',
      problemCode: item.ProblemCode || '',
      problemSubCode: item.ProblemSubCode || '',
      ename: item.EmpName || '',
    }));
  }

  // onSearch(): void {
  //   if (!this.searchSerialNo.trim()) {
  //     this.filteredSiteVisits = [...this.siteVisits];
  //     return;
  //   }

  //   const searchTerm = this.searchSerialNo.toLowerCase().trim();
  //   this.filteredSiteVisits = this.siteVisits.filter(
  //     (visit) =>
  //       visit.serialNo.toLowerCase().includes(searchTerm) ||
  //       visit.siteName.toLowerCase().includes(searchTerm)
  //   );
  // }

  onSearch(): void {
    if (!this.searchSerialNo.trim()) {
      this.filteredSiteVisits = [...this.siteVisits];
      return;
    }

    const searchTerm = this.searchSerialNo.trim().toLowerCase();
    this.filteredSiteVisits = this.siteVisits.filter(
      (visit) =>
        (visit.serialNo || '').toString().trim().toLowerCase().includes(searchTerm) ||
        (visit.siteName || '').toString().trim().toLowerCase().includes(searchTerm)
    );
}

  onSearchInputChange(): void {
    this.onSearch();
  }

  clearSearch(): void {
    this.searchSerialNo = '';
    this.filteredSiteVisits = [...this.siteVisits];
  }

  goBack(): void {
    console.log('Navigate back');
    // Implement navigation logic
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
  }

  onCardClick(visit: SiteVisit): void {
    // Navigate to site visit details page with the visit data
    // Path: /kala-service/site-visit-details/:id
    this.router.navigate(['/kala-service/site-visit-details', visit.id], {
      state: { visit: visit },
    });
  }

  trackByVisitId(index: number, visit: SiteVisit): number {
    return visit.id;
  }
}
