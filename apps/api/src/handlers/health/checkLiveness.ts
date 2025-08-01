import { z } from 'zod';
import { createHandler, ApiResult } from '../../core';
import { HealthControllerDeps } from './deps';

export const checkLivenessSchema = z.object({
  alive: z.boolean(),
  pid: z.number(),
  uptime: z.number(),
});

export function createCheckLivenessHandler(_deps: HealthControllerDeps) {
  return createHandler(
    { response: checkLivenessSchema },
    async ({ logger }) => {
      logger.info('Liveness check passed');

      return ApiResult.success({
        alive: true,
        pid: process.pid,
        uptime: process.uptime(),
      });
    }
  );
}
