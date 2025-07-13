import { AppError } from '@skelly/utils';

export class DatabaseError extends AppError {
  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message, `DB_${code}`, statusCode, details, false);
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string = 'Failed to connect to database', details?: any) {
    super(message, 'CONNECTION_FAILED', 500, details);
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, query?: string, params?: any[]) {
    super(message, 'QUERY_FAILED', 500, { query, params });
  }
}

export class ConstraintError extends DatabaseError {
  constructor(constraint: string, statusCode: number = 400, details?: any) {
    const message = `Database constraint violation: ${constraint}`;
    super(message, 'CONSTRAINT_VIOLATION', statusCode, { constraint, ...details });
  }
}

export class UniqueConstraintError extends ConstraintError {
  constructor(field: string, value?: any) {
    super('unique', 409, { field, value });
  }
}

export class ForeignKeyConstraintError extends ConstraintError {
  constructor(field: string, details?: any) {
    super('foreign_key', 400, { field, ...details });
  }
}

export class TimeoutError extends DatabaseError {
  constructor(query?: string, timeout?: number) {
    super(
      `Query execution timeout${timeout ? ` after ${timeout}ms` : ''}`,
      'QUERY_TIMEOUT',
      500,
      { query, timeout }
    );
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'TRANSACTION_FAILED', 500, details);
  }
}