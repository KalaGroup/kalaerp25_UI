import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DgStageIIIComponent } from './dg-stage-iii.component';

describe('DgStageIIIComponent', () => {
  let component: DgStageIIIComponent;
  let fixture: ComponentFixture<DgStageIIIComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DgStageIIIComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DgStageIIIComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
