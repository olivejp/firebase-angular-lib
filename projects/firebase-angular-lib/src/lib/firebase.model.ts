import * as firebase from 'firebase';
import DocumentReference = firebase.firestore.DocumentReference;

export abstract class FirebaseModel {

  private readonly collectionName: string;
  private readonly idPropName: string;

  /**
   * The ref attribute references the class field used in firebase at the document id.
   * @param collectionName The name of the collection
   * @param idPropName The name of the property identifying the element
   */
  protected constructor(collectionName: string, idPropName: string) {
    this.collectionName = collectionName;
    this.idPropName = idPropName;
  }

  getIdPropName(): string {
    return this.idPropName;
  }

  getCollectionName(): string {
    return this.collectionName;
  }

  getFirestoreRef(): DocumentReference {
    return firebase.firestore().collection(this.collectionName).doc(this[this.idPropName]);
  }
}
