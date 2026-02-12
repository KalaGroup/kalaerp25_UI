import { TestBed } from '@angular/core/testing';
import { DgStageIIService } from './dg-stage-ii-service.service';

describe('DgStageIServiceService', () => {
  let service: DgStageIIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DgStageIIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
