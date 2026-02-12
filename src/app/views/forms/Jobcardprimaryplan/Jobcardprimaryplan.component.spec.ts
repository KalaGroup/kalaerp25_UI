import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobcardPrimaryPlanComponent } from './Jobcardprimaryplan.component';

describe('RoleMasterComponent', () => {
  let component: JobcardPrimaryPlanComponent;
  let fixture: ComponentFixture<JobcardPrimaryPlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobcardPrimaryPlanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JobcardPrimaryPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
