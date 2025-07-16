import { Request, Response, NextFunction } from 'express';
import { logger } from '@skelly/utils';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
      logger: typeof logger;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  
  // Create a child logger with request metadata
  req.logger = logger.child({ requestId: req.id });
  
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  req.startTime = Date.now();

  req.logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.on('finish', () => {
    const duration = Date.now() - req.startTime;

    req.logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
}