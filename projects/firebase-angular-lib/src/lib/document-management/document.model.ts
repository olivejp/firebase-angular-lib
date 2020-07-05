import {Subscription} from 'rxjs';
import UploadTask = firebase.storage.UploadTask;

export enum DocumentStatus {
  TO_UPLOAD = 'TO_UPLOAD',
  UPLOADING = 'UPLOADING',
  ALREADY = 'ALREADY',
  PAUSED = 'PAUSED'
}

export class Document {
  constructor(public name: string,
              public downloadUrl: string,
              public progress: string,
              public status: DocumentStatus,
              public metadata?: any,
              public file?: File,
              public uploadTask?: UploadTask,
              public subscription?: Subscription,
              // tslint:disable-next-line:ban-types
              public progressWatcherUnsubscribe?: Function,
  ) {
  }
}
