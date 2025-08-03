import { z } from 'zod';
import { UserControllerDeps } from './deps';
import { createHandler, ApiResult } from '../../core';
import { NotFoundError } from '@skelly/utils';

export const deleteUserSchema = z.object({
  id: z.string().uuid(),
});

export const deleteUserHandler = (deps: UserControllerDeps) =>
  createHandler(
    {
      params: deleteUserSchema,
    },
    async ({ logger, params }) => {
      const { id } = params;
      const user = await deps.userService.findById(id);
      if (!user) {
        throw new NotFoundError('User', id);
      }

      await deps.userService.delete(id);

      logger.info('User deleted', { userId: id });

      return ApiResult.noContent();
    }
  );
