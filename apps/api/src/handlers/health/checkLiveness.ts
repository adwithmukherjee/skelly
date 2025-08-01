import { createHandler, ApiResult } from '../../core';
import { HealthControllerDeps } from './deps';

export function createCheckLivenessHandler(_deps: HealthControllerDeps) {
  return createHandler(async ({ logger }) => {
    logger.info('Liveness check passed');

    return ApiResult.success({
      alive: true,
      pid: process.pid,
      uptime: process.uptime(),
    });
  });
}
