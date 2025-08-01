import { z } from 'zod';
import { ValidationError } from '@skelly/utils';
import { createHandler, ApiResult } from '../../core';
import { UserControllerDeps } from './deps';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['user', 'admin']).default('user'),
});

export type CreateUserBody = z.infer<typeof createUserSchema>;

export function createCreateUserHandler(deps: UserControllerDeps) {
  return createHandler(
    {
      body: createUserSchema,
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
        ...body,
        // In a real app, you'd hash the password here
        passwordHash: 'hashed_password',
      });

      logger.info('User created', { userId: user.id, email: user.email });

      return ApiResult.success(user);
    }
  );
}
