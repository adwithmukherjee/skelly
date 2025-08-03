import { User, NewUser, users } from '@skelly/db';
import { eq, and, sql } from '@skelly/db';
import type { Database } from '@skelly/db';

interface UserServiceDeps {
  db: Database;
}

export class UserService {
  constructor(private readonly deps: UserServiceDeps) {}

  async findById(id: string): Promise<User | null> {
    const [user] = await this.deps.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.deps.db
      .select()
      .from(users)
      .where(eq(users.email, email as string))
      .limit(1);

    return user || null;
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await this.deps.db.insert(users).values(data).returning();

    return user;
  }

  async update(id: string, data: Partial<NewUser>): Promise<User> {
    const [user] = await this.deps.db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return user;
  }

  async delete(id: string): Promise<void> {
    await this.deps.db.delete(users).where(eq(users.id, id));
  }

  async list(options: {
    offset: number;
    limit: number;
    role?: string;
  }): Promise<{ users: User[]; total: number }> {
    const { offset, limit, role } = options;

    // Build where conditions
    const conditions = [];
    if (role) {
      conditions.push(eq(users.role, role as 'user' | 'admin' | 'moderator'));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await this.deps.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);

    // Get paginated results
    const userList = await this.deps.db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(users.createdAt)
      .limit(limit)
      .offset(offset);

    return {
      users: userList,
      total: Number(count),
    };
  }
}
