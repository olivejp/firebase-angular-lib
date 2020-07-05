import {Component, EventEmitter, Input, OnDestroy, Output} from '@angular/core';
import {from, Observable, of, zip} from 'rxjs';
import * as firebase from 'firebase';
import {concatMap, map} from 'rxjs/operators';
import {v4 as uuidv4} from 'uuid';
import Reference = firebase.storage.Reference;
import TaskState = firebase.storage.TaskState;
import DocumentReference = firebase.firestore.DocumentReference;
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {DocumentService} from './document.service';
import {Document, DocumentStatus} from './document.model';

export class DocumentManagementOptions {
  constructor(public firestoreLibName: string) {
  }
}

@Component({
  selector: 'lib-document-management',
  templateUrl: './document-management.component.html'
})
export class DocumentManagementComponent implements OnDestroy {

  // tslint:disable-next-line:variable-name
  private firestoreReference_: DocumentReference | undefined;
  // tslint:disable-next-line:variable-name
  private storageReference_: Reference | null;
  // tslint:disable-next-line:variable-name
  private options_: DocumentManagementOptions | null;
  documents: Document[] = [];
  loadingDocuments = true;

  /**
   * Emit a tuple
   * First value of the tuple can be 'ERROR', 'SUCCESS'
   * Second value is a string containing a message.
   */
  @Output() messages = new EventEmitter<[string, string]>();

  @Input()
  set options(options: DocumentManagementOptions | null) {
    this.options_ = options;
  }

  get options(): DocumentManagementOptions | null {
    return this.options_;
  }

  @Input()
  set firestoreReference(reference: DocumentReference | undefined) {
    this.firestoreReference_ = reference;
  }

  get firestoreReference(): DocumentReference | undefined {
    return this.firestoreReference_;
  }

  @Input()
  set storageReference(storageReference: Reference | null) {
    this.storageReference_ = storageReference;
    this.pullAllDocumentsFromStorage();
  }

  get storageReference(): Reference | null {
    return this.storageReference_;
  }

  constructor(private documentService: DocumentService) {
    this.storageReference_ = null;
    this.firestoreReference_ = undefined;
    this.options_ = null;
  }

  private static createMetadata(file: File): any {
    return {
      size: file.size,
      cacheControl: 'public,max-age=3600',
      customMetadata: {
        author: firebase.auth().currentUser.uid,
        realname: file.name
      }
    };
  }

  /**
   * On Destroying the component should close all subscriptions
   * and unsubscribe all progress watchers.
   */
  ngOnDestroy(): void {
    for (const document of this.documents) {
      if (document.subscription) {
        document.subscription.unsubscribe();
      }
      if (document.progressWatcherUnsubscribe) {
        document.progressWatcherUnsubscribe();
      }
    }
  }

  /**
   *  Récupération des documents depuis Storage directement
   */
  private pullAllDocumentsFromStorage(): void {
    if (!this.storageReference) {
      return;
    }
    this.documentService.getAllItemsInStorage(this.storageReference)
      .pipe(
        concatMap(r => zip(of(r.name), from(r.getDownloadURL()), from(r.getMetadata()))),
        map(value => new Document(value[0], value[1], '100', DocumentStatus.ALREADY, value[2])))
      .subscribe(
        document => this.documents.push(document),
        error => this.messages.emit(['ERROR', error]),
        () => this.loadingDocuments = false
      );
  }

  /**
   * Update the document status to PAUSED
   * and call the uploadTask.pause() method.
   */
  pauseUpload(document: Document): void {
    document.status = DocumentStatus.PAUSED;
    document.uploadTask.pause();
  }

  /**
   * Update the document status to UPLOADING
   * and call the uploadTask.resume() method.
   */
  resumeUpload(document: Document): void {
    document.status = DocumentStatus.UPLOADING;
    document.uploadTask.resume();
  }

  deleteDocument(document: Document): void {
    switch (document.status) {
      case DocumentStatus.TO_UPLOAD:
        this.deleteFromLocalArray(document);
        break;
      case DocumentStatus.UPLOADING:
      case DocumentStatus.PAUSED:
        if (document.uploadTask) {
          document.uploadTask.cancel();
          this.deleteFromLocalArray(document);
        }
        break;
      case DocumentStatus.ALREADY :
        if (!this.storageReference) {
          return;
        }
        this.storageReference.child(document.name).delete()
          .then(() => this.finishDeletingDocument(document))
          .catch(error => this.messages.emit(['ERROR', 'Suppression échouée : ' + error]));
        break;
    }
  }


