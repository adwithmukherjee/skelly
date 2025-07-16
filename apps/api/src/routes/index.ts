import { Router } from 'express';
import { healthRouter } from './health';

export function createRouter(): Router {
  const router = Router();

  // Mount health check route (no prefix needed)
  router.use(healthRouter);

  // API routes will be mounted here with prefix
  // Example: router.use(`/api/v1/users`, userRouter);

  return router;
}