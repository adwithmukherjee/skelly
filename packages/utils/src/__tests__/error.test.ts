import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ExternalServiceError,
  isAppError,
  handleError,
} from '../error';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an app error with correct properties', () => {
      const error = new AppError('Test error', 'TEST_ERROR', 500, {
        foo: 'bar',
      });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ foo: 'bar' });
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError('Test error', 'TEST_ERROR', 500);
      const json = error.toJSON();

      expect(json).toHaveProperty('name', 'AppError');
      expect(json).toHaveProperty('message', 'Test error');
      expect(json).toHaveProperty('code', 'TEST_ERROR');
      expect(json).toHaveProperty('statusCode', 500);

      if (process.env.NODE_ENV === 'development') {
        expect(json).toHaveProperty('stack');
      }
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('NotFoundError', () => {
    it('should format message with resource and identifier', () => {
      const error = new NotFoundError('User', '123');

      expect(error.message).toBe('User with identifier 123 not found');
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ resource: 'User', identifier: '123' });
    });

    it('should format message with just resource', () => {
      const error = new NotFoundError('Users');

      expect(error.message).toBe('Users not found');
      expect(error.details).toEqual({
        resource: 'Users',
        identifier: undefined,
      });
    });
  });

  describe('RateLimitError', () => {
    it('should include retry after if provided', () => {
      const error = new RateLimitError(60);

      expect(error.statusCode).toBe(429);
      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });

  describe('ExternalServiceError', () => {
    it('should include service name and original error', () => {
      const originalError = new Error('Connection timeout');
      const error = new ExternalServiceError('PaymentGateway', originalError);

      expect(error.message).toBe('External service PaymentGateway failed');
      expect(error.statusCode).toBe(502);
      expect(error.details).toEqual({
        service: 'PaymentGateway',
        originalError: 'Connection timeout',
      });
    });
  });

  describe('Error utilities', () => {
    it('should identify AppError instances', () => {
      const appError = new AppError('Test', 'TEST', 500);
      const normalError = new Error('Test');

      expect(isAppError(appError)).toBe(true);
      expect(isAppError(normalError)).toBe(false);
      expect(isAppError('not an error')).toBe(false);
    });

    it('should handle different error types', () => {
      const appError = new ValidationError('Invalid');
      const normalError = new Error('Something went wrong');
      const unknownError = 'String error';

      expect(handleError(appError)).toBe(appError);

      const handledNormal = handleError(normalError);
      expect(handledNormal).toBeInstanceOf(AppError);
      expect(handledNormal.message).toBe('Something went wrong');
      expect(handledNormal.isOperational).toBe(false);

      const handledUnknown = handleError(unknownError);
      expect(handledUnknown.message).toBe('An unknown error occurred');
      expect(handledUnknown.code).toBe('UNKNOWN_ERROR');
    });
  });
});
