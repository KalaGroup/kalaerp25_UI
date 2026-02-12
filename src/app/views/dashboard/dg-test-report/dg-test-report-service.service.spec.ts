import { TestBed } from '@angular/core/testing';
import { DgTestReportService } from './dg-test-report-service.service';

describe('DgStageIServiceService', () => {
  let service: DgTestReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DgTestReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
