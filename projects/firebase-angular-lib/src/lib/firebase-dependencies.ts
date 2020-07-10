import {UpdateDependencyOptions} from './update-dependencies-options';

/**
 * Class Decorator to add fields on decorated class.
 * This decorator should be applied on FirebaseService only.
 */
// Function qui sert de décorator et permet de récupérer les paramètres associés.
export function FirebaseDependencies(dependencies: UpdateDependencyOptions[]): any {
  // Function qui retourne une function.
  return function addDependencies(constructor) {
    // Function qui retourne un objet avec à l'intérieur les dépendances.
    constructor.prototype.dependencies = dependencies;
  };
}
