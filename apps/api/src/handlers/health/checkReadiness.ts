import { z } from 'zod';
import { createHandler, ApiResult } from '../../core';
import { HealthControllerDeps } from './deps';

export const checkReadinessSchema = z.object({
  ready: z.boolean(),
});

export function createCheckReadinessHandler(deps: HealthControllerDeps) {
  return createHandler(
    { response: checkReadinessSchema },
    async ({ logger }) => {
      const isReady = await deps.checkDatabaseConnection();

      if (isReady) {
        logger.info('Readiness check passed');
        return ApiResult.success({ ready: true });
      } else {
        logger.warn('Readiness check failed - database not connected');
        return ApiResult.error({ ready: false }, 503);
      }
    }
  );
}
