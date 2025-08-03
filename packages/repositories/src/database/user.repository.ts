import { User, NewUser, users } from '@skelly/db';
import { eq, and, sql } from '@skelly/db';
import { DrizzleRepository } from '../base/drizzle.repository';

export interface UserFilters {
  email?: string;
  role?: string;
  isActive?: boolean;
}

export interface ListUsersOptions {
  offset: number;
  limit: number;
  role?: string;
}

/**
 * Repository for user data access
 */
export class UserRepository extends DrizzleRepository<typeof users, User, NewUser> {
  protected table = users;

  /**
   * Find a user by email address
   */
  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.email, email))
      .limit(1);

    return user || null;
  }

  /**
   * Find multiple users based on filters
   */
  async findMany(filters?: UserFilters): Promise<User[]> {
    const conditions = [];
    
    if (filters?.email) {
      conditions.push(eq(this.table.email, filters.email));
    }
    if (filters?.role) {
      conditions.push(eq(this.table.role, filters.role as any));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(this.table.isActive, filters.isActive));
    }

    return this.findByConditions(conditions);
  }

  /**
   * List users with pagination
   */
  async listWithPagination(options: ListUsersOptions): Promise<{ users: User[]; total: number }> {
    const { offset, limit, role } = options;

    // Build where conditions
    const conditions = [];
    if (role) {
      conditions.push(eq(this.table.role, role as any));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.table)
      .where(whereClause);

    // Get paginated results
    const userList = await this.db
      .select()
      .from(this.table)
      .where(whereClause)
      .orderBy(this.table.createdAt)
      .limit(limit)
      .offset(offset);

    return {
      users: userList,
      total: Number(count),
    };
  }

  /**
   * Count users by role
   */
  async countByRole(role: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.table)
      .where(eq(this.table.role, role as any));
    
    return Number(result.count);
  }

  /**
   * Find active users
   */
  async findActiveUsers(): Promise<User[]> {
    return this.findMany({ isActive: true });
  }

  /**
   * Update user's last login time
   */
  async updateLastLogin(userId: string): Promise<User> {
    return this.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  /**
   * Soft delete a user (set isActive to false)
   */
  async softDelete(id: string): Promise<User> {
    return this.update(id, {
      isActive: false,
    });
  }
}