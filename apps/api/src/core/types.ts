import { RequestHandler } from 'express';
import { Handler } from './handler';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: Handler;
  middleware?: RequestHandler[];
  description?: string;
  tags?: string[];
}

export interface RouteGroup {
  prefix: string;
  routes: RouteDefinition[];
  middleware?: RequestHandler[];
  description?: string;
}
