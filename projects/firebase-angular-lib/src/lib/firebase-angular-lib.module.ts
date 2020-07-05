import {NgModule} from '@angular/core';
import {FirebaseAngularLibComponent} from './firebase-angular-lib.component';
import {DocumentModule} from './document-management/document.module';
import {DocumentManagementComponent} from './document-management/document-management.component';
import {DocumentService} from './document-management/document.service';
import {FaIconLibrary} from '@fortawesome/angular-fontawesome';
import {fontAwesomeIcons} from './icons/font-awesome-icons';

@NgModule({
  imports: [DocumentModule],
  declarations: [FirebaseAngularLibComponent],
  exports: [FirebaseAngularLibComponent, DocumentManagementComponent],
  providers: [DocumentService]
})
export class FirebaseAngularLibModule {
  constructor(iconLibrary: FaIconLibrary) {
    iconLibrary.addIcons(...fontAwesomeIcons);
  }
}
