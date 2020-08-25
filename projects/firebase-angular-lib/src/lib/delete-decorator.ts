import * as firebase from 'firebase';
import {from, Observable} from 'rxjs';
import {concatMap, map, toArray} from 'rxjs/operators';
import {FirebaseModel} from './firebase.model';
import {UpdateDependencyOptions} from './dependencies-options';
import QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;
import DocumentData = firebase.firestore.DocumentData;

/**
 * Method Decorator to delete the dependencies
 */
export function DeleteDependencies(): any {
  // Return our high-order function
  return (target: any, methodName: any, descriptor: any): any => {
    // Keep the method store in a local variable
    const originalMethod = descriptor.value;

    function plainItemAndSet(
      snapshot: QueryDocumentSnapshot<DocumentData>,
      depOptions: UpdateDependencyOptions
    ): Observable<void> {
      const sourceUpdated = Object.assign(snapshot.data(), {[`${depOptions.targetModelName}`]: null});
      return from(snapshot.ref.set(sourceUpdated, {merge: true}));
    }

    function dependenciesLoop(model: FirebaseModel) {
      // Parcourt de toutes les dépendances de cet objet
      for (const dependency of this.dependencies) {
        const depOptions: UpdateDependencyOptions = dependency;
        if (!depOptions.onDelete) {
          continue;
        }

        const attributeEgality = (depOptions.modelAttribute) ? model[depOptions.modelAttribute] : model[model.getIdPropName()];
        const getWhere = firebase.firestore().collection(depOptions.targetIndex)
          .where(depOptions.targetFieldPath, '==', attributeEgality).get();
        let obs;
        if (depOptions.deleteOnCascade) {
          obs = from(getWhere).pipe(
            concatMap(snap => from(snap.docs)),
            concatMap(doc => from(doc.ref.delete())),
            toArray()
          );
        } else {
          obs = from(getWhere)
            .pipe(
              concatMap(snapshots => from(snapshots.docs)),
              concatMap(snapshot => plainItemAndSet(snapshot, depOptions)),
              toArray()
            );
        }
        obs.subscribe(
          () => console.log('Deleted successfully'),
          error => console.error(error),
          () => console.log('Deleted complete')
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
