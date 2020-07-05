import {from, Observable, of, zip} from 'rxjs';
import {concatMap, map} from 'rxjs/operators';
import * as firebase from 'firebase';
import {Injectable} from '@angular/core';
import Reference = firebase.storage.Reference;
import DocumentReference = firebase.firestore.DocumentReference;

@Injectable({providedIn: 'root'})
export class DocumentService {
  /**
   * Get the real name of a file.
   * If the file is named bonjour.png, the function returns bonjour.
   */
  private static getRealName(name: string): string {
    let realName = name;
    const indexOfPoint = name.indexOf('.');
    if (indexOfPoint && indexOfPoint > -1) {
      realName = name ? name.substr(0, indexOfPoint) : '';
    }
    return realName;
  }

  // tslint:disable-next-line:max-line-length
  public reindexStorageUrlIntoFirestoreReferenceRefacto(storageReference: Reference, firestoreReference: DocumentReference, listUrlName: string): Observable<void> {
    return from(firestoreReference.update(listUrlName, []))
      .pipe(
        concatMap(() => this.getAllItemsInStorage(storageReference)),
        concatMap(item => zip(of(item.name), from(item.getDownloadURL()))),
        map(values => {
          const update = {};
          update[`${listUrlName}.${DocumentService.getRealName(values[0])}`] = values[1];
          return update;
        }),
        concatMap(update => from(firestoreReference.update(update)))
      );
  }

  public getAllItemsInStorage(storageReference: Reference): Observable<Reference> {
    return from(storageReference.listAll())
      .pipe(concatMap(listResult => from(listResult.items)));
  }

  public deleteFromFirestore(firestoreReference: DocumentReference, documentName: string, listUrlName: string): Observable<boolean> {
    return new Observable<boolean>(subscriber => {
      const update = {};
      update[`${listUrlName}.${DocumentService.getRealName(documentName)}`] = firebase.firestore.FieldValue.delete();
      firestoreReference.update(update)
        .then(() => {
          subscriber.next(true);
          subscriber.complete();
        })
        .catch(error => subscriber.error(error));
    });
  }
}
