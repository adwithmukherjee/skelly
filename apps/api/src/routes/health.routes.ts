import { RouteGroup } from '../core';
import { HealthController } from '../controllers/health.controller';

export function createHealthRoutes(controller: HealthController): RouteGroup {
  return {
    prefix: '/health',
    description: 'Health check endpoints for monitoring service status',
    routes: [
      {
        method: 'get',
        path: '/',
        handler: controller.checkHealth,
        description:
          'Main health check endpoint - checks all service dependencies',
        tags: ['health', 'monitoring'],
      },
      {
        method: 'get',
        path: '/ready',
        handler: controller.checkReadiness,
        description:
          'Readiness probe - indicates if the service is ready to accept traffic',
        tags: ['health', 'kubernetes'],
      },
      {
        method: 'get',
        path: '/live',
        handler: controller.checkLiveness,
        description: 'Liveness probe - indicates if the service is alive',
        tags: ['health', 'kubernetes'],
      },
    ],
  };
}
