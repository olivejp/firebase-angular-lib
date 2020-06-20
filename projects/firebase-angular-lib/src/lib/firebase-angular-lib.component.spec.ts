import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FirebaseAngularLibComponent } from './firebase-angular-lib.component';

describe('FirebaseAngularLibComponent', () => {
  let component: FirebaseAngularLibComponent;
  let fixture: ComponentFixture<FirebaseAngularLibComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FirebaseAngularLibComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FirebaseAngularLibComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
