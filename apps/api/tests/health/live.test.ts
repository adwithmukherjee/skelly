import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Application } from 'express';
import { initializeTestApplication } from '../utils';

describe('GET /health/live', () => {
  let app: Application;

  beforeAll(async () => {
    const res = await initializeTestApplication();
    app = res.app;
  });

  afterAll(async () => {
    // Clean up any open handles
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('should return alive status with process information', async () => {
    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        alive: true,
        pid: expect.any(Number),
        uptime: expect.any(Number),
      },
    });

    // Should have request ID header
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should include valid process information', async () => {
    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);

    // Validate PID
    expect(response.body.data.pid).toBeDefined();
    expect(typeof response.body.data.pid).toBe('number');
    expect(response.body.data.pid).toBeGreaterThan(0);
    expect(response.body.data.pid).toBe(process.pid);

    // Validate uptime
    expect(response.body.data.uptime).toBeDefined();
    expect(typeof response.body.data.uptime).toBe('number');
    expect(response.body.data.uptime).toBeGreaterThan(0);
  });

  it('should be extremely lightweight and fast', async () => {
    const startTime = Date.now();
    const response = await request(app).get('/health/live');
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(response.status).toBe(200);
    // Liveness checks should be very fast (under 50ms)
    // They should not perform any external checks
    expect(responseTime).toBeLessThan(50);
  });

  it('should be idempotent and always return success', async () => {
    // Make multiple requests to ensure consistency
    const responses = await Promise.all([
      request(app).get('/health/live'),
      request(app).get('/health/live'),
      request(app).get('/health/live'),
      request(app).get('/health/live'),
      request(app).get('/health/live'),
    ]);

    // All should be successful
    responses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alive).toBe(true);
    });

    // Each should have unique request IDs
    const requestIds = responses.map((r) => r.headers['x-request-id']);
    const uniqueIds = new Set(requestIds);
    expect(uniqueIds.size).toBe(5);
  });

  it('should have increasing uptime values', async () => {
    const response1 = await request(app).get('/health/live');

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));

    const response2 = await request(app).get('/health/live');

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);

    // Uptime should increase
    expect(response2.body.data.uptime).toBeGreaterThan(
      response1.body.data.uptime
    );
  });

  it('should not perform any external checks', async () => {
    // This test verifies that liveness check doesn't depend on external services
    // by checking that it always returns success regardless of database state
    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body.data.alive).toBe(true);

    // Should not contain any service health information
    expect(response.body.data.services).toBeUndefined();
    expect(response.body.data.database).toBeUndefined();
  });
});
