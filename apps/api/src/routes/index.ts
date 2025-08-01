import { Router } from 'express';
import { registerRouteGroups } from '../core';
import { createHealthRoutes } from './health.routes';
import { createUserRoutes } from './user.routes';
import { getHealthDeps, getUserDeps } from '../container';

export function createRouter(): Router {
  const router = Router();

  // Get dependencies from DI container
  const healthDeps = getHealthDeps();
  const userDeps = getUserDeps();

  // Create route groups
  const routeGroups = [
    createHealthRoutes(healthDeps),
    createUserRoutes(userDeps),
  ];

  // Register all route groups
  registerRouteGroups(router, routeGroups);

  return router;
}
