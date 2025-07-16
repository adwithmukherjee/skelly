import { logger } from '@skelly/utils';
import { createApp } from './app';
import { config } from './config';
import { initializeContainer } from './container';

async function start() {
  try {
    // Initialize dependency injection container
    initializeContainer();
    
    const app = createApp();
    const port = parseInt(config.PORT, 10);

    const server = app.listen(port, () => {
      logger.info(`API server started`, {
        port,
        environment: config.NODE_ENV,
        pid: process.pid,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      process.exit(1);
    });

    process.on('unhandledRejection', (error) => {
      logger.error('Unhandled rejection', { error });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

start();