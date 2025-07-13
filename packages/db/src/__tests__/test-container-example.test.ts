import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase, cleanupTestDatabase, runMigrations, TestDatabase } from './test-utils';

describe('TestContainer Example', () => {
  let testDb: TestDatabase;
  
  beforeAll(async () => {
    testDb = await createTestDatabase();
    await runMigrations(testDb);
  });
  
  afterAll(async () => {
    await cleanupTestDatabase(testDb);
  });
  
  it('should connect to test database', async () => {
    const result = await testDb.sql`SELECT 1 as value`;
    expect(result[0].value).toBe(1);
  });
  
  it('should have migrations table', async () => {
    const tables = await testDb.sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'migrations'
    `;
    
    expect(tables).toHaveLength(1);
    expect(tables[0].table_name).toBe('migrations');
  });
  
  it('should have user schema', async () => {
    const schemas = await testDb.sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'user'
    `;
    
    expect(schemas).toHaveLength(1);
    expect(schemas[0].schema_name).toBe('user');
  });
  
  it('should have users table in user schema', async () => {
    const tables = await testDb.sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'user' 
      AND table_name = 'users'
    `;
    
    expect(tables).toHaveLength(1);
    expect(tables[0].table_name).toBe('users');
  });
});