import { z } from 'zod';
import { logger } from './logger';

/**
 * Base environment variables that all apps share
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info'),
});

/**
 * Common optional environment variables that apps can opt into
 */
export const commonEnvSchema = z.object({
  PORT: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  SQS_QUEUE_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().optional(),
  API_BASE_URL: z.string().url().optional(),
});

/**
 * Parse and validate environment variables with a custom schema
 * 
 * @example
 * ```typescript
 * const envSchema = z.object({
 *   PORT: z.string().default('3000'),
 *   API_KEY: z.string(),
 *   ...baseEnvSchema.shape,
 * });
 * 
 * export const config = parseEnv(envSchema);
 * ```
 */
export function parseEnv<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  processEnv: Record<string, string | undefined> = process.env
): z.infer<z.ZodObject<T>> {
  try {
    const parsed = schema.parse(processEnv);
    logger.debug('Environment variables validated successfully');
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter((err) => err.message === 'Required')
        .map((err) => err.path.join('.'));

      const invalidVars = error.errors
        .filter((err) => err.message !== 'Required')
        .map((err) => `${err.path.join('.')}: ${err.message}`);

      logger.error('Environment validation failed', {
        missing: missingVars,
        invalid: invalidVars,
      });

      throw new Error(
        `Environment validation failed:\n` +
          (missingVars.length > 0
            ? `Missing: ${missingVars.join(', ')}\n`
            : '') +
          (invalidVars.length > 0 ? `Invalid: ${invalidVars.join(', ')}` : '')
      );
    }

    throw error;
  }
}

/**
 * Helper to create a validated env object with base schema
 * 
 * @example
 * ```typescript
 * export const config = createEnv((base) => ({
 *   ...base.shape,
 *   PORT: z.string().default('3000'),
 *   API_KEY: z.string(),
 * }));
 * ```
 */
export function createEnv<T extends z.ZodRawShape>(
  schemaFn: (base: typeof baseEnvSchema) => T,
  processEnv: Record<string, string | undefined> = process.env
): z.infer<z.ZodObject<T>> {
  const schema = z.object(schemaFn(baseEnvSchema));
  return parseEnv(schema, processEnv);
}
