import * as firebase from 'firebase';

import {plainToClass} from 'class-transformer';
import {Observable} from 'rxjs';
import {ClassType} from 'class-transformer/ClassTransformer';
import {FirebaseModel} from './firebase.model';
import DocumentReference = firebase.firestore.DocumentReference;
import CollectionReference = firebase.firestore.CollectionReference;

export abstract class FirebaseService<T extends FirebaseModel> {
  protected classType: ClassType<T>;
  protected myInstance: T;

  protected constructor(type: ClassType<T>) {
    this.classType = type;
    this.myInstance = new type();
  }

  create(model: T, docPath?: string): Promise<void> {
    const collectionRef = firebase.firestore().collection(model.getCollectionName());

    let docReference: DocumentReference;
    if (docPath && docPath.length > 0) {
      docReference = collectionRef.doc(docPath);
    } else {
      docReference = collectionRef.doc();
      model[model.getIdPropName()] = docReference.id;
    }

    return docReference.set(Object.assign({}, model));
  }

  update(model: T): Promise<void> {
    return firebase.firestore().collection(model.getCollectionName()).doc(model[model.getIdPropName()]).set(Object.assign({}, model));
  }

  delete(model: T): Promise<void> {
    return firebase.firestore().collection(model.getCollectionName()).doc(model[model.getIdPropName()]).delete();
  }

  findAllOnce(field?: string, order?: 'desc' | 'asc'): Promise<T[]> {
    return new Promise<any[]>((resolve, reject) => {
      const docRef = firebase.firestore().collection(this.myInstance.getCollectionName());
      let promise: Promise<any>;
      if (field && order) {
        promise = docRef.orderBy(field, order).get();
      } else {
        promise = docRef.get();
      }
      promise
        .then(snapshot => {
          resolve(snapshot.docs
            .map((modelSnapshot: any) => modelSnapshot.data())
            .map((model: any) => plainToClass(this.classType, model)));
        })
        .catch(reason => reject(reason));
    });
  }

  listen(): Observable<[() => void, T[]]> {
    return new Observable(subscriber => {
      const unsubscribeLoadAll = firebase.firestore().collection(this.myInstance.getCollectionName()).onSnapshot(snapshot => {
        subscriber.next([unsubscribeLoadAll, snapshot.docs.map(item => plainToClass(this.classType, item.data()))]);
      });
    });
  }

  listenDoc(reference: DocumentReference): Observable<[() => void, T]> {
    return new Observable(subscriber => {
      const unsubscribe = reference.onSnapshot(snapshot => {
        subscriber.next([unsubscribe, plainToClass(this.classType, snapshot.data())]);
      });
    });
  }

  listenCollection(reference: CollectionReference): Observable<[() => void, T[]]> {
    return new Observable(subscriber => {
      const unsubscribeLoadAll = reference.onSnapshot(snapshot => {
        subscriber.next([unsubscribeLoadAll, snapshot.docs.map(item => plainToClass(this.classType, item.data()))]);
      });
    });
  }
}
