#!/usr/bin/env node

/**
 * Script to generate OpenAPI documentation from route definitions
 * This analyzes the actual routes and their handlers to generate complete documentation
 */

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { RouteGroup, Handler } from '../core';
import { createUserRoutes } from '../routes/user.routes';
import { createHealthRoutes } from '../routes/health.routes';

// Mock dependencies for OpenAPI generation
const mockDeps = {} as any;

// OpenAPI document structure
interface OpenAPIDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, Record<string, any>>;
  components?: {
    schemas?: Record<string, any>;
  };
}

// Convert our HttpMethod to OpenAPI operation
function httpMethodToOperation(method: string): string {
  return method.toLowerCase();
}

// Extract schema information from Handler
function extractHandlerSchemas(handler: Handler): {
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  body?: z.ZodTypeAny;
  response?: z.ZodTypeAny;
} {
  return {
    query: handler.options.query,
    params: handler.options.params,
    body: handler.options.body,
    response: handler.options.response,
  };
}

// Convert Zod schema to OpenAPI schema
function zodToOpenAPISchema(schema: z.ZodTypeAny): any {
  const jsonSchema = zodToJsonSchema(schema, {
    target: 'openApi3',
    $refStrategy: 'none',
  });

  // Clean up the schema
  if (typeof jsonSchema === 'object' && jsonSchema !== null) {
    // Remove $schema property if present
    const { $schema, ...cleanSchema } = jsonSchema as any;
    return cleanSchema;
  }

  return jsonSchema;
}

// Generate parameter objects for OpenAPI
function generateParameters(
  params?: z.ZodTypeAny,
  query?: z.ZodTypeAny
): Array<any> {
  const parameters: Array<any> = [];

  if (params && params instanceof z.ZodObject) {
    const shape = params.shape;
    for (const [key, schema] of Object.entries(shape)) {
      const jsonSchema = zodToOpenAPISchema(schema as z.ZodTypeAny);
      parameters.push({
        name: key,
        in: 'path',
        required: true,
        schema: jsonSchema,
        description: (schema as any).description || `${key} parameter`,
      });
    }
  }

  if (query && query instanceof z.ZodObject) {
    const shape = query.shape;
    for (const [key, schema] of Object.entries(shape)) {
      const jsonSchema = zodToOpenAPISchema(schema as z.ZodTypeAny);
      const isOptional = schema instanceof z.ZodOptional;
      parameters.push({
        name: key,
        in: 'query',
        required: !isOptional,
        schema: jsonSchema,
        description: (schema as any).description || `${key} query parameter`,
      });
    }
  }

  return parameters;
}

// Generate request body for OpenAPI
function generateRequestBody(bodySchema?: z.ZodTypeAny): any {
  if (!bodySchema) return undefined;

  return {
    required: true,
    content: {
      'application/json': {
        schema: zodToOpenAPISchema(bodySchema),
      },
    },
  };
}

// Generate responses for OpenAPI
function generateResponses(responseSchema?: z.ZodTypeAny): any {
  const responses: Record<string, any> = {};

  // Success response
  if (responseSchema) {
    responses['200'] = {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: zodToOpenAPISchema(responseSchema),
        },
      },
    };
  } else {
    responses['200'] = {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    };
  }

  // Add common error responses
  responses['400'] = {
    description: 'Bad Request',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                details: { type: 'object' },
              },
            },
          },
        },
      },
    },
  };

  responses['404'] = {
    description: 'Not Found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                resource: { type: 'string' },
                id: { type: 'string' },
              },
            },
          },
        },
      },
    },
  };

  responses['500'] = {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                stack: { type: 'string' },
              },
            },
          },
        },
      },
    },
  };

  return responses;
}

// Process a route group and add to OpenAPI paths
function processRouteGroup(
  routeGroup: RouteGroup,
  paths: Record<string, Record<string, any>>
): void {
  for (const route of routeGroup.routes) {
    const fullPath = `${routeGroup.prefix}${route.path}`.replace(
      /\/:(\w+)/g,
      '/{$1}'
    );

    if (!paths[fullPath]) {
      paths[fullPath] = {};
    }

    const operation = httpMethodToOperation(route.method);
    const schemas = extractHandlerSchemas(route.handler);

    const operationObject: any = {
      summary: route.description || `${route.method.toUpperCase()} ${fullPath}`,
      operationId: `${route.method}${fullPath.replace(/[^a-zA-Z0-9]/g, '')}`,
      tags: route.tags || [routeGroup.prefix.slice(1)], // Remove leading slash for tag
    };

    // Add parameters
    const parameters = generateParameters(schemas.params, schemas.query);
    if (parameters.length > 0) {
      operationObject.parameters = parameters;
    }

    // Add request body
    const requestBody = generateRequestBody(schemas.body);
    if (requestBody) {
      operationObject.requestBody = requestBody;
    }

    // Add responses
    operationObject.responses = generateResponses(schemas.response);

    paths[fullPath][operation] = operationObject;
  }
}

// Generate the complete OpenAPI document
function generateOpenAPIDocument(): OpenAPIDocument {
  const document: OpenAPIDocument = {
    openapi: '3.0.3',
    info: {
      title: 'Skelly API',
      version: '1.0.0',
      description: 'API documentation for Skelly application',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    paths: {},
  };

  // Get all route groups
  const routeGroups = [
    createHealthRoutes(mockDeps),
    createUserRoutes(mockDeps),
    // Add more route groups here as they're created
  ];

  // Process each route group
  for (const group of routeGroups) {
    processRouteGroup(group, document.paths);
  }

  return document;
}

// Main execution
const openAPIDoc = generateOpenAPIDocument();

// Write to file
const outputPath = path.join(__dirname, '../../openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(openAPIDoc, null, 2));

console.log(`✅ OpenAPI documentation generated at: ${outputPath}`);
console.log(`📊 Statistics:`);
console.log(`   - Paths: ${Object.keys(openAPIDoc.paths).length}`);
console.log(
  `   - Operations: ${Object.values(openAPIDoc.paths).reduce(
    (acc, path) => acc + Object.keys(path).length,
    0
  )}`
);
console.log(`📖 View documentation at: http://localhost:3000/docs`);
