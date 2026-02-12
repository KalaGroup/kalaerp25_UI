import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DgStageIIComponent } from './dg-stage-ii.component';

describe('DgStageIIComponent', () => {
  let component: DgStageIIComponent;
  let fixture: ComponentFixture<DgStageIIComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DgStageIIComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DgStageIIComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
