import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger, ValidationError } from '@skelly/utils';
import { ApiResult } from './response';

export type HandlerFunction<TQuery, TParams, TBody, R> = (args: {
  logger: typeof logger;
  query: TQuery;
  params: TParams;
  body: TBody;
}) => Promise<ApiResult<R>>;

export interface HandlerOptions<
  TQuerySchema extends z.ZodTypeAny = z.ZodTypeAny,
  TParamsSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TBodySchema extends z.ZodTypeAny = z.ZodTypeAny,
  TResponseSchema extends z.ZodTypeAny = z.ZodTypeAny
> {
  query?: TQuerySchema;
  params?: TParamsSchema;
  body?: TBodySchema;
  response?: TResponseSchema;
}

// TODO: Add a GRPC handler or similar. So far only HTTP is supported.
export class Handler<
  TQuerySchema extends z.ZodTypeAny = z.ZodTypeAny,
  TParamsSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TBodySchema extends z.ZodTypeAny = z.ZodTypeAny,
  TResponseSchema extends z.ZodTypeAny = z.ZodTypeAny
> {
  constructor(
    public options: HandlerOptions<
      TQuerySchema,
      TParamsSchema,
      TBodySchema,
      TResponseSchema
    >,
    public http: (req: Request, res: Response, next: NextFunction) => void
  ) {}
}

/**
 * Creates a type-safe Express route handler with built-in validation
 *
 * @example
 * ```ts
 * const getUser = createHandler({
 *   params: z.object({ id: z.string().uuid() })
 * }, async ({ params, res }) => {
 *   const user = await userService.findById(params.id);
 *   res.json({ success: true, data: user });
 * });
 * ```
 */
export function createHandler<
  TQuerySchema extends z.ZodTypeAny = z.ZodTypeAny,
  TParamsSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TBodySchema extends z.ZodTypeAny = z.ZodTypeAny,
  TResponseSchema extends z.ZodTypeAny = z.ZodTypeAny
>(
  options: HandlerOptions<
    TQuerySchema,
    TParamsSchema,
    TBodySchema,
    TResponseSchema
  >,
  handler: HandlerFunction<
    TQuerySchema extends z.ZodTypeAny ? z.infer<TQuerySchema> : never,
    TParamsSchema extends z.ZodTypeAny ? z.infer<TParamsSchema> : never,
    TBodySchema extends z.ZodTypeAny ? z.infer<TBodySchema> : never,
    TResponseSchema extends z.ZodTypeAny ? z.infer<TResponseSchema> : any
  >
): Handler<TQuerySchema, TParamsSchema, TBodySchema, TResponseSchema>;

export function createHandler(
  handler: HandlerFunction<any, any, any, any>
): Handler;

export function createHandler<
  TQuerySchema extends z.ZodTypeAny = z.ZodTypeAny,
  TParamsSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TBodySchema extends z.ZodTypeAny = z.ZodTypeAny,
  TResponseSchema extends z.ZodTypeAny = z.ZodTypeAny
>(
  optionsOrHandler:
    | HandlerOptions<TQuerySchema, TParamsSchema, TBodySchema, TResponseSchema>
    | HandlerFunction<any, any, any, any>,
  handler?: HandlerFunction<any, any, any, any>
) {
  // Handle overload signatures
  const isOptions = typeof optionsOrHandler === 'object';
  const actualOptions = isOptions ? optionsOrHandler : {};
  const actualHandler = isOptions ? handler! : optionsOrHandler;

  const httpHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Validate query parameters
      const query = actualOptions.query
        ? validateSchema(req.query, actualOptions.query, 'query')
        : undefined;

      // Validate route parameters
      const params = actualOptions.params
        ? validateSchema(req.params, actualOptions.params, 'params')
        : undefined;

      // Validate request body
      const body = actualOptions.body
        ? validateSchema(req.body, actualOptions.body, 'body')
        : undefined;

      // Execute handler
      const result = await actualHandler({
        logger: req.logger,
        query,
        params,
        body,
      });

      // Validate response if schema is provided
      if (actualOptions.response && result.data !== undefined) {
        const validationResult = actualOptions.response.safeParse(result.data);
        if (!validationResult.success) {
          // In development, throw error. In production, log and continue
          const error = new Error('Response validation failed');
          req.logger.error('Response validation failed', {
            errors: validationResult.error.flatten(),
            data: result.data,
          });

          if (process.env.NODE_ENV === 'development') {
            throw error;
          }
        }
      }

      result.handleHttp(res);
    } catch (error) {
      next(error);
    }
  };

  return new Handler(actualOptions, httpHandler);
}

function validateSchema<T extends z.ZodTypeAny>(
  data: unknown,
  schema: T,
  type: 'query' | 'params' | 'body'
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errorMessage = {
      query: 'Invalid query parameters',
      params: 'Invalid request parameters',
      body: 'Invalid request body',
    }[type];

    throw new ValidationError(errorMessage, {
      errors: result.error.flatten(),
    });
  }

  return result.data;
}

/**
 * Utility function to get pagination parameters from query
 */
export function getPagination(req: Request): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit as string) || 20)
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}
