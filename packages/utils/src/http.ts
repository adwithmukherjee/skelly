import { logger } from './logger';
import { AppError, ExternalServiceError } from './error';

export interface HttpClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retries?: number;
}

export class HttpClient {
  private config: Required<HttpClientConfig>;

  constructor(config: HttpClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      headers: config.headers || {},
    };
  }

  private buildURL(
    path: string,
    params?: Record<string, string | number | boolean>
  ): string {
    const url = new URL(path, this.config.baseURL);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  private async fetchWithTimeout(
    url: string,
    config: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async fetchWithRetry(
    url: string,
    config: RequestInit,
    retries: number,
    timeout: number
  ): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();
        const response = await this.fetchWithTimeout(url, config, timeout);
        const duration = Date.now() - startTime;

        logger.debug(`HTTP ${config.method || 'GET'} ${url}`, {
          status: response.status,
          duration,
          attempt: attempt + 1,
        });

        if (!response.ok && response.status >= 500 && attempt < retries) {
          throw new Error(`Server error: ${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          logger.warn(`HTTP request failed, retrying in ${delay}ms`, {
            url,
            attempt: attempt + 1,
            error: lastError.message,
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new ExternalServiceError(url, lastError);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      let errorBody: any;

      try {
        if (contentType?.includes('application/json')) {
          errorBody = await response.json();
        } else {
          errorBody = await response.text();
        }
      } catch {
        errorBody = 'Failed to parse error response';
      }

      throw new AppError(
        errorBody.message || `HTTP ${response.status} error`,
        errorBody.code || 'HTTP_ERROR',
        response.status,
        errorBody.details || { body: errorBody }
      );
    }

    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return response.text() as unknown as T;
  }

  async request<T = any>(path: string, config: RequestConfig = {}): Promise<T> {
    const url = this.buildURL(path, config.params);
    const timeout = config.timeout || this.config.timeout;
    const retries = config.retries ?? this.config.retries;

    const requestConfig: RequestInit = {
      ...config,
      headers: {
        ...this.config.headers,
        ...config.headers,
      },
    };

    const response = await this.fetchWithRetry(
      url,
      requestConfig,
      retries,
      timeout
    );
    return this.handleResponse<T>(response);
  }

  async get<T = any>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  async post<T = any>(
    path: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: JSON.stringify(data),
    });
  }

  async put<T = any>(
    path: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: JSON.stringify(data),
    });
  }

  async patch<T = any>(
    path: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: JSON.stringify(data),
    });
  }

  async delete<T = any>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }
}

export const httpClient = new HttpClient();
