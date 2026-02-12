import { TestBed } from '@angular/core/testing';
import { DgPackingSlipService } from './dg-packing-slip-service.service';

describe('DgStageIServiceService', () => {
  let service: DgPackingSlipService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DgPackingSlipService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
