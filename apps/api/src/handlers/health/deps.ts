import type { checkDatabaseConnection } from '@skelly/db';

export interface HealthControllerDeps {
  checkDatabaseConnection: typeof checkDatabaseConnection;
}
