/**
 * Dependency injection container
 * Centralizes the creation and management of all services and controllers
 */

import { checkDatabaseConnection, getDatabaseClient } from '@skelly/db';
import { HealthController } from './controllers/health.controller';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';

// Services
let userService: UserService;

// Controllers
let healthController: HealthController;
let userController: UserController;

/**
 * Initialize all controllers with their dependencies
 * This function should be called once during app startup
 */
export function initializeContainer(): void {
  // Initialize services
  userService = new UserService({
    db: getDatabaseClient(),
  });

  // Initialize controllers with their dependencies
  healthController = new HealthController({
    checkDatabaseConnection,
  });

  userController = new UserController({
    userService,
  });
}

/**
 * Get controller instances
 */
export function getHealthController(): HealthController {
  if (!healthController) {
    throw new Error(
      'Container not initialized. Call initializeContainer() first.'
    );
  }
  return healthController;
}

export function getUserController(): UserController {
  if (!userController) {
    throw new Error(
      'Container not initialized. Call initializeContainer() first.'
    );
  }
  return userController;
}

// Export a function to get all route groups
export function getRouteGroups() {
  return {
    healthController: getHealthController(),
    userController: getUserController(),
  };
}
