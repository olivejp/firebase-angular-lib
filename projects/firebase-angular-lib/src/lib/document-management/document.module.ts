import {NgModule} from '@angular/core';
import {ngfModule} from 'angular-file';
import {ProgressBarModule} from 'angular-progress-bar';
import {FileSizePipe} from './filesize.pipe';
import {DocumentManagementComponent} from './document-management.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';

@NgModule({
  imports: [ngfModule, ProgressBarModule, DragDropModule, CommonModule, FontAwesomeModule],
  declarations: [DocumentManagementComponent, FileSizePipe],
  exports: [
    DocumentManagementComponent
  ]
})
export class DocumentModule {
}
