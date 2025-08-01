import { RouteGroup } from '../core';
import { createHealthHandlers, HealthControllerDeps } from '../handlers/health';

export function createHealthRoutes(deps: HealthControllerDeps): RouteGroup {
  const handlers = createHealthHandlers(deps);

  return {
    prefix: '/health',
    description: 'Health check endpoints for monitoring service status',
    routes: [
      {
        method: 'get',
        path: '/',
        handler: handlers.checkHealth,
        description:
          'Main health check endpoint - checks all service dependencies',
        tags: ['health', 'monitoring'],
      },
      {
        method: 'get',
        path: '/ready',
        handler: handlers.checkReadiness,
        description:
          'Readiness probe - indicates if the service is ready to accept traffic',
        tags: ['health', 'kubernetes'],
      },
      {
        method: 'get',
        path: '/live',
        handler: handlers.checkLiveness,
        description: 'Liveness probe - indicates if the service is alive',
        tags: ['health', 'kubernetes'],
      },
    ],
  };
}
