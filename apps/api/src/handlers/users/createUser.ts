import { z } from 'zod';
import { ValidationError } from '@skelly/utils';
import { createHandler, ApiResult } from '../../core';
import { UserControllerDeps } from './deps';
import { userSchema } from './schemas';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['user', 'admin']).default('user'),
});

export type CreateUserBody = z.infer<typeof createUserSchema>;

// Use the shared user schema for the response
export const createUserResponseSchema = userSchema;
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;

export const createUserHandler = (deps: UserControllerDeps) =>
  createHandler(
    {
      body: createUserSchema,
      response: createUserResponseSchema,
    },
    async ({ body, logger }) => {
      // Check if email already exists
      const existing = await deps.userService.findByEmail(body.email);
      if (existing) {
        throw new ValidationError('Email already in use', {
          field: 'email',
          value: body.email,
        });
      }

      const user = await deps.userService.create({
        email: body.email,
        username: body.name, // Map 'name' from request to 'username' in DB
        firstName: null,
        lastName: null,
        role: body.role as 'user' | 'admin' | 'moderator',
        passwordHash: 'hashed_password', // In a real app, you'd hash the password here
        isEmailVerified: false,
        isActive: true,
        lastLoginAt: null,
      });

      logger.info('User created', { userId: user.id, email: user.email });

      return ApiResult.success(user);
    }
  );
