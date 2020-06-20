export abstract class FirebaseModel {

  private readonly reference: string;

  /**
   * The ref attribute references the class field used in firebase at the document id.
   * @param ref: string
   */
  protected constructor(ref: string) {
    this.reference = ref;
  }

  getRef(): string {
    return this.reference;
  }
}
