import { Router } from 'express';
import { registerRouteGroups } from './builder';
import { createHealthRoutes } from './health.routes';
import { createUserRoutes } from './user.routes';
import { getHealthController, getUserController } from '../container';

export function createRouter(): Router {
  const router = Router();

  // Get controllers from DI container
  const healthController = getHealthController();
  const userController = getUserController();

  // Create route groups
  const routeGroups = [
    createHealthRoutes(healthController),
    createUserRoutes(userController),
  ];

  // Register all route groups
  registerRouteGroups(router, routeGroups);

  return router;
}
