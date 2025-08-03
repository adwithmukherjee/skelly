/**
 * Dependency injection container
 * Centralizes the creation and management of all services and controllers
 */

import { UserService } from './services/user.service';
import { HealthControllerDeps } from './handlers/health';
import { UserControllerDeps } from './handlers/users';
import { DbClient, dbClient } from '@skelly/db';

// Services
let userService: UserService;

// Dependencies
let healthDeps: HealthControllerDeps;
let userDeps: UserControllerDeps;

/**
 * Initialize all dependencies
 * This function should be called once during app startup
 */
export async function initializeContainer(inputs?: { dbClient?: DbClient }) {
  // Initialize services
  const db = inputs?.dbClient ?? dbClient;

  userService = new UserService({
    db: await db.get(),
  });

  // Initialize dependencies
  healthDeps = {
    checkDatabaseConnection: db.check,
  };

  userDeps = {
    userService,
  };
}

/**
 * Get dependency instances
 */
export function getHealthDeps(): HealthControllerDeps {
  if (!healthDeps) {
    throw new Error(
      'Container not initialized. Call initializeContainer() first.'
    );
  }
  return healthDeps;
}

export function getUserDeps(): UserControllerDeps {
  if (!userDeps) {
    throw new Error(
      'Container not initialized. Call initializeContainer() first.'
    );
  }
  return userDeps;
}

// Export a function to get all route groups
export function getRouteGroups() {
  return {
    healthDeps: getHealthDeps(),
    userDeps: getUserDeps(),
  };
}
