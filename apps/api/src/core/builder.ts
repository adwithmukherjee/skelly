import { Router, RequestHandler } from 'express';
import { RouteGroup } from './types';

/**
 * Builds Express router from route group definition
 */
export function buildRouter(routeGroup: RouteGroup): Router {
  const router = Router();

  // Apply group-level middleware if any
  if (routeGroup.middleware) {
    router.use(...routeGroup.middleware);
  }

  // Register each route
  for (const route of routeGroup.routes) {
    const handlers: RequestHandler[] = [];

    // Add route-specific middleware
    if (route.middleware) {
      handlers.push(...route.middleware);
    }

    // Add the main handler
    handlers.push(route.handler.http);

    // Register the route
    router[route.method](route.path, ...handlers);
  }

  return router;
}

/**
 * Registers multiple route groups on an Express app/router
 */
export function registerRouteGroups(
  app: Router,
  routeGroups: RouteGroup[]
): void {
  for (const group of routeGroups) {
    const router = buildRouter(group);
    app.use(group.prefix, router);
  }
}
