import { TestBed } from '@angular/core/testing';

import { FirebaseAngularLibService } from './firebase-angular-lib.service';

describe('FirebaseAngularLibService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FirebaseAngularLibService = TestBed.get(FirebaseAngularLibService);
    expect(service).toBeTruthy();
  });
});
