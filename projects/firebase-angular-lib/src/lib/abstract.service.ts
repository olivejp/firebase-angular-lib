export interface AbstractService<T> {
  get(id: any): T;

  getAll(): T[];

  delete(id: any): T;

  update(item: any): T;

  create(item: any): T;
}
