import { createApp } from '../src/app';
import { initializeContainer } from '../src/container';
import { testDbClient, testRunMigrations } from '@skelly/db';
import { initializeConfig } from '../src/config';

export const initializeTestApplication = async () => {
  initializeConfig({
    NODE_ENV: 'test',
  });

  // Create test database and run migrations
  await testDbClient.create();

  await testRunMigrations();

  await initializeContainer({
    dbClient: testDbClient,
  });

  const app = createApp();
  const db = await testDbClient.get();

  return { app, db };
};
