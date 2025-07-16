import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '@skelly/utils';

export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export type Handler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

/**
 * Base controller class with common utilities
 */
export abstract class BaseController {
  /**
   * Wraps an async handler to properly catch errors
   */
  protected asyncHandler(fn: AsyncHandler): Handler {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Send a success response
   */
  protected success<T>(res: Response, data: T, status = 200): void {
    res.status(status).json({
      success: true,
      data,
    });
  }

  /**
   * Send a paginated response
   */
  protected paginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    }
  ): void {
    const { page, limit, total } = pagination;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  }

  /**
   * Validate request body against a Zod schema
   */
  protected validateBody<T>(req: Request, schema: z.ZodSchema<T>): T {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      throw new ValidationError('Invalid request body', {
        errors: result.error.flatten(),
      });
    }

    return result.data;
  }

  /**
   * Validate request query against a Zod schema
   */
  protected validateQuery<T>(req: Request, schema: z.ZodSchema<T>): T {
    const result = schema.safeParse(req.query);
    
    if (!result.success) {
      throw new ValidationError('Invalid query parameters', {
        errors: result.error.flatten(),
      });
    }

    return result.data;
  }

  /**
   * Validate request params against a Zod schema
   */
  protected validateParams<T>(req: Request, schema: z.ZodSchema<T>): T {
    const result = schema.safeParse(req.params);
    
    if (!result.success) {
      throw new ValidationError('Invalid request parameters', {
        errors: result.error.flatten(),
      });
    }

    return result.data;
  }

  /**
   * Get pagination parameters from query
   */
  protected getPagination(req: Request): { page: number; limit: number; offset: number } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }
}