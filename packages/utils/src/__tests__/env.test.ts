import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateEnv } from '../env';

describe('Environment Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the module cache to reset cachedEnv
    vi.resetModules();
  });

  it('should validate valid environment variables', () => {
    const mockEnv = {
      NODE_ENV: 'development',
      LOG_LEVEL: 'debug',
      PORT: '3000',
      DATABASE_URL: 'postgresql://localhost:5432/test',
    };

    const result = validateEnv(mockEnv);

    expect(result.NODE_ENV).toBe('development');
    expect(result.LOG_LEVEL).toBe('debug');
    expect(result.PORT).toBe(3000);
    expect(result.DATABASE_URL).toBe('postgresql://localhost:5432/test');
  });

  it('should use default values when not provided', () => {
    const mockEnv = {};

    const result = validateEnv(mockEnv);

    expect(result.NODE_ENV).toBe('development');
    expect(result.LOG_LEVEL).toBe('info');
    expect(result.PORT).toBe(3000);
    expect(result.JWT_EXPIRES_IN).toBe('7d');
    expect(result.AWS_REGION).toBe('us-east-1');
  });

  it('should transform PORT to number', () => {
    const mockEnv = {
      PORT: '8080',
    };

    const result = validateEnv(mockEnv);

    expect(result.PORT).toBe(8080);
    expect(typeof result.PORT).toBe('number');
  });

  it('should validate URL formats', () => {
    const mockEnv = {
      DATABASE_URL: 'not-a-url',
    };

    expect(() => validateEnv(mockEnv)).toThrow();
  });

  it('should validate enum values', () => {
    const mockEnv = {
      NODE_ENV: 'invalid-env',
    };

    expect(() => validateEnv(mockEnv)).toThrow();
  });

  it('should validate JWT_SECRET minimum length', () => {
    const mockEnv = {
      JWT_SECRET: 'too-short',
    };

    expect(() => validateEnv(mockEnv)).toThrow();

    const validEnv = {
      JWT_SECRET: 'a'.repeat(32),
    };

    const result = validateEnv(validEnv);
    expect(result.JWT_SECRET).toBe('a'.repeat(32));
  });
});
