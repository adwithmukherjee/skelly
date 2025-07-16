import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import postgres from 'postgres';
import { createEnv, logger } from '@skelly/utils';
import { z } from 'zod';
import { QueryError, TransactionError } from './errors';

// Define migration-specific environment schema
const migrationEnv = createEnv((base) => ({
  ...base.shape,
  DATABASE_URL: z.string().url(),
}));

const MIGRATIONS_TABLE = 'migrations';
const MIGRATIONS_PATH = join(__dirname, '../migrations');
const UP_MARKER = '-- +migrate Up';
const DOWN_MARKER = '-- +migrate Down';

interface Migration {
  id: number;
  name: string;
  applied_at: Date;
}

interface ParsedMigration {
  up: string;
  down: string;
}

export class Migrator {
  private sql: postgres.Sql;

  constructor(connectionString?: string) {
    const dbUrl = connectionString || migrationEnv.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required for migrations');
    }

    this.sql = postgres(dbUrl, {
      max: 1,
      onnotice: (notice) => logger.debug('Migration notice:', notice),
    });
  }

  async close() {
    await this.sql.end();
  }

  async initialize() {
    try {
      await this.sql`
        CREATE TABLE IF NOT EXISTS ${this.sql(MIGRATIONS_TABLE)} (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      logger.info('Migrations table initialized');
    } catch (error) {
      throw new QueryError(
        'Failed to create migrations table',
        'CREATE TABLE migrations'
      );
    }
  }

  async getAppliedMigrations(): Promise<Set<string>> {
    const rows = await this.sql<Migration[]>`
      SELECT name FROM ${this.sql(MIGRATIONS_TABLE)} ORDER BY id
    `;
    return new Set(rows.map((r) => r.name));
  }

  async getMigrationFiles(): Promise<string[]> {
    const files = await readdir(MIGRATIONS_PATH);
    return files.filter((f) => f.endsWith('.sql')).sort(); // Ensures chronological order
  }

  parseMigration(content: string): ParsedMigration {
    const upIndex = content.indexOf(UP_MARKER);
    const downIndex = content.indexOf(DOWN_MARKER);

    if (upIndex === -1) {
      throw new Error('Migration missing "-- +migrate Up" marker');
    }

    if (downIndex === -1) {
      throw new Error('Migration missing "-- +migrate Down" marker');
    }

    const up = content.substring(upIndex + UP_MARKER.length, downIndex).trim();

    const down = content.substring(downIndex + DOWN_MARKER.length).trim();

    if (!up) {
      throw new Error('Migration has empty Up section');
    }

    if (!down) {
      throw new Error('Migration has empty Down section');
    }

    return { up, down };
  }

  async runMigration(filename: string, direction: 'up' | 'down' = 'up') {
    const filepath = join(MIGRATIONS_PATH, filename);
    const content = await readFile(filepath, 'utf-8');
    const parsed = this.parseMigration(content);
    const sql = direction === 'up' ? parsed.up : parsed.down;

    try {
      await this.sql.begin(async (tx) => {
        // Run the migration
        await tx.unsafe(sql);

        if (direction === 'up') {
          // Record the migration
          await tx`
            INSERT INTO ${tx(MIGRATIONS_TABLE)} (name)
            VALUES (${filename})
          `;
        } else {
          // Remove the migration record
          await tx`
            DELETE FROM ${tx(MIGRATIONS_TABLE)}
            WHERE name = ${filename}
          `;
        }
      });

      logger.info(`Migration ${direction}: ${filename}`);
    } catch (error) {
      throw new TransactionError(
        `Failed to ${direction} migration: ${filename}`,
        { error }
      );
    }
  }

  async up() {
    await this.initialize();

    const applied = await this.getAppliedMigrations();
    const files = await this.getMigrationFiles();
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info(`Found ${pending.length} pending migrations`);

    for (const file of pending) {
      await this.runMigration(file, 'up');
    }

    logger.info('All migrations completed successfully');
  }

  async down(steps: number = 1) {
    await this.initialize();

    const applied = await this.getAppliedMigrations();

    if (applied.size === 0) {
      logger.info('No migrations to rollback');
      return;
    }

    // Get applied migrations in reverse order
    const appliedList = Array.from(applied).sort().reverse();
    const toRollback = appliedList.slice(0, steps);

    logger.info(`Rolling back ${toRollback.length} migration(s)`);

    for (const file of toRollback) {
      await this.runMigration(file, 'down');
    }

    logger.info('Rollback completed successfully');
  }

  async status() {
    await this.initialize();

    const applied = await this.getAppliedMigrations();
    const files = await this.getMigrationFiles();

    console.log('\nMigration Status:');
    console.log('=================\n');

    for (const file of files) {
      const status = applied.has(file) ? '✓' : '✗';
      console.log(`${status} ${file}`);
    }

    const pending = files.filter((f) => !applied.has(f));
    console.log(
      `\nTotal: ${files.length} | Applied: ${applied.size} | Pending: ${pending.length}`
    );
  }
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];
  const steps = process.argv[3] ? parseInt(process.argv[3], 10) : 1;

  const migrator = new Migrator();

  const run = async () => {
    try {
      switch (command) {
        case 'up':
          await migrator.up();
          break;
        case 'down':
          await migrator.down(steps);
          break;
        case 'status':
          await migrator.status();
          break;
        default:
          console.log('Usage: tsx migrate.ts [up|down|status] [steps]');
          console.log('  up       Run all pending migrations');
          console.log('  down     Rollback migrations (default: 1 step)');
          console.log('  status   Show migration status');
          process.exit(1);
      }
    } catch (error) {
      logger.error('Migration failed', { error });
      process.exit(1);
    } finally {
      await migrator.close();
    }
  };

  run();
}
