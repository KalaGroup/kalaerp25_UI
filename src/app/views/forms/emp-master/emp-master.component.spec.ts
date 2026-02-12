import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpMasterComponent } from './emp-master.component';

describe('EmpMasterComponent', () => {
  let component: EmpMasterComponent;
  let fixture: ComponentFixture<EmpMasterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpMasterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpMasterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
