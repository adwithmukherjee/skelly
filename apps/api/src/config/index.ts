import { createEnv } from '@skelly/utils';
import { z } from 'zod';

export const config = createEnv((base) => ({
  ...base.shape,
  PORT: z.string().default('3000'),
  API_PREFIX: z.string().default('/api/v1'),
  DATABASE_URL: z.string().url().optional(),
}));

export type Config = typeof config;

export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';
