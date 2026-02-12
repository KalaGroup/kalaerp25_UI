import { TestBed } from '@angular/core/testing';
import { DgStageIService } from './dg-stage-i-service.service';

describe('DgStageIServiceService', () => {
  let service: DgStageIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DgStageIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
