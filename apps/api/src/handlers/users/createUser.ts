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
    async ({ body }) => {
      // Check if email already exists
      const existing = await deps.userService.findByEmail(body.email);
      if (existing) {
        throw new ValidationError('Email already in use', {
          field: 'email',
          value: body.email,
        });
      }

      const result = await deps.userService.create({
        email: body.email,
        name: body.name,
        role: body.role,
      });

      // Log is handled by service, but we can add handler-specific logging if needed

      return ApiResult.success(result.data);
    }
  );
