import * as firebase from 'firebase';

import {plainToClass} from 'class-transformer';
import {Observable} from 'rxjs';
import {ClassType} from 'class-transformer/ClassTransformer';
import {FirebaseModel} from './firebase.model';

export abstract class FirebaseService<T extends FirebaseModel> {
  protected tableName: string;
  protected classType: ClassType<T>;

  protected constructor(name: string, type: ClassType<T>) {
    this.tableName = name;
    this.classType = type;
  }

  create(model: T): Promise<void> {
    const docReference = firebase.firestore().collection(this.tableName).doc();
    model[model.getRef()] = docReference.id;
    return docReference.set(Object.assign({}, model));
  }

  update(model: T): Promise<void> {
    return firebase.firestore().collection(this.tableName).doc(model[model.getRef()]).set(Object.assign({}, model));
  }

  delete(model: T): Promise<void> {
    return firebase.firestore().collection(this.tableName).doc(model[model.getRef()]).delete();
  }

  findAllOnce(field?: string, order?: 'desc' | 'asc'): Promise<T[]> {
    return new Promise<any[]>((resolve, reject) => {
      const docRef = firebase.firestore().collection(this.tableName);
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
      const unsubscribeLoadAll = firebase.firestore().collection(this.tableName).onSnapshot(snapshot => {
        subscriber.next([unsubscribeLoadAll, snapshot.docs.map(article => plainToClass(this.classType, article.data()))]);
      });
    });
  }
}
