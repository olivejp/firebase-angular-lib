import * as firebase from 'firebase';
import {from, Observable} from 'rxjs';
import {concatMap} from 'rxjs/operators';
import {classToPlain} from 'class-transformer';
import FieldPath = firebase.firestore.FieldPath;
import QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;
import DocumentData = firebase.firestore.DocumentData;
import {FirebaseModel} from '../firebase.model';

export class UpdateDependencyOptions {
  constructor(
    public modelName: string,
    public targetIndex: string,
    public targetFieldPath: string | FieldPath,
    public excludedFiles?: string[]
  ) {
  }
}

/**
 * Class Decorator to add fields on decorated class.
 * This decorator should be applied on FirebaseService only.
 */
// Function qui sert de décorator et permet de récupérer les paramètres associés.
export function FirebaseDependencies(dependencies: UpdateDependencyOptions[]): any {
  // Function qui retourne une function.
  return function addDependencies<T extends new (...args: any[]) => {}>(constructor: T): T {
    // Function qui retourne un objet avec à l'intérieur les dépendances.
    return class extends constructor {
      dependencies = dependencies;
    };
  };
}

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
