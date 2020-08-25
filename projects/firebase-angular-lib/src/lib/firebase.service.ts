import * as firebase from 'firebase';

import {classToPlain, ClassTransformOptions, plainToClass} from 'class-transformer';
import {from, Observable, throwError} from 'rxjs';
import {ClassType} from 'class-transformer/ClassTransformer';
import {FirebaseModel} from './firebase.model';
import {UpdateDependencies} from './update-decorator';
import {DeleteDependencies} from './delete-decorator';
import {concatMap, map, toArray} from 'rxjs/operators';
import DocumentReference = firebase.firestore.DocumentReference;
import CollectionReference = firebase.firestore.CollectionReference;
import FieldPath = firebase.firestore.FieldPath;
import WhereFilterOp = firebase.firestore.WhereFilterOp;

export abstract class FirebaseService<T extends FirebaseModel> {
  private readonly classType: ClassType<T>;
  private readonly myInstance: T;
  private readonly ignoredFields: string[];
  private readonly firestoreRef: CollectionReference;

  constructor(type: ClassType<T>) {
    this.classType = type;
    this.myInstance = new type();
    this.firestoreRef = firebase.firestore().collection(this.getCollectionName());
  }

  private removeUndefinedFields(obj: any): any {
    Object.keys(obj).forEach(key => obj[key] === undefined ? delete obj[key] : {});
    return obj;
  }

  getCollectionName(): string {
    return this.myInstance.getCollectionName();
  }

  getAll(options?: ClassTransformOptions): Observable<T[]> {
    return from(this.firestoreRef.get())
      .pipe(
        concatMap(snapshot => from(snapshot.docs)),
        map(doc => doc.data()),
        map(itemPlained => plainToClass(this.classType, itemPlained, options)),
        toArray()
      );
  }

  get(id: string, plainToClassOptions?: ClassTransformOptions): Observable<T> {
    return new Observable<T>(subscriber => {
      this.firestoreRef.doc(id).get()
        .then(a => {
          const data = a.data();
          const item = plainToClass(this.classType, data, plainToClassOptions);
          subscriber.next(item);
          subscriber.complete();
        })
        .catch(error => subscriber.error(error));
    });
  }

  createObs(model: T,
            docPath?: string | undefined,
            classToPlainOptions?: ClassTransformOptions,
            plainToClassOptions?: ClassTransformOptions): Observable<T> {
    if (model && model instanceof FirebaseModel) {
      const {docReference, itemPlained} = this.createCommon(docPath, model, classToPlainOptions);
      return from(docReference.set(itemPlained)).pipe(
        map(() => plainToClass(this.classType, itemPlained, plainToClassOptions))
      );
    }
    return throwError('Model not found or not a FirebaseModel.');
  }

  create(model: T,
         docPath?: string | undefined,
         classToPlainOptions?: ClassTransformOptions): Promise<void> {
    if (model && model instanceof FirebaseModel) {
      const {docReference, itemPlained} = this.createCommon(docPath, model, classToPlainOptions);
      return docReference.set(itemPlained);
    }
    return new Promise((resolve, reject) => reject('Model not found or not a FirebaseModel.'));
  }

  private createCommon(docPath: string, model: T, classToPlainOptions: ClassTransformOptions) {
    let docReference: DocumentReference;
    if (docPath && docPath.length > 0) {
      docReference = this.firestoreRef.doc(docPath);
    } else if (model[model.getIdPropName()]) {
      docReference = this.firestoreRef.doc(model[model.getIdPropName()]);
    } else {
      docReference = this.firestoreRef.doc();
      model[model.getIdPropName()] = docReference.id;
    }
    let itemPlained = classToPlain(model, classToPlainOptions);
    itemPlained = this.removeUndefinedFields(itemPlained);
    return {docReference, itemPlained};
  }

  @UpdateDependencies()
  updateObs(model: T, classToPlainOptions?: ClassTransformOptions, plainToClassOptions?: ClassTransformOptions): Observable<T> {
    if (model && model instanceof FirebaseModel) {
      let itemPlained = classToPlain(model, classToPlainOptions);
      itemPlained = this.removeUndefinedFields(itemPlained);
      return from(this.firestoreRef.doc(model[model.getIdPropName()]).set(itemPlained))
        .pipe(map(() => plainToClass(this.classType, itemPlained, plainToClassOptions)));
    }
    return throwError('Model not found or not a FirebaseModel.');
  }

  @UpdateDependencies()
  update(model: T, classToPlainOptions?: ClassTransformOptions): Promise<void> {
    if (model && model instanceof FirebaseModel) {
      let itemPlained = classToPlain(model, classToPlainOptions);
      itemPlained = this.removeUndefinedFields(itemPlained);
      return this.firestoreRef.doc(model[model.getIdPropName()]).set(itemPlained);
    }
    return new Promise((resolve, reject) => reject('Model not found or not a FirebaseModel.'));
  }

  @DeleteDependencies()
  delete(model: T): Promise<void> {
    if (model && model instanceof FirebaseModel) {
      return this.firestoreRef.doc(model[model.getIdPropName()]).delete();
    }
    return new Promise((resolve, reject) => reject('Model not found or not a FirebaseModel.'));
  }

  findAllOnce(field?: string, order?: 'desc' | 'asc', plainToClassOptions?: ClassTransformOptions): Promise<T[]> {
    return new Promise<any[]>((resolve, reject) => {
      let promise: Promise<any>;
      if (field && order) {
        promise = this.firestoreRef.orderBy(field, order).get();
      } else {
        promise = this.firestoreRef.get();
      }
      promise
        .then(snapshot => {
          resolve(snapshot.docs
            .map((modelSnapshot: any) => modelSnapshot.data())
            .map((model: any) => plainToClass(this.classType, model, plainToClassOptions)));
        })
        .catch(reason => reject(reason));
    });
  }

  listen(plainToClassOptions?: ClassTransformOptions): Observable<[() => void, T[]]> {
    return new Observable(subscriber => {
      const unsubscribeLoadAll = this.firestoreRef.onSnapshot(snapshot => {
        subscriber.next([unsubscribeLoadAll,
          snapshot.docs.map(item => plainToClass(this.classType, item.data(), plainToClassOptions))]);
      });
    });
  }

  listenDoc(reference: DocumentReference, plainToClassOptions?: ClassTransformOptions): Observable<[() => void, T]> {
    return new Observable(subscriber => {
      const unsubscribe = reference.onSnapshot(snapshot => {
        subscriber.next([unsubscribe, plainToClass(this.classType, snapshot.data(), plainToClassOptions)]);
      });
    });
  }

  listenCollection(reference: CollectionReference, plainToClassOptions?: ClassTransformOptions): Observable<[() => void, T[]]> {
    return new Observable(subscriber => {
      const unsubscribeLoadAll = reference.onSnapshot(snapshot => {
        subscriber.next([unsubscribeLoadAll,
          snapshot.docs.map(item => plainToClass(this.classType, item.data(), plainToClassOptions))]);
      });
    });
  }

  getWithCondition(fieldPath: string | FieldPath,
                   optStr: WhereFilterOp, value: any,
                   plainToClassOptions?: ClassTransformOptions): Observable<[() => void, T[]]> {
    return new Observable(subscriber => {
      const unsubscribeLoadAll = firebase
        .firestore()
        .collection(this.myInstance.getCollectionName())
        .where(fieldPath, optStr, value)
        .onSnapshot(snapshot => {
          subscriber.next([
            unsubscribeLoadAll,
            snapshot.docs.map(item => plainToClass(this.classType, item.data(), plainToClassOptions)),
          ]);
        });
    });
  }
}
