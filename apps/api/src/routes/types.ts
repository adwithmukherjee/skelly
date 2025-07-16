import { RequestHandler } from 'express';
import { z } from 'zod';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: RequestHandler;
  middleware?: RequestHandler[];
  validation?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  };
  description?: string;
  tags?: string[];
}

export interface RouteGroup {
  prefix: string;
  routes: RouteDefinition[];
  middleware?: RequestHandler[];
  description?: string;
}