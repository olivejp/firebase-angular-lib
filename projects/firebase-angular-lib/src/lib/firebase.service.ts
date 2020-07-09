import * as firebase from 'firebase';

import {classToPlain, plainToClass} from 'class-transformer';
import {Observable} from 'rxjs';
import {ClassType} from 'class-transformer/ClassTransformer';
import {FirebaseModel} from './firebase.model';
import {UpdateDependencies} from './decorators/update-decorator';
import DocumentReference = firebase.firestore.DocumentReference;
import CollectionReference = firebase.firestore.CollectionReference;

export abstract class FirebaseService<T extends FirebaseModel> {
  private readonly classType: ClassType<T>;
  private readonly myInstance: T;
  private readonly ignoredFields: string[];

  private constructor(type: ClassType<T>) {
    this.classType = type;
    this.myInstance = new type();
  }

  protected toPlain(model: T): {} {
    return classToPlain(model, {});
  }

  private create(model: T, docPath?: string): Promise<void> {
    if (model && model instanceof FirebaseModel) {
      const collectionRef = firebase.firestore().collection(model.getCollectionName());

      let docReference: DocumentReference;
      if (docPath && docPath.length > 0) {
        docReference = collectionRef.doc(docPath);
      } else {
        docReference = collectionRef.doc();
        model[model.getIdPropName()] = docReference.id;
      }

      return docReference.set(this.toPlain(model));
    }
    return new Promise((resolve, reject) => reject('Model not found or not a FirebaseModel.'));
  }

  @UpdateDependencies()
  private update(model: T): Promise<void> {
    if (model && model instanceof FirebaseModel) {
      return firebase.firestore().collection(model.getCollectionName()).doc(model[model.getIdPropName()]).set(this.toPlain(model));
    }
    return new Promise((resolve, reject) => reject('Model not found or not a FirebaseModel.'));
  }

  private delete(model: T): Promise<void> {
    if (model && model instanceof FirebaseModel) {
      return firebase.firestore().collection(model.getCollectionName()).doc(model[model.getIdPropName()]).delete();
    }
    return new Promise((resolve, reject) => reject('Model not found or not a FirebaseModel.'));
  }

  private findAllOnce(field?: string, order?: 'desc' | 'asc'): Promise<T[]> {
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

  private listen(): Observable<[() => void, T[]]> {
    return new Observable(subscriber => {
      const unsubscribeLoadAll = firebase.firestore().collection(this.myInstance.getCollectionName()).onSnapshot(snapshot => {
        subscriber.next([unsubscribeLoadAll,
          snapshot.docs.map(item => plainToClass(this.classType, item.data(),
            {excludeExtraneousValues: true}))]);
      });
    });
  }

  private listenDoc(reference: DocumentReference): Observable<[() => void, T]> {
    return new Observable(subscriber => {
      const unsubscribe = reference.onSnapshot(snapshot => {
        subscriber.next([unsubscribe, plainToClass(this.classType, snapshot.data(), {excludeExtraneousValues: true})]);
      });
    });
  }

  private listenCollection(reference: CollectionReference): Observable<[() => void, T[]]> {
    return new Observable(subscriber => {
      const unsubscribeLoadAll = reference.onSnapshot(snapshot => {
        subscriber.next([unsubscribeLoadAll,
          snapshot.docs.map(item => plainToClass(this.classType, item.data(),
            {excludeExtraneousValues: true}))]);
      });
    });
  }
}
