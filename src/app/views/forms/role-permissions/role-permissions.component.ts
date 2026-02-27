import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from 'app/shared/models/api-response';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-role-permissions',
    //standalone: true,
    //imports: [],
    templateUrl: './role-permissions.component.html',
    styleUrl: './role-permissions.component.scss',
    standalone: false
})
export class RolePermissionsComponent {
   selectedRole: string = '';
   selectedProfitcenter: number;
   //roles: any[] = []; // Roles fetched from API
   profitcenters: any[] = [];// for dropdown bind
   profitCenter: any[] = [];
   // Define columns to display in the table
   displayedColumns: string[] = ['pageName', 'add', 'edit', 'delete', 'auth', 'export'];

   constructor(private http: HttpClient,private snackBar: MatSnackBar) {}

   ngOnInit(): void {
    // Fetch Profitcenters dynamically from the API
    this.http.get<any[]>('https://localhost:5001/api/Admin/GetProfitCenterDetails').subscribe(
      (data) => {
        this.profitcenters = data; // Assign the response data to roles
        console.log('ProfitCenters fetched successfully:', this.profitcenters);
      },
      (error) => {
        console.error('Error fetching roles:', error);
      }
    ); 
  }

  onProfitCenterChange(profitCenterId: string): void {
    console.log('Selected Profitcenter ID:', profitCenterId);
    this.http.get<any[]>(`https://localhost:5001/api/Admin/UserRights/${profitCenterId}`)
    .subscribe(
      (response) => {
        console.log('Fetched ProfitCenter Details:', response);
        this.profitCenter = response; // Bind the fetched data to profitCenter
        console.log('ProfitCenter Data:', this.profitCenter);
      },
      (error) => {
        console.error('Error fetching role details:', error);
      }
    );
  }

  onSubmit(): void {
    // Log selected role and menu data
   // console.log('Selected Role:', this.selectedRole);
    console.log('Selected Profitcenter',this.selectedProfitcenter);
    console.log('ProfitCenter Data:', this.profitCenter);
    // Check if the menu data is empty
    if (this.profitCenter && this.profitCenter.length > 0) {
        // Create an object to send with the POST/PUT request
        const payload = this.profitCenter.map(item => ({
          Pcid: this.selectedProfitcenter,  
            PageId: item.PageId,        
            Add: item.Add,              
            Edit: item.Edit,            
            Delete: item.Delete,        
            Auth: item.Auth,            
            Export: item.Export         
        }));
        console.log('payload Data:', payload);
        // Call your API service to send the data to the server
        this.http.put<ApiResponse>('https://localhost:5001/api/Admin/SaveUserRights', payload)
            .subscribe(
                (response) => {
                  this.snackBar.open(response.message, 'Close', {
                    duration: 10000,  // Message will auto-close after 10 seconds
                   // panelClass: ['snackbar-success'] // Optional: Add custom styling
                  });
                },
                (error) => {
                    console.error('Error saving data:', error);
                    this.snackBar.open('Failed to save role permissions. Please try again.', 'Close', {
                      duration: 10000,
                     // panelClass: ['snackbar-error'] // Optional: Add custom styling
                    });
                }
            );
    } else {
        console.error('Page data is empty!');
        this.snackBar.open('Page data is empty. Please fill the required fields.', 'Close', {
          duration: 10000,
         // panelClass: ['snackbar-warning']
        });
    }
 }

}
