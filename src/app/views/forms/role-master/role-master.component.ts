import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-role-master',
  //standalone: true,
  //imports: [],
  templateUrl: './role-master.component.html',
  styleUrl: './role-master.component.scss'
})
export class RoleMasterComponent {
  profitCenters: { id: number; value: string }[] = [];
  roles: { roleId: number; value: string }[] = [];
  selectedProfitCenter: string | undefined;
  selectedProfitCenterId: number | undefined;
  selectedRoleId: number | undefined;
  pagePermissions: { pageId: number; pageName: string; permission: boolean }[] = [];
  successMessage: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadDepartmentNames();
  }

  loadDepartmentNames() {
    this.http.get<any[]>('https://localhost:5001/api/Admin/GetProfitCentersDetails')
      .subscribe({
        next: (data) => {
          this.profitCenters = data.map(item => ({
            id: item.PCID,
            value: item.Pcname
          }));
          console.log('Loaded department names:', this.profitCenters);
        },
        error: (error) => {
          console.error('Error loading department names:', error);
        }
      });
  }


  onProfitCenterChange(value: string) {
    const selectedPc = this.profitCenters.find(pc => pc.value === value);
    this.selectedProfitCenterId = selectedPc ? selectedPc.id : undefined;
    if (this.selectedProfitCenterId) {
      this.loadRolesByProfitCenterId(this.selectedProfitCenterId);
    }
  }

  onRoleChange(value: string) {
    const selectedRole = this.roles.find(role => role.value === value);
    this.selectedRoleId = selectedRole ? selectedRole.roleId : undefined;

    if (this.selectedProfitCenterId && this.selectedRoleId) {
      this.loadPagePermissions(this.selectedProfitCenterId, this.selectedRoleId);
    }
  }

  // Helper function to get the role name by roleId
     getRoleNameById(roleId: number): string {
  const selectedRole = this.roles.find(role => role.roleId === roleId);
  return selectedRole ? selectedRole.value : '';
 }

  loadRolesByProfitCenterId(profitCenterId: number) {
    this.http.get<any[]>(`https://localhost:5001/api/Admin/GetRoleByMapProfitCenterId/${profitCenterId}`)
      .subscribe({
        next: (data) => {
          this.roles = data.map(item => ({
            roleId: item.RoleId,
            value: item.RoleName
          }));
          console.log('Loaded roles:', this.roles);
        },
        error: (error) => {
          console.error('Error fetching roles:', error);
        }
      });
  }

  loadPagePermissions(profitCenterId: number, roleId: number) {
    this.http.get<any[]>(`https://localhost:5001/api/Admin/GetPermittedPages/${profitCenterId}/${roleId}`)
      .subscribe({
        next: (data) => {
          this.pagePermissions = data.map(item => ({
            pageId: item.PageId,
            pageName: item.PageName,
            permission: item.PermissionStatus
          }));
        },
        error: (error) => {
          console.error('Error fetching page permissions:', error);
        }
      });
  }

  onSubmit() {
    const updates = this.pagePermissions.map(permission => ({
      pcId: this.selectedProfitCenterId,
      roleId: this.selectedRoleId,
      pageId: permission.pageId,
      permissionStatus: permission.permission
    }));
  
    this.http.post('https://localhost:5001/api/Admin/UpdatePagePermissions', updates)
    .subscribe({
      next: (response: any) => {
        if (response.message) {
          this.successMessage = response.message;
          setTimeout(() => {
            this.successMessage = null; // Clear message after 3 seconds
          }, 5000);
        }
      },
      error: (error) => {
        console.error('Error updating permissions:', error);
        alert(error.error?.message || 'An error occurred while updating permissions');
      }
    });
  
    console.log('Selected Permissions:', updates);
  }
  
}
