import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '@skelly/db';

const router = Router();

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

router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    const dbStartTime = Date.now();
    const isConnected = await checkDatabaseConnection();
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

      res.json(response);
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

    res.status(503).json(response);
  }
});

export { router as healthRouter };