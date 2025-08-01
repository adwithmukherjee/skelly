import { z } from 'zod';
import { NotFoundError } from '@skelly/utils';
import { ApiResult, createHandler } from '../../core';
import { UserControllerDeps } from './deps';
import { userSchema } from './schemas';

export const getUserSchema = z.object({
  id: z.string().uuid(),
});

export type UserIdParams = z.infer<typeof getUserSchema>;

// Optional: Add response schema for validation in development
export const getUserResponseSchema = userSchema;
export type GetUserResponse = z.infer<typeof getUserResponseSchema>;

// Export schemas for this handler
export const schemas = {
  params: getUserSchema,
  response: getUserResponseSchema,
};

// Export the handler function
export const getUserHandler = (deps: UserControllerDeps) =>
  createHandler(schemas, async ({ logger, params }) => {
    const { id } = params;

    const user = await deps.userService.findById(id);

    if (!user) {
      throw new NotFoundError('User', id);
    }

    logger.info('User retrieved', { userId: user.id });

    return ApiResult.success(user);
  });
