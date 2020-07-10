import * as firebase from 'firebase';
import FieldPath = firebase.firestore.FieldPath;

export class UpdateDependencyOptions {
  constructor(
    public modelName: string,
    public targetIndex: string,
    public targetFieldPath: string | FieldPath,
    public excludedFiles?: string[]
  ) {
  }
}
