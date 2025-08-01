import { z } from 'zod';
import { createHandler, ApiResult } from '../../core';
import { UserControllerDeps } from './deps';

export const listUsersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  role: z.enum(['user', 'admin']).optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersSchema>;

export const listUsersHandler = (deps: UserControllerDeps) =>
  createHandler(
    {
      query: listUsersSchema,
    },
    async ({ logger, query }) => {
      const { page, limit, role } = query;
      const offset = (page - 1) * limit;

      const { users, total } = await deps.userService.list({
        offset,
        limit,
        role,
      });

      logger.info('Users listed', {
        count: users.length,
        total,
        page,
        limit,
        role: role || 'all',
      });

      return ApiResult.paginated(users, { page, limit, total });
    }
  );
