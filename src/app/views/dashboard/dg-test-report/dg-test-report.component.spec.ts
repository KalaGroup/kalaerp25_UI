import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DgTestReport } from './dg-test-report.component';

describe('DgTestReport', () => {
  let component: DgTestReport;
  let fixture: ComponentFixture<DgTestReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DgTestReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DgTestReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
