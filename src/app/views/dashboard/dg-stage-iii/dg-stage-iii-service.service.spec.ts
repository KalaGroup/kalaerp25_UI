import { TestBed } from '@angular/core/testing';
import { DgStageIIIService } from './dg-stage-iii-service.service';

describe('DgStageIServiceService', () => {
  let service: DgStageIIIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DgStageIIIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
