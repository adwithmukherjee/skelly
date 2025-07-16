import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { parseEnv, createEnv, baseEnvSchema, commonEnvSchema } from '../env';

describe('Environment Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the module cache to reset cachedEnv
    vi.resetModules();
  });

  describe('parseEnv', () => {
    it('should validate environment variables with a custom schema', () => {
      const schema = z.object({
        NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
        PORT: z.string().default('3000'),
        API_KEY: z.string(),
      });

      const mockEnv = {
        NODE_ENV: 'test',
        PORT: '8080',
        API_KEY: 'secret-key',
      };

      const result = parseEnv(schema, mockEnv);

      expect(result.NODE_ENV).toBe('test');
      expect(result.PORT).toBe('8080');
      expect(result.API_KEY).toBe('secret-key');
    });

    it('should use default values when not provided', () => {
      const schema = z.object({
        NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
        PORT: z.string().default('3000'),
      });

      const result = parseEnv(schema, {});

      expect(result.NODE_ENV).toBe('development');
      expect(result.PORT).toBe('3000');
    });

    it('should throw on invalid values', () => {
      const schema = z.object({
        NODE_ENV: z.enum(['development', 'test', 'production']),
      });

      const mockEnv = {
        NODE_ENV: 'invalid-env',
      };

      expect(() => parseEnv(schema, mockEnv)).toThrow('Environment validation failed');
    });

    it('should throw on missing required values', () => {
      const schema = z.object({
        API_KEY: z.string(),
      });

      expect(() => parseEnv(schema, {})).toThrow('Environment validation failed');
    });
  });

  describe('createEnv', () => {
    it('should include base environment variables', () => {
      const result = createEnv((base) => ({
        ...base.shape,
        PORT: z.string().default('3000'),
      }), {});

      expect(result.NODE_ENV).toBe('development');
      expect(result.LOG_LEVEL).toBe('info');
      expect(result.PORT).toBe('3000');
    });

    it('should override base defaults', () => {
      const mockEnv = {
        NODE_ENV: 'production',
        LOG_LEVEL: 'error',
      };

      const result = createEnv((base) => ({
        ...base.shape,
      }), mockEnv);

      expect(result.NODE_ENV).toBe('production');
      expect(result.LOG_LEVEL).toBe('error');
    });

    it('should add custom fields', () => {
      const result = createEnv((base) => ({
        ...base.shape,
        API_URL: z.string().url(),
        MAX_CONNECTIONS: z.string().transform(Number).default('10'),
      }), {
        API_URL: 'https://api.example.com',
      });

      expect(result.API_URL).toBe('https://api.example.com');
      expect(result.MAX_CONNECTIONS).toBe(10);
    });
  });

  describe('baseEnvSchema', () => {
    it('should validate NODE_ENV values', () => {
      const valid = ['development', 'test', 'production'];
      
      valid.forEach(env => {
        const result = baseEnvSchema.parse({ NODE_ENV: env });
        expect(result.NODE_ENV).toBe(env);
      });

      expect(() => baseEnvSchema.parse({ NODE_ENV: 'invalid' })).toThrow();
    });

    it('should validate LOG_LEVEL values', () => {
      const valid = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
      
      valid.forEach(level => {
        const result = baseEnvSchema.parse({ LOG_LEVEL: level });
        expect(result.LOG_LEVEL).toBe(level);
      });

      expect(() => baseEnvSchema.parse({ LOG_LEVEL: 'invalid' })).toThrow();
    });
  });

  describe('commonEnvSchema', () => {
    it('should validate optional URL fields', () => {
      const schema = z.object({
        ...commonEnvSchema.shape,
      });

      const mockEnv = {
        DATABASE_URL: 'postgresql://localhost:5432/test',
        REDIS_URL: 'redis://localhost:6379',
        API_BASE_URL: 'https://api.example.com',
      };

      const result = schema.parse(mockEnv);

      expect(result.DATABASE_URL).toBe('postgresql://localhost:5432/test');
      expect(result.REDIS_URL).toBe('redis://localhost:6379');
      expect(result.API_BASE_URL).toBe('https://api.example.com');
    });

    it('should reject invalid URLs', () => {
      const schema = z.object({
        ...commonEnvSchema.shape,
      });

      expect(() => schema.parse({ DATABASE_URL: 'not-a-url' })).toThrow();
      expect(() => schema.parse({ REDIS_URL: 'invalid' })).toThrow();
    });

    it('should validate JWT_SECRET minimum length', () => {
      const schema = z.object({
        ...commonEnvSchema.shape,
      });

      expect(() => schema.parse({ JWT_SECRET: 'too-short' })).toThrow();

      const result = schema.parse({ JWT_SECRET: 'a'.repeat(32) });
      expect(result.JWT_SECRET).toBe('a'.repeat(32));
    });
  });
});
