import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DgPackingSlip } from './dg-packing-slip.component';

describe('DgTestReport', () => {
  let component: DgPackingSlip;
  let fixture: ComponentFixture<DgPackingSlip>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DgPackingSlip]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DgPackingSlip);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
