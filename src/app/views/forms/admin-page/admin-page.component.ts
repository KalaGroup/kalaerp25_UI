import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Component({
    selector: 'app-admin-page',
    templateUrl: './admin-page.component.html',
    styleUrl: './admin-page.component.scss',
    standalone: false
})
export class AdminPageComponent {

  // employees = ['John Doe', 'Jane Smith', 'Emily Johnson'];
  // roles = ['Administrator', 'Manager', 'Staff'];
  // companies = ['Company A', 'Company B', 'Company C'];
  // profitCenters = ['ProfitCenter 1', 'ProfitCenter 2', 'ProfitCenter 3'];
  employees: string[] = [];
  roles: string[] = [];
  companies: string[] = [];
  profitCenters: string[] = [];

  selectedEmployee: any = null;
  selectedRoles: any[] = [];
  selectedCompanies: any[] = [];
  selectedProfitCenters: any[] = [];

  errorMessage: string = '';
  


  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // Call the backend APIs when the component initializes
    this.getEmployees();
    this.getRoles();
    this.getCompanies();
  }
 
   // Fetch employees from API
   getEmployees(): void {
    this.http.get<string[]>('https://localhost:5001/api/Admin/GetEmployee')  // Adjust URL as per your API
      .subscribe(
        data => {
          this.employees = data;
        },
        error => {
          console.error('Error fetching employees:', error);
        }
      );
  }

 
  // Fetch roles from API
  getRoles(): void {
    this.http.get<string[]>('https://localhost:5001/api/Admin/GetRoles')  // Adjust URL as per your API
      .subscribe(
        data => {
          this.roles = data;
        },
        error => {
          console.error('Error fetching roles:', error);
        }
      );
  }

  // Fetch companies from API
  getCompanies(): void {
    this.http.get<string[]>('https://localhost:5001/api/Admin/GetCompanyDetails')  // Adjust URL as per your API
      .subscribe(
        data => {
          this.companies = data;
        },
        error => {
          console.error('Error fetching companies:', error);
        }
      );
  }

   // Fetch profit centers based on selected companies
   fetchProfitCenters(): void {
    // Ensure at least one company is selected
    if (this.selectedCompanies.length > 0) {
      const selectedCompanyCodes = this.selectedCompanies.map(company => company.CCode); // Assuming each company has a 'code' property
      this.http.post<any[]>('https://localhost:5001/api/Admin/api/profitcenters/bycompanycode', selectedCompanyCodes)
        .subscribe(
          data => {
            this.profitCenters = data; // Update the profit centers based on the selected companies
            this.selectedProfitCenters = []; // Reset selected profit centers when companies change
          },
          error => {
            console.error('Error fetching profit centers:', error);
          }
        );
    } else {
      // Clear profit centers if no company is selected
      this.profitCenters = [];
      this.selectedProfitCenters = [];
    }
  }

  onEmployeeChange(): void {
    // Reset error message if employee is selected
    if (this.selectedEmployee) {
      this.errorMessage = ''; // Clear error message
    }
  }
  
  onRoleChange(): void {
    // Reset error message if at least one role is selected
    if (this.selectedRoles.length > 0) {
      this.errorMessage = ''; // Clear error message
    }
  }
  
  onCompanyChange(): void {
    // Reset error message if at least one company is selected
    if (this.selectedCompanies.length > 0) {
      this.errorMessage = ''; // Clear error message
    }
  }
  
  onProfitCenterChange(): void {
    // Reset error message if at least one profit center is selected
    if (this.selectedProfitCenters.length > 0) {
      this.errorMessage = ''; // Clear error message
    }
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.selectedEmployee) {
      this.errorMessage = 'Please select an employee.';
    } else if (this.selectedRoles.length === 0) {
      this.errorMessage = 'Please select at least one role.';
    } else if (this.selectedCompanies.length === 0) {
      this.errorMessage = 'Please select at least one company.';
    } else if (this.selectedProfitCenters.length === 0) {
      this.errorMessage = 'Please select at least one profit center.';
    } else {
    const payload = {
      EmpId: this.selectedEmployee.EmpId,
      RoleIds: this.selectedRoles.map(role => role.RoleId),
      CompanyIds: this.selectedCompanies.map(company => company.CID),
      ProfitCenterIds: this.selectedProfitCenters.map(pc => pc.PCID)
    };

    this.http.post('https://localhost:5001/api/Admin/InsertUserRoleInfo', payload)
      .subscribe(
        response => {
          console.log('Data successfully inserted:', response);
          this.errorMessage = 'User roles successfully assigned!';

            // Reset the dropdowns after successful assignment
            this.selectedEmployee = null;  // Reset employee selection
            this.selectedRoles = [];  // Reset role selection
            this.selectedCompanies = [];  // Reset company selection
            this.selectedProfitCenters = [];  // Reset profit center selection

            setTimeout(() => {
              this.errorMessage = '';  // Clear success message after delay
            }, 6000); // 6000 milliseconds = 6 seconds
        },
        error => {
          console.error('Error inserting user roles:', error);
          this.errorMessage = 'Failed to assign user roles. Please try again.';
        }
      );
    }
  }
}
 


