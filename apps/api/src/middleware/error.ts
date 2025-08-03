import { Request, Response, NextFunction } from 'express';
import { AppError } from '@skelly/utils';
import { isDevelopment } from '../config';

interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    statusCode: number;
    requestId: string;
    stack?: string;
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      statusCode: 404,
      requestId: req.id,
    },
  });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error with request context
  req.logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    name: err.name,
  });

  // Prepare error response
  let statusCode = 500;
  let message = 'Internal server error';
  let code: string | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  }

  const response: ErrorResponse = {
    error: {
      message,
      code,
      statusCode,
      requestId: req.id,
    },
  };

  // Include stack trace in development
  if (isDevelopment() && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
