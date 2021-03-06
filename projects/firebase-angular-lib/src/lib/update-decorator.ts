import * as firebase from 'firebase';
import {from, Observable} from 'rxjs';
import {concatMap} from 'rxjs/operators';
import {classToPlain, ClassTransformOptions} from 'class-transformer';
import {FirebaseModel} from './firebase.model';
import {UpdateDependencyOptions} from './dependencies-options';
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
      model: FirebaseModel
    ): Observable<void> {
      const itemPlained = classToPlain(model, depOptions.options);
      const sourceUpdated = Object.assign(snapshot.data(), {[`${depOptions.targetModelName}`]: itemPlained});
      return from(snapshot.ref.set(sourceUpdated, {merge: true}));
    }

    function dependenciesLoop(model: FirebaseModel) {
      // Parcourt de toutes les dépendances de cet objet
      for (const dependency of this.dependencies) {
        const depOptions: UpdateDependencyOptions = dependency;
        if (depOptions.onUpdate) {
          const attributeEgality = (depOptions.modelAttribute) ? model[depOptions.modelAttribute] : model[model.getIdPropName()];
          from(
            firebase.firestore().collection(depOptions.targetIndex)
              .where(depOptions.targetFieldPath, '==', attributeEgality).get()
          )
            .pipe(
              concatMap(snapshots => from(snapshots.docs)),
              concatMap(snapshot => plainItemAndSet(snapshot, depOptions, model))
            )
            .subscribe(
              () => console.log('Updated successfully'),
              error => console.error(error),
              () => console.log('Updated complete')
            );
        }
      }
    }

    // Redefine the method value with our own
    descriptor.value = function(args: any, options?: ClassTransformOptions): any {
      if (args && args instanceof FirebaseModel) {
        if (this.dependencies && this.dependencies.length > 0) {
          dependenciesLoop.call(this, args);
        }
      }

      // Launch the original function
      return originalMethod.apply(this, [args, options]);
    };

    // Return the descriptor with the altered value
    return descriptor;
  };
}
