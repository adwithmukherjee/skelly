import type { Database } from '@skelly/db';

export abstract class DatabaseRepository<T> {
  constructor(protected readonly db: Database) {}

  /**
   * Find a record by ID
   */
  abstract findById(id: string): Promise<T | null>;

  /**
   * Find multiple records based on filters
   */
  abstract findMany(filter?: any): Promise<T[]>;

  /**
   * Create a new record
   */
  abstract create(data: any): Promise<T>;

  /**
   * Update a record by ID
   */
  abstract update(id: string, data: any): Promise<T>;

  /**
   * Delete a record by ID
   */
  abstract delete(id: string): Promise<void>;
}