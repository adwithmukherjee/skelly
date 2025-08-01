import { z } from 'zod';
import { ApiResult, createHandler } from '../../core';
import { HealthControllerDeps } from './deps';

export const checkHealthSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string(),
  uptime: z.number(),
  services: z.object({
    database: z.object({
      status: z.enum(['connected', 'disconnected']),
      latency: z.number().optional(),
    }),
  }),
});

type HealthCheckResponse = z.infer<typeof checkHealthSchema>;

export function createCheckHealthHandler(deps: HealthControllerDeps) {
  return createHandler(
    {
      response: checkHealthSchema,
    },
    async ({ logger }) => {
      try {
        // Check database connection
        const dbStartTime = Date.now();
        const isConnected = await deps.checkDatabaseConnection();
        const dbLatency = Date.now() - dbStartTime;

        if (isConnected) {
          const response: HealthCheckResponse = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: {
              database: {
                status: 'connected',
                latency: dbLatency,
              },
            },
          };

          logger.info('Health check passed', { dbLatency });
          return ApiResult.success(response);
        } else {
          throw new Error('Database connection check failed');
        }
      } catch (error) {
        logger.error('Health check failed', { error });

        const response: HealthCheckResponse = {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          services: {
            database: {
              status: 'disconnected',
            },
          },
        };

        return ApiResult.error(response, 503);
      }
    }
  );
}
