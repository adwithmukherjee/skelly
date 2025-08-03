import { z } from 'zod';
import { NotFoundError, ValidationError } from '@skelly/utils';
import { createHandler, ApiResult } from '../../core';
import { getUserSchema } from './getUser';
import { UserControllerDeps } from './deps';

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['user', 'admin']).optional(),
});

export type UpdateUserBody = z.infer<typeof updateUserSchema>;

export const updateUserHandler = (deps: UserControllerDeps) =>
  createHandler(
    {
      params: getUserSchema,
      body: updateUserSchema,
    },
    async ({ logger, params, body }) => {
      const { id } = params;
      const data = body;

      // Check if user exists
      const existing = await deps.userService.findById(id);
      if (!existing) {
        throw new NotFoundError('User', id);
      }

      // Check if email is being changed to one that already exists
      if (data.email && data.email !== existing.email) {
        const emailTaken = await deps.userService.findByEmail(data.email);
        if (emailTaken) {
          throw new ValidationError('Email already in use', {
            field: 'email',
            value: data.email,
          });
        }
      }

      // Map 'name' to 'username' if present
      const updateData = {
        ...data,
        ...(data.name && { username: data.name }),
      };
      delete (updateData as any).name;

      const user = await deps.userService.update(id, updateData);

      logger.info('User updated', {
        userId: user.id,
        changes: Object.keys(data),
      });

      return ApiResult.success(user);
    }
  );
