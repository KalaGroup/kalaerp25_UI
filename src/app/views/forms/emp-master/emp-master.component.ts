import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';

@Component({
    selector: 'app-emp-master',
    // standalone: true,
    // imports: [],
    templateUrl: './emp-master.component.html',
    styleUrl: './emp-master.component.scss',
    standalone: false
})
export class EmpMasterComponent {
  employeeForm: FormGroup;
  selectedFile: File | null = null;
  successMessage: string | null = null;
  isErrorMessage: boolean = false;

  // Dropdown options
  // ID mappings for each dropdown
  va = [{ id: 1, value: 'A' }, { id: 2, value: 'B' }, { id: 3, value: 'C' }, { id: 4, value: 'D' }];
  tempEmp = [{ id: 0, value: 'No' }, { id: 1, value: 'Yes' }];
  byOfferLetter = [{ id: 0, value: 'No' }, { id: 1, value: 'Yes' }];
  //companyNames = [{ id: 1, value: 'Kala Genset Pvt Ltd Unit - I' }, { id: 2, value: 'Company B' }, { id: 3, value: 'Company C' }];
  companyNames: { id: number; value: string }[] = [];
  gradeNames = [{ id: 1, value: 'Grade 1' }, { id: 2, value: 'Grade 2' }, { id: 3, value: 'Grade 3' }];
  //departmentNames = [{ id: 1, value: 'HR' }, { id: 2, value: 'IT' }, { id: 3, value: 'Finance' }, { id: 4, value: 'Operations' }];
  departmentNames: { id: number; value: string }[] = [];
  roleNames:{id : number; value : string }[] = [];
  employeeTypes = [{ id: 1, value: 'Kala Employee' }, { id: 2, value: 'Apprentice' }, { id: 3, value: 'None' }];
  designations = [{ id: 1, value: 'Software Engineer' }, { id: 2, value: 'Project Manager' }, { id: 3, value: 'Sales Executive' }, { id: 4, value: 'Human Resources Manager' }];
  workdesignations = [{ id: 1, value: 'Frontend Developer' }, { id: 2, value: 'Scrum Master' }, { id: 3, value: 'Regional Sales Coordinator' }, { id: 4, value: 'Talent Acquisition Specialist' }];
  contractors = [{ id: 1, value: 'A' }, { id: 2, value: 'B' }, { id: 3, value: 'C' }, { id: 4, value: 'D' }];


  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.employeeForm = this.fb.group({
      empCode: [''],
      sampleInput: [''], 
      temperoryEmployee: [''], 
      ByOfferLetter: [''], 
      workDesignation: [''], 
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: ['', Validators.required],
      contractorName: [''],
      joinDate: [''],
      companyName: [''],
      gradeName: [''],
      departmentName: [''],
      roleName:[''],
      isActive: [false],
      isOvertime: [false],
      employeeType: [''],
      designation: ['']
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        console.log('Invalid file type. Please upload a JPEG or PNG image.');
        return;
      }
      this.selectedFile = file;
      console.log('File selected:', file);
    }
  }

  ngOnInit(): void {
    this.loadCompanyNames();
  }

  loadCompanyNames() {
    this.http.get<any[]>('https://localhost:5001/api/Admin/GetCompanyDetails')
      .subscribe({
        next: (data) => {
          this.companyNames = data.map(item => ({
            id: item.CID,
            value: item.CName
          }));
          console.log('Loaded company names:', this.companyNames);
        },
        error: (error) => {
          console.error('Error loading company names:', error);
        }
      });
  }

  onCompanyChange() {
    const selectedCompanyId = this.getSelectedId('companyName', this.companyNames);
    this.loadDepartmentNames(selectedCompanyId);
  }

  loadDepartmentNames(selectedCompanyId: number) {
    this.http.get<any[]>(`https://localhost:5001/api/Admin/GetProfitCenterDetails/${selectedCompanyId}`)
      .subscribe({
        next: (data) => {
          this.departmentNames = data.map(item => ({
            id: item.PCID,
            value: item.Pcname
          }));
          console.log('Loaded department names:', this.departmentNames);
        },
        error: (error) => {
          console.error('Error loading department names:', error);
        }
      });
  }

  onDepartmentChange() {
    debugger
    const selectedDepartmentId = this.getSelectedId('departmentName', this.departmentNames);
    const selectedCompanyId = this.getSelectedId('companyName', this.companyNames); // Pass selectedCompanyId here
   this.loadRoleNames(selectedCompanyId, selectedDepartmentId);
  }  

  loadRoleNames(selectedCompanyId: number, selectedDepartmentId: number) {
    this.http.get<any[]>(`https://localhost:5001/api/Admin/GetRoleByMapCompanyIdAndProfitCenterId/${selectedCompanyId}/${selectedDepartmentId}`)
      .subscribe({
        next: (data) => {
          this.roleNames = data.map(item => ({
            id: item.RoleId,
            value: item.RoleName
          }));
          console.log('Loaded Role names based on department:', this.roleNames);
        },
        error: (error) => {
          console.error('Error loading role names based on department:', error);
        }
      });
  }

    
  
  onSubmit() {
    if (this.employeeForm.valid) {
      const formData = new FormData();

      const joinDate = this.employeeForm.get('joinDate')?.value 
      ? new Date(this.employeeForm.get('joinDate')?.value).toISOString().split('T')[0]
      : null;

      // Get selected dropdown values and map to their corresponding IDs
      const selectedTempEmp = this.getSelectedId('temperoryEmployee', this.tempEmp) === 1;
      const selectedByOfferLetter = this.getSelectedId('ByOfferLetter', this.byOfferLetter) === 1;
      const selectedWorkDesignation = this.getSelectedId('workDesignation', this.workdesignations);
      const selectedCompanyName = this.getSelectedId('companyName', this.companyNames);
      const selectedGradeName = this.getSelectedId('gradeName', this.gradeNames);
      const selectedDepartmentName = this.getSelectedId('departmentName', this.departmentNames);
      const selectedEmployeeType = this.getSelectedId('employeeType', this.employeeTypes);
      const selectedDesignation = this.getSelectedId('designation', this.designations);

      // Prepare payload from form fields and selected dropdown values
      const payload = {
        TempEmp: selectedTempEmp,
        ByOfferLetter: selectedByOfferLetter,
        WorkDesignation: selectedWorkDesignation,
        FirstName: this.employeeForm.get('firstName')?.value,
        MiddleName: this.employeeForm.get('middleName')?.value,
        LastName: this.employeeForm.get('lastName')?.value,
        Contractor: this.employeeForm.get('contractorName')?.value,
        JoinDate: joinDate,
        CCode: selectedCompanyName,
        GradeID: selectedGradeName,
        PCCode: selectedDepartmentName,
        Active: this.employeeForm.get('isActive')?.value,
        IsOvertime: this.employeeForm.get('isOvertime')?.value,
        EmployeeType: selectedEmployeeType,
        DesignationID: selectedDesignation
      };

      // Append payload fields to formData
       console.log('Payload before appending to FormData:', payload);
      Object.keys(payload).forEach(key => {
      if (payload[key] !== null && payload[key] !== undefined) {
     formData.append(key, payload[key].toString());
     }
   });

       if (this.selectedFile) {
       formData.append('PhotoCopy', this.selectedFile);
       }

          // Debug FormData contents
            formData.forEach((value, key) => {
            console.log(`${key}: ${value}`);
           });


      // Send POST request
      this.http.post('https://localhost:5001/api/Admin/add-employee', formData)
        .subscribe({
          next: (response) => {
            console.log('Employee added successfully:', response);
            this.showSuccessMessage('Employee Added Successfully..!');
          },
          error: (error) => {
            console.error('Error adding employee:', error);
            this.showSuccessMessage('Error Adding Employee.', true);
          }
        });
    } else {
      console.log('Form is invalid');
      this.showSuccessMessage('Form is Invalid.', true);
    }
  }

  showSuccessMessage(message: string, isError: boolean = false): void {
    this.successMessage = message;
    this.isErrorMessage = isError;
  
    // Auto-hide the message after 5-6 seconds
    setTimeout(() => {
      this.successMessage = '';
    }, 6000);
  }
  
  onReset() {
    this.employeeForm.reset();
  }

  // Helper function to get the ID of the selected value
  getSelectedId(formControlName: string, options: any[]) {
    const selectedValue = this.employeeForm.get(formControlName)?.value;
    const selectedOption = options.find(option => option.value === selectedValue);
    return selectedOption ? selectedOption.id : null;
  }
}
