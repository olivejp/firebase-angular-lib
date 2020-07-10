import * as firebase from 'firebase';
import {from, Observable} from 'rxjs';
import {concatMap} from 'rxjs/operators';
import {classToPlain} from 'class-transformer';
import {FirebaseModel} from './firebase.model';
import {UpdateDependencyOptions} from './update-dependencies-options';
import QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;
import DocumentData = firebase.firestore.DocumentData;

/**
 * Method Decorator to update the dependencies
 */
export function UpdateDependencies(): any {
  // Return our high-order function
  return (target: any, methodName: any, descriptor: any): any => {
    // Keep the method store in a local variable
    const originalMethod = descriptor.value;

    function plainItemAndSet(
      snapshot: QueryDocumentSnapshot<DocumentData>,
      depOptions: UpdateDependencyOptions,
      model: FirebaseModel,
      targetA: any
    ): Observable<void> {
      let itemPlained;
      if (targetA.toPlain) {
        itemPlained = targetA.toPlain(model);
      } else {
        itemPlained = classToPlain(model, {
          excludePrefixes: ['reference'],
        });
      }
      const sourceUpdated = Object.assign(snapshot.data(), {[`${depOptions.modelName}`]: itemPlained});
      return from(snapshot.ref.set(sourceUpdated, {merge: true}));
    }

    function dependenciesLoop(model: FirebaseModel) {
      // Parcourt de toutes les dépendances de cet objet
      for (const dependency of this.dependencies) {
        const depOptions: UpdateDependencyOptions = dependency;
        from(
          firebase.firestore().collection(depOptions.targetIndex)
            .where(depOptions.targetFieldPath, '==', model[model.getIdPropName()]).get()
        )
          .pipe(
            concatMap(snapshots => from(snapshots.docs)),
            concatMap(snapshot => plainItemAndSet(snapshot, depOptions, model, this))
          )
          .subscribe(
            () => console.log('Updated successfully'),
            error => console.error(error),
            () => console.log('Updated complete')
          );
      }
    }

    // Redefine the method value with our own
    descriptor.value = function(args: any): any {
      if (args && args instanceof FirebaseModel) {
        if (this.dependencies && this.dependencies.length > 0) {
          dependenciesLoop.call(this, args);
        }
      }

      // Launch the original function
      return originalMethod.apply(this, [args]);
    };

    // Return the descriptor with the altered value
    return descriptor;
  };
}
