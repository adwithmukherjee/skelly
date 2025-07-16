import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../core';
import { NotFoundError, ValidationError } from '@skelly/utils';
import { UserService } from '../services/user.service';

// Validation schemas
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['user', 'admin']).default('user'),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['user', 'admin']).optional(),
});

export const userIdSchema = z.object({
  id: z.string().uuid(),
});

export const listUsersSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  role: z.enum(['user', 'admin']).optional(),
});

interface UserControllerDeps {
  userService: UserService;
}

export class UserController extends BaseController {
  constructor(private readonly deps: UserControllerDeps) {
    super();
  }

  /**
   * GET /users
   * List all users with pagination
   */
  listUsers = this.asyncHandler(async (req: Request, res: Response) => {
    const query = this.validateQuery(req, listUsersSchema);
    const { page, limit, offset } = this.getPagination(req);

    const { users, total } = await this.deps.userService.list({
      offset,
      limit,
      role: query.role,
    });

    this.paginated(res, users, { page, limit, total });
  });

  /**
   * GET /users/:id
   * Get a single user by ID
   */
  getUser = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = this.validateParams(req, userIdSchema);

    const user = await this.deps.userService.findById(id);

    if (!user) {
      throw new NotFoundError('User', id);
    }

    this.success(res, user);
  });

  /**
   * POST /users
   * Create a new user
   */
  createUser = this.asyncHandler(async (req: Request, res: Response) => {
    const data = this.validateBody(req, createUserSchema);

    // Check if email already exists
    const existing = await this.deps.userService.findByEmail(data.email);
    if (existing) {
      throw new ValidationError('Email already in use', {
        field: 'email',
        value: data.email,
      });
    }

    const user = await this.deps.userService.create({
      ...data,
      // In a real app, you'd hash the password here
      passwordHash: 'hashed_password',
    });

    req.logger.info('User created', { userId: user.id, email: user.email });

    this.success(res, user, 201);
  });

  /**
   * PATCH /users/:id
   * Update a user
   */
  updateUser = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = this.validateParams(req, userIdSchema);
    const data = this.validateBody(req, updateUserSchema);

    // Check if user exists
    const existing = await this.deps.userService.findById(id);
    if (!existing) {
      throw new NotFoundError('User', id);
    }

    // Check if email is being changed to one that already exists
    if (data.email && data.email !== existing.email) {
      const emailTaken = await this.deps.userService.findByEmail(data.email);
      if (emailTaken) {
        throw new ValidationError('Email already in use', {
          field: 'email',
          value: data.email,
        });
      }
    }

    const user = await this.deps.userService.update(id, data);

    req.logger.info('User updated', { userId: user.id });

    this.success(res, user);
  });

  /**
   * DELETE /users/:id
   * Delete a user
   */
  deleteUser = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = this.validateParams(req, userIdSchema);

    const user = await this.deps.userService.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }

    await this.deps.userService.delete(id);

    req.logger.info('User deleted', { userId: id });

    res.status(204).send();
  });
}
