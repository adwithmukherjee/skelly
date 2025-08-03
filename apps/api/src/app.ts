import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import {
  requestId,
  requestLogger,
  errorHandler,
  notFoundHandler,
} from './middleware';
import { createRouter } from './routes';
import { isDevelopment } from './config';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: isDevelopment() ? '*' : process.env.ALLOWED_ORIGINS?.split(','),
      credentials: true,
    })
  );

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request ID and logging
  app.use(requestId);
  app.use(requestLogger);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment() ? 1000 : 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Routes
  app.use(createRouter());

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
