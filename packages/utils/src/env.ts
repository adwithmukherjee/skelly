import { z } from 'zod';
import { logger } from './logger';

const createEnvSchema = () =>
  z.object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    LOG_LEVEL: z
      .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
      .default('info'),
    PORT: z
      .string()
      .transform((val) => parseInt(val, 10))
      .default('3000'),
    DATABASE_URL: z.string().url().optional(),
    REDIS_URL: z.string().url().optional(),
    JWT_SECRET: z.string().min(32).optional(),
    JWT_EXPIRES_IN: z.string().default('7d'),
    AWS_REGION: z.string().default('us-east-1'),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    SQS_QUEUE_URL: z.string().url().optional(),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    API_BASE_URL: z.string().url().optional(),
  });

export type Env = z.infer<ReturnType<typeof createEnvSchema>>;

let cachedEnv: Env | undefined;

export const validateEnv = (
  processEnv: Record<string, string | undefined> = process.env
): Env => {
  // Skip cache in test environment to allow mocking
  if (cachedEnv && process.env.NODE_ENV !== 'test') {
    return cachedEnv;
  }

  try {
    const schema = createEnvSchema();
    const parsed = schema.parse(processEnv);
    cachedEnv = parsed;

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
};

export const env = validateEnv();

export const requireEnv = (key: keyof Env): string => {
  const value = env[key];

  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }

  return String(value);
};
