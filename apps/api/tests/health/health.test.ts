import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Application } from 'express';
import { initializeTestApplication } from '../utils';

describe('GET /health', () => {
  let app: Application;

  beforeAll(async () => {
    const res = await initializeTestApplication();
    app = res.app;
  });

  afterAll(async () => {
    // Clean up any open handles
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('should return healthy status when database is available', async () => {
    const response = await request(app).get('/health');

    // Log the response for debugging
    if (response.status !== 200) {
      console.log('Health check response:', response.body);
      console.log('Environment DATABASE_URL:', process.env.DATABASE_URL);
    }

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'healthy',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
        services: {
          database: {
            status: 'connected',
            latency: expect.any(Number),
          },
        },
      },
    });

    // Should have request ID header
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should return consistent health check structure', async () => {
    // Make multiple requests to ensure consistency
    const responses = await Promise.all([
      request(app).get('/health'),
      request(app).get('/health'),
      request(app).get('/health'),
    ]);

    // All should be successful
    responses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });

    // Each should have unique request IDs
    const requestIds = responses.map((r) => r.headers['x-request-id']);
    const uniqueIds = new Set(requestIds);
    expect(uniqueIds.size).toBe(3);
  });

  it('should include service health metrics', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.data.services).toBeDefined();
    expect(response.body.data.services.database).toBeDefined();
    expect(response.body.data.services.database.status).toBe('connected');
    expect(typeof response.body.data.services.database.latency).toBe('number');
    expect(response.body.data.services.database.latency).toBeGreaterThanOrEqual(
      0
    );
  });

  it('should include process information', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(typeof response.body.data.uptime).toBe('number');
    expect(response.body.data.uptime).toBeGreaterThan(0);
    expect(response.body.data.timestamp).toBeDefined();
    expect(new Date(response.body.data.timestamp).getTime()).not.toBeNaN();
  });
});
