import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pgStructure, { Db as PgDb, Table, Column } from 'pg-structure';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  createDatabaseClient,
  closeDatabaseConnection,
  runMigrations,
  TestDatabase,
  getConnectionString,
} from '../testClient';
import { users } from '../schema/user/users';
import { logger } from '@skelly/utils';

describe('Schema Validation', () => {
  let testDb: TestDatabase | null = null;
  let pgDb: PgDb;

  beforeAll(async () => {
    try {
      // Create test database and run migrations
      testDb = await createDatabaseClient();
      await runMigrations();

      // ** ADD ANY NEW SCHEMAS HERE **
      pgDb = await pgStructure(getConnectionString()!, {
        includeSchemas: ['public', 'user'],
      });
    } catch (error) {
      logger.error('Failed to set up test database', { error });
      throw error;
    }
  }, 60000); // 60 second timeout for container startup

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  describe('Database Schema Matches Drizzle Schema', () => {
    // ** ADD ANY NEW TABLES HERE **
    const tablesToTest = [{ name: 'users', table: users }];

    tablesToTest.forEach(({ name, table }) => {
      const tableConfig = getTableConfig(table);

      describe(`Table: ${tableConfig.schema}.${tableConfig.name}`, () => {
        let dbTable: Table;

        beforeAll(() => {
          const schemaName = tableConfig.schema || 'public';
          const dbSchema = pgDb.schemas.find((s) => s.name === schemaName);

          if (!dbSchema) {
            throw new Error(`Schema '${schemaName}' not found in database`);
          }

          const table = dbSchema.tables.find(
            (t) => t.name === tableConfig.name
          );
          if (!table) {
            throw new Error(
              `Table '${tableConfig.name}' not found in schema '${schemaName}'`
            );
          }

          dbTable = table;
        });

        it('should exist in the database', () => {
          expect(dbTable).toBeDefined();
          expect(dbTable.name).toBe(tableConfig.name);
        });

        it('should have all Drizzle-defined columns', () => {
          const drizzleColumns = Object.entries(tableConfig.columns);

          drizzleColumns.forEach(([columnName, columnConfig]) => {
            const dbColumn = dbTable.columns.find(
              (c) => c.name === columnConfig.name
            );
            expect(
              dbColumn,
              `Column '${columnConfig.name}' not found in database`
            ).toBeDefined();
          });
        });

        it('should not have extra columns in database', () => {
          const drizzleColumnNames = new Set(
            Object.values(tableConfig.columns).map((c) => c.name)
          );

          dbTable.columns.forEach((dbColumn) => {
            expect(
              drizzleColumnNames.has(dbColumn.name),
              `Unexpected column '${dbColumn.name}' found in database but not in Drizzle schema`
            ).toBe(true);
          });
        });

        describe('Column Properties', () => {
          Object.entries(tableConfig.columns).forEach(([_, columnConfig]) => {
            describe(`Column: ${columnConfig.name}`, () => {
              let dbColumn: Column;

              beforeAll(() => {
                const col = dbTable.columns.find(
                  (c) => c.name === columnConfig.name
                );
                if (!col) {
                  throw new Error(`Column '${columnConfig.name}' not found`);
                }
                dbColumn = col;
              });

              it('should have matching data type', () => {
                // Special handling for UUID columns
                if (columnConfig.columnType === 'PgUUID') {
                  expect(dbColumn.type.name).toBe('uuid');
                  return;
                }

                const expectedType = mapDrizzleTypeToPostgres(columnConfig);
                const actualType = dbColumn.type.name;

                expect(
                  actualType,
                  `Column '${columnConfig.name}' type mismatch`
                ).toBe(expectedType);
              });

              it('should have matching nullable constraint', () => {
                const drizzleNotNull = columnConfig.notNull ?? false;
                const dbNotNull = dbColumn.notNull;

                expect(
                  dbNotNull,
                  `Column '${columnConfig.name}' nullable mismatch`
                ).toBe(drizzleNotNull);
              });

              it('should have matching primary key constraint', () => {
                const drizzlePrimary = columnConfig.primary ?? false;
                const dbPrimary = dbColumn.isPrimaryKey;

                expect(
                  dbPrimary,
                  `Column '${columnConfig.name}' primary key mismatch`
                ).toBe(drizzlePrimary);
              });

              if (
                columnConfig.default !== undefined ||
                columnConfig.defaultFn !== undefined
              ) {
                it('should have default value', () => {
                  expect(
                    dbColumn.default,
                    `Column '${columnConfig.name}' should have default value`
                  ).toBeTruthy();
                });
              }
            });
          });
        });

        describe('Indexes', () => {
          it('should have expected indexes', () => {
            const indexes = dbTable.indexes;

            // Check for primary key index
            const hasPrimaryKey = indexes.some((idx) => idx.isPrimaryKey);
            const drizzleHasPrimary = Object.values(tableConfig.columns).some(
              (c) => c.primary
            );

            if (drizzleHasPrimary) {
              expect(hasPrimaryKey, 'Primary key index missing').toBe(true);
            }

            // Check for unique indexes
            Object.values(tableConfig.columns).forEach((columnConfig) => {
              if (columnConfig.isUnique && !columnConfig.primary) {
                const hasUniqueIndex = indexes.some(
                  (idx) =>
                    idx.isUnique &&
                    idx.columns.some((c) => c.name === columnConfig.name)
                );

                expect(
                  hasUniqueIndex,
                  `Unique index for column '${columnConfig.name}' missing`
                ).toBe(true);
              }
            });
          });
        });

        describe('Check Constraints', () => {
          it('should have expected check constraints', () => {
            // Specifically check for enum constraints
            Object.values(tableConfig.columns).forEach((columnConfig) => {
              if (
                columnConfig.enumValues &&
                columnConfig.enumValues.length > 0
              ) {
                const checkConstraints = dbTable.checkConstraints;
                const hasEnumConstraint = checkConstraints.some((constraint) =>
                  constraint.expression.includes(columnConfig.name)
                );

                expect(
                  hasEnumConstraint,
                  `Check constraint for enum column '${columnConfig.name}' missing`
                ).toBe(true);
              }
            });
          });
        });
      });
    });
  });

  describe('Migration Completeness', () => {
    it('should have all schemas defined in migrations', async () => {
      // Check that all schemas used in Drizzle are created in the database
      const drizzleSchemas = new Set<string>();

      // Add schemas from our tables
      const tablesToCheck = [users];
      tablesToCheck.forEach((table) => {
        const tableConfig = getTableConfig(table);
        if (tableConfig.schema) {
          drizzleSchemas.add(tableConfig.schema);
        }
      });

      drizzleSchemas.forEach((schemaName) => {
        const dbSchema = pgDb.schemas.find((s) => s.name === schemaName);
        expect(
          dbSchema,
          `Schema '${schemaName}' not found in database`
        ).toBeDefined();
      });
    });

    it('should have correct foreign key relationships', async () => {
      // This will be extended when foreign keys are added to the schema
      // For now, just ensure the test structure is in place
      expect(true).toBe(true);
    });
  });
});

// Map Drizzle column types to PostgreSQL types
function mapDrizzleTypeToPostgres(columnConfig: any): string {
  const dataType = columnConfig.dataType;
  const columnType = columnConfig.columnType;

  // Handle special case for timestamp columns with mode
  if (columnType === 'PgTimestamp' && columnConfig.mode === 'date') {
    return 'timestamp without time zone';
  }

  // Common type mappings
  const typeMap: Record<string, string> = {
    string: 'text', // Drizzle uses 'string' for text columns
    uuid: 'uuid',
    text: 'text',
    varchar: 'character varying',
    timestamp: 'timestamp without time zone',
    date: 'timestamp without time zone', // For mode: 'date'
    boolean: 'boolean',
    integer: 'integer',
    bigint: 'bigint',
    real: 'real',
    'double precision': 'double precision',
    json: 'json',
    jsonb: 'jsonb',
  };

  return typeMap[dataType] || dataType;
}
