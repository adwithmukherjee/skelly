import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { DatabaseHealthCheck } from '../types/services';

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      latency?: number;
    };
  };
}

interface HealthControllerDeps {
  checkDatabaseConnection: DatabaseHealthCheck;
}

export class HealthController extends BaseController {
  constructor(private readonly deps: HealthControllerDeps) {
    super();
  }

  /**
   * GET /health
   * Health check endpoint that verifies service status
   */
  checkHealth = this.asyncHandler(async (req: Request, res: Response) => {
    try {
      // Check database connection
      const dbStartTime = Date.now();
      const isConnected = await this.deps.checkDatabaseConnection();
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

        this.success(res, response);
      } else {
        throw new Error('Database connection check failed');
      }
    } catch (error) {
      req.logger.error('Health check failed', { error });

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

      res.status(503).json({
        success: false,
        data: response,
      });
    }
  });

  /**
   * GET /health/ready
   * Readiness check - returns 200 if the service is ready to accept traffic
   */
  checkReadiness = this.asyncHandler(async (_req: Request, res: Response) => {
    const isReady = await this.deps.checkDatabaseConnection();

    if (isReady) {
      this.success(res, { ready: true });
    } else {
      res.status(503).json({
        success: false,
        data: { ready: false },
      });
    }
  });

  /**
   * GET /health/live
   * Liveness check - returns 200 if the service is alive
   */
  checkLiveness = this.asyncHandler(async (_req: Request, res: Response) => {
    this.success(res, {
      alive: true,
      pid: process.pid,
      uptime: process.uptime(),
    });
  });
}
