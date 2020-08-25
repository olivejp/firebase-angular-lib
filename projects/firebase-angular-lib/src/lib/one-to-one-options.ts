import * as firebase from 'firebase';
import {ClassTransformOptions} from 'class-transformer';
import FieldPath = firebase.firestore.FieldPath;
import {ClassType} from 'class-transformer/ClassTransformer';

export class OneToOneOptions {
  constructor(
    public collectionName: string, // Le nom de la collection Firebase qu'on veut mettre à jour
    public fieldPath: string | FieldPath, // Le champ dans la collection Firebase qu'il va falloir modifier/supprimer
    public model?: ClassType<any>
  ) {
  }
}
