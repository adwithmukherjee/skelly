import { Database, eq, and, sql } from '@skelly/db';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { DatabaseRepository } from './database.repository';

/**
 * Generic base repository for Drizzle ORM tables
 * 
 * @template TTable - The Drizzle table type
 * @template TSelect - The select type (use table.$inferSelect)
 * @template TInsert - The insert type (use table.$inferInsert)
 * 
 * @example
 * ```typescript
 * import { users, type User, type NewUser } from '@skelly/db';
 * 
 * export class UserRepository extends DrizzleRepository<
 *   typeof users,
 *   User,    // typeof users.$inferSelect
 *   NewUser  // typeof users.$inferInsert
 * > {
 *   protected table = users;
 *   
 *   // Add custom methods here
 *   async findByEmail(email: string): Promise<User | null> {
 *     const [user] = await this.db
 *       .select()
 *       .from(this.table)
 *       .where(eq(this.table.email, email))
 *       .limit(1);
 *     return user || null;
 *   }
 * }
 * ```
 */
export abstract class DrizzleRepository<
  TTable extends PgTable,
  TSelect,
  TInsert
> extends DatabaseRepository<TSelect> {
  /**
   * The Drizzle table instance
   */
  protected abstract table: TTable;

  constructor(protected readonly db: Database) {
    super(db);
  }

  /**
   * Find a record by ID
   * Assumes the table has an 'id' column
   */
  async findById(id: string): Promise<TSelect | null> {
    const [result] = await this.db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);
    
    return result as TSelect || null;
  }

  /**
   * Find all records
   */
  async findAll(): Promise<TSelect[]> {
    const results = await this.db
      .select()
      .from(this.table);
    
    return results as TSelect[];
  }

  /**
   * Find multiple records based on conditions
   * Override this method in subclasses for specific filtering
   */
  async findMany(_filter?: any): Promise<TSelect[]> {
    // Default implementation - override in subclasses
    return this.findAll();
  }

  /**
   * Find records by SQL conditions
   */
  protected async findByConditions(conditions?: SQL[]): Promise<TSelect[]> {
    let query = this.db.select().from(this.table);
    
    if (conditions && conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const results = await query;
    return results as TSelect[];
  }

  /**
   * Create a new record
   */
  async create(data: TInsert): Promise<TSelect> {
    const [result] = await this.db
      .insert(this.table)
      .values(data as any)
      .returning();
    
    return result as TSelect;
  }

  /**
   * Create multiple records
   */
  async createMany(data: TInsert[]): Promise<TSelect[]> {
    const results = await this.db
      .insert(this.table)
      .values(data as any)
      .returning();
    
    return results as TSelect[];
  }

  /**
   * Update a record by ID
   * Assumes the table has an 'id' column
   */
  async update(id: string, data: Partial<TInsert>): Promise<TSelect> {
    const [result] = await this.db
      .update(this.table)
      .set({
        ...data,
        updatedAt: new Date(), // Assumes updatedAt column exists
      } as any)
      .where(eq((this.table as any).id, id))
      .returning();
    
    if (!result) {
      throw new Error(`Record with id ${id} not found`);
    }
    
    return result as TSelect;
  }

  /**
   * Update multiple records based on conditions
   */
  async updateMany(conditions: SQL[], data: Partial<TInsert>): Promise<TSelect[]> {
    if (conditions.length === 0) {
      throw new Error('Cannot update without conditions');
    }
    
    const results = await this.db
      .update(this.table)
      .set({
        ...data,
        updatedAt: new Date(),
      } as any)
      .where(and(...conditions))
      .returning();
    
    return results as TSelect[];
  }

  /**
   * Delete a record by ID
   * Assumes the table has an 'id' column
   */
  async delete(id: string): Promise<void> {
    await this.db
      .delete(this.table)
      .where(eq((this.table as any).id, id));
  }

  /**
   * Delete multiple records based on conditions
   */
  async deleteMany(conditions: SQL[]): Promise<void> {
    if (conditions.length === 0) {
      throw new Error('Cannot delete without conditions - use deleteAll() instead');
    }
    
    await this.db
      .delete(this.table)
      .where(and(...conditions));
  }

  /**
   * Delete all records (use with caution!)
   */
  async deleteAll(): Promise<void> {
    await this.db.delete(this.table);
  }

  /**
   * Count records based on conditions
   */
  async count(conditions?: SQL[]): Promise<number> {
    const countQuery = sql<number>`count(*)`;
    let query = this.db.select({ count: countQuery }).from(this.table);
    
    if (conditions && conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const [result] = await query;
    return Number(result.count);
  }

  /**
   * Check if a record exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const existsQuery = sql<number>`1`;
    const [result] = await this.db
      .select({ exists: existsQuery })
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);
    
    return !!result;
  }

  /**
   * Execute a transaction
   * @param callback The transaction callback
   */
  async transaction<T>(callback: (tx: Database) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }
}