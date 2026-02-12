import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DgStageIComponent } from './dg-stage-i.component';

describe('DgStageIComponent', () => {
  let component: DgStageIComponent;
  let fixture: ComponentFixture<DgStageIComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DgStageIComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DgStageIComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
