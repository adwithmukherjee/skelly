import { UserRepository } from '@skelly/repositories';
import { ValidationError, NotFoundError } from '@skelly/utils';
import { UserRole } from '@skelly/types';
import type { User, NewUser } from '@skelly/db';
import type { Logger } from 'winston';

export interface UserServiceDeps {
  userRepository: UserRepository;
  logger: Logger;
}

export interface CreateUserDto {
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  role?: 'user' | 'admin';
}

export interface UserServiceResult<T> {
  data: T;
  events?: Array<{
    type: string;
    payload: any;
  }>;
}

export class UserService {
  constructor(private readonly deps: UserServiceDeps) {}

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.deps.userRepository.findById(id);
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.deps.userRepository.findByEmail(email);
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserDto): Promise<UserServiceResult<User>> {
    // Business validation
    const existingUser = await this.deps.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ValidationError('Email already in use', {
        field: 'email',
        value: data.email,
      });
    }

    // Transform DTO to repository format
    const userData: NewUser = {
      email: data.email,
      username: data.name, // Map 'name' to 'username'
      passwordHash: 'hashed_password', // In real app, would hash password
      role: data.role === 'admin' ? UserRole.ADMIN : UserRole.USER,
      firstName: null,
      lastName: null,
      isEmailVerified: false,
      isActive: true,
      lastLoginAt: null,
    };

    const user = await this.deps.userRepository.create(userData);

    this.deps.logger.info('User created', { 
      userId: user.id, 
      email: user.email 
    });

    return {
      data: user,
      events: [{
        type: 'user.created',
        payload: { 
          userId: user.id, 
          email: user.email 
        }
      }]
    };
  }

  /**
   * Update an existing user
   */
  async update(id: string, data: UpdateUserDto): Promise<UserServiceResult<User>> {
    // Check if user exists
    const existingUser = await this.deps.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User', id);
    }

    // Check if email is being changed to one that already exists
    if (data.email && data.email !== existingUser.email) {
      const emailTaken = await this.deps.userRepository.findByEmail(data.email);
      if (emailTaken) {
        throw new ValidationError('Email already in use', {
          field: 'email',
          value: data.email,
        });
      }
    }

    // Transform DTO to repository format
    const updateData: Partial<NewUser> = {};
    
    if (data.email !== undefined) {
      updateData.email = data.email;
    }
    if (data.name !== undefined) {
      updateData.username = data.name; // Map 'name' to 'username'
    }
    if (data.role !== undefined) {
      updateData.role = data.role === 'admin' ? UserRole.ADMIN : UserRole.USER;
    }

    const user = await this.deps.userRepository.update(id, updateData);

    this.deps.logger.info('User updated', {
      userId: user.id,
      changes: Object.keys(data),
    });

    return {
      data: user,
      events: [{
        type: 'user.updated',
        payload: { 
          userId: user.id,
          changes: Object.keys(data)
        }
      }]
    };
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<UserServiceResult<void>> {
    const user = await this.deps.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }

    await this.deps.userRepository.delete(id);

    this.deps.logger.info('User deleted', { userId: id });

    return {
      data: undefined,
      events: [{
        type: 'user.deleted',
        payload: { userId: id }
      }]
    };
  }

  /**
   * List users with pagination
   */
  async list(options: {
    offset: number;
    limit: number;
    role?: string;
  }): Promise<{ users: User[]; total: number }> {
    return this.deps.userRepository.listWithPagination(options);
  }
}