import * as firebase from 'firebase';
import {ClassTransformOptions} from 'class-transformer';
import FieldPath = firebase.firestore.FieldPath;

export class UpdateDependencyOptions {
  constructor(
    public targetModelName: string,
    public targetIndex: string, // Le nom de la collection Firebase qu'on veut mettre à jour
    public targetFieldPath: string | FieldPath, // Le champ dans la collection Firebase qu'il va falloir modifier/supprimer
    public modelAttribute?: string,
    public options?: ClassTransformOptions, // Les options de transformations.
    public onUpdate = true, // Est ce qu'il faut jouer la dépendance si on fait une mise à jour
    public onDelete = true, // Est ce qu'il faut jouer la dépendance si on fait une suppression
    public deleteOnCascade = false // Est ce qu'il faut supprimer la classe dépendante dans le cas d'une suppression
  ) {
  }
}
