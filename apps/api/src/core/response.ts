import { Response } from 'express';
import _ from 'lodash';

export interface ApiResultParams<T> {
  success: boolean;
  status: number;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * Utility functions for common response patterns
 */
export class ApiResult<T> {
  success: boolean;
  status: number;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };

  constructor(params: ApiResultParams<T>) {
    this.success = params.success;
    this.status = params.status;
    this.data = params.data;
    this.pagination = params.pagination;
  }

  /**
   * Send a success response
   */
  static success<T>(data: T, status = 200): ApiResult<T> {
    return new ApiResult({
      success: true,
      status,
      data,
    });
  }

  static paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    }
  ): ApiResult<T[]> {
    return new ApiResult({
      success: true,
      status: 200,
      data,
      pagination,
    });
  }

  static noContent(): ApiResult<void> {
    return new ApiResult({
      success: true,
      status: 204,
    });
  }

  static error<T>(data: T, status = 500): ApiResult<T> {
    return new ApiResult({
      success: false,
      status,
      data,
    });
  }

  handleHttp(res: Response): Response {
    const responseBody = _.omitBy(
      {
        success: this.success,
        data: this.data,
        pagination: this.pagination
          ? {
              page: this.pagination.page,
              limit: this.pagination.limit,
              total: this.pagination.total,
              totalPages: Math.ceil(
                this.pagination.total / this.pagination.limit
              ),
              hasNextPage:
                this.pagination.page <
                Math.ceil(this.pagination.total / this.pagination.limit),
              hasPreviousPage: this.pagination.page > 1,
            }
          : undefined,
      },
      _.isUndefined
    );

    return res.status(this.status).json(responseBody);
  }
}
