import { z } from 'zod';
import { NotFoundError } from '@skelly/utils';
import { createHandler, ApiResult } from '../../core';
import { UserControllerDeps } from './deps';

export const getUserSchema = z.object({
  id: z.string().uuid(),
});

export type UserIdParams = z.infer<typeof getUserSchema>;

export function createGetUserHandler(deps: UserControllerDeps) {
  return createHandler(
    {
      params: getUserSchema,
    },
    async ({ logger, params }) => {
      const { id } = params;

      const user = await deps.userService.findById(id);

      if (!user) {
        throw new NotFoundError('User', id);
      }

      logger.info('User retrieved', { userId: user.id });

      return ApiResult.success(user);
    }
  );
}
