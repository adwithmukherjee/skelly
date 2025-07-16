import { Router, RequestHandler } from 'express';
import { RouteGroup, RouteDefinition } from './types';
import { ValidationError } from '@skelly/utils';

/**
 * Creates validation middleware from route definition
 */
function createValidationMiddleware(
  route: RouteDefinition
): RequestHandler | null {
  if (!route.validation) return null;

  return (req, _res, next) => {
    try {
      if (route.validation?.body) {
        const result = route.validation.body.safeParse(req.body);
        if (!result.success) {
          throw new ValidationError('Invalid request body', {
            errors: result.error.flatten(),
          });
        }
        req.body = result.data;
      }

      if (route.validation?.query) {
        const result = route.validation.query.safeParse(req.query);
        if (!result.success) {
          throw new ValidationError('Invalid query parameters', {
            errors: result.error.flatten(),
          });
        }
        req.query = result.data as any;
      }

      if (route.validation?.params) {
        const result = route.validation.params.safeParse(req.params);
        if (!result.success) {
          throw new ValidationError('Invalid path parameters', {
            errors: result.error.flatten(),
          });
        }
        req.params = result.data as any;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

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

    // Add validation middleware
    const validationMiddleware = createValidationMiddleware(route);
    if (validationMiddleware) {
      handlers.push(validationMiddleware);
    }

    // Add the main handler
    handlers.push(route.handler);

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
