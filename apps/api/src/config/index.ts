import { createEnv } from '@skelly/utils';
import { z } from 'zod';

let _config: Config | null = null;

const env = (overrides: any = {}) =>
  createEnv(
    (base) => ({
      ...base.shape,
      PORT: z.string().default('3000'),
      API_PREFIX: z.string().default('/api/v1'),
      DATABASE_URL: z.string().url().optional(),
    }),
    {
      ...process.env,
      ...overrides,
    }
  );

export const initializeConfig = (overrides: any = {}) => {
  _config = env(overrides);
  return _config;
};

export const config = () => {
  if (!_config) {
    throw new Error('Config not initialized');
  }
  return _config;
};

export type Config = ReturnType<typeof env>;

export const isDevelopment = () => config().NODE_ENV === 'development';
export const isProduction = () => config().NODE_ENV === 'production';
export const isTest = () => config().NODE_ENV === 'test';