  upload(document: Document): void {
    if (this.storageReference && document && document.file && document.status === DocumentStatus.TO_UPLOAD) {
      const ref: Reference = this.storageReference.child(document.name);
      document.uploadTask = ref.put(document.file, document.metadata);
      document.status = DocumentStatus.UPLOADING;
      document.subscription = this.watchProgress(document)
        .subscribe(tupleProgressAndDownloadUrl => {
            document.progress = String(tupleProgressAndDownloadUrl[0]);
            if (tupleProgressAndDownloadUrl[1]) {
              document.downloadUrl = tupleProgressAndDownloadUrl[1];

              const update = {};
              update[`photoUrls.${document.name}`] = document.downloadUrl;

              // Récupération de l'URL de download dans Firestore
              this.firestoreReference.update(update)
                .then(() => this.messages.emit(['SUCCESS', 'Firestore updated']))
                .catch(error => this.messages.emit(['ERROR', 'Firestore update failed : ' + error]));
            }
          },
          error => {
            this.messages.emit(['ERROR', error]);
            document.uploadTask = undefined;
            document.status = DocumentStatus.TO_UPLOAD;
            document.subscription.unsubscribe();
          },
          () => {
            document.uploadTask = undefined;
            document.status = DocumentStatus.ALREADY;
            document.subscription.unsubscribe();
          });
    } else {
      this.messages.emit(['ERROR', 'No file']);
    }
  }

  async addFile(file: File): Promise<void> {
    const documentUrl = await this.displayLocalImage(file);
    if (typeof documentUrl === 'string') {
      const uid = uuidv4();
      const photo = new Document(uid, documentUrl, '0', DocumentStatus.TO_UPLOAD, DocumentManagementComponent.createMetadata(file), file);
      this.documents.push(photo);
    }
  }

  trackIdentity(index: number, item: Document): any {
    return item.name;
  }

  reindex(): void {
    if (this.storageReference && this.firestoreReference && this.options && this.options.firestoreLibName) {
      // tslint:disable-next-line:max-line-length
      this.documentService.reindexStorageUrlIntoFirestoreReferenceRefacto(this.storageReference, this.firestoreReference, this.options.firestoreLibName)
        .subscribe(
          next => this.messages.emit(['SUCCESS', 'This items has been updated : ' + next]),
          error => this.messages.emit(['ERROR', 'Une erreur s\'est produite pendant la réindexation : ' + error]),
          () => this.messages.emit(['SUCCESS', 'Reindexation terminée.'])
        );
    }
  }

  private finishDeletingDocument(document: Document): void {
    if (this.firestoreReference && this.options && this.options.firestoreLibName) {
      this.documentService.deleteFromFirestore(this.firestoreReference, document.name, this.options.firestoreLibName)
        .subscribe(
          () => this.deleteFromLocalArray(document),
          error => this.messages.emit(['ERROR', error])
        );
    } else {
      this.deleteFromLocalArray(document);
    }
  }

  private deleteFromLocalArray(document: Document): void {
    if (this.documents) {
      const index = this.documents.indexOf(document);
      this.documents.splice(index, 1);
      this.messages.emit(['SUCCESS', 'Document correctement supprimée']);
    }
  }

  /**
   * Return a Observable.
   * First value returned is progress 0 -> 100 %
   * Second value is the download url of the document
   */
  private watchProgress(document: Document): Observable<[number, string | null]> {
    return new Observable(subscriber => {
      document.progressWatcherUnsubscribe = document.uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, (snapshot) => {
        const progress = snapshot.bytesTransferred / snapshot.totalBytes * 100;
        subscriber.next([progress, null]);
        if (document.progressWatcherUnsubscribe && ![TaskState.RUNNING, TaskState.PAUSED].includes(snapshot.state)) {
          document.progressWatcherUnsubscribe();
          document.progressWatcherUnsubscribe = undefined;
        }
      });
      document.uploadTask.then(snapshot => {
        if (snapshot.state === 'success') {
          document.uploadTask.snapshot.ref.getDownloadURL()
            .then(downloadUrl => {
              subscriber.next([100, downloadUrl]);
              subscriber.complete();
            })
            .catch(reason => subscriber.error(reason));
        } else {
          subscriber.error('Upload failed!');
        }
      }).catch(reason => subscriber.error(reason));
    });
  }

  /**
   * Get a local file in parameter, then read the file and provide a Promise
   * containing the URL source to display the file in a html <img> tag.
   */
  private displayLocalImage(file: File): Promise<string | ArrayBuffer | null> {
    return new Promise<string | ArrayBuffer | null>((resolve, reject) => {
      if (!file) {
        reject('No file');
      } else {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          resolve(reader.result);
        };
      }
    });
  }

  drop($event: CdkDragDrop<string[]>): void {
    const element = this.documents[$event.previousIndex];
    this.documents[$event.previousIndex] = this.documents[$event.currentIndex];
    this.documents[$event.currentIndex] = element;
  }
}
