import {OneToOneOptions} from './one-to-one-options';

/**
 * Accessor Decorator
 */
export function OneToOne(options: OneToOneOptions): any {
  return (target: any, propertyKey: string | symbol): any => {
    console.log('Hello JP');
  };
}
