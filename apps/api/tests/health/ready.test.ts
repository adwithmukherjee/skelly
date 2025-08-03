import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Application } from 'express';
import { initializeTestApplication } from '../utils';

describe('GET /health/ready', () => {
  let app: Application;

  beforeAll(async () => {
    const res = await initializeTestApplication();
    app = res.app;
  });

  afterAll(async () => {
    // Clean up any open handles
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('should return ready status when database is connected', async () => {
    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        ready: true,
      },
    });

    // Should have request ID header
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should be idempotent and return consistent results', async () => {
    // Make multiple requests to ensure consistency
    const responses = await Promise.all([
      request(app).get('/health/ready'),
      request(app).get('/health/ready'),
      request(app).get('/health/ready'),
    ]);

    // All should be successful
    responses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ready).toBe(true);
    });

    // Each should have unique request IDs
    const requestIds = responses.map((r) => r.headers['x-request-id']);
    const uniqueIds = new Set(requestIds);
    expect(uniqueIds.size).toBe(3);
  });

  it('should be lightweight and respond quickly', async () => {
    const startTime = Date.now();
    const response = await request(app).get('/health/ready');
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(response.status).toBe(200);
    // Readiness checks should be fast (under 100ms)
    expect(responseTime).toBeLessThan(100);
  });

  it('should not expose sensitive information', async () => {
    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    // Should not contain database connection strings or other sensitive data
    const responseString = JSON.stringify(response.body);
    expect(responseString).not.toContain('DATABASE_URL');
    expect(responseString).not.toContain('password');
    expect(responseString).not.toContain('secret');
  });
});
