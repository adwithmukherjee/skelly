import type { DbClient } from '@skelly/db';

export interface HealthControllerDeps {
  checkDatabaseConnection: DbClient['check'];
}
