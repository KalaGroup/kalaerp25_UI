import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobcardWithCPPlanComponent } from './Jobcardwithcpplan.component';

describe('RoleMasterComponent', () => {
  let component: JobcardWithCPPlanComponent;
  let fixture: ComponentFixture<JobcardWithCPPlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobcardWithCPPlanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JobcardWithCPPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
