import { TestBed } from '@angular/core/testing';

import { JobcardService } from './jobcard.service';

describe('JobcardService', () => {
  let service: JobcardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JobcardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
