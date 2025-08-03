import { logger } from '@skelly/utils';

export interface ApiConfig {
  apiKey?: string;
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export abstract class ApiRepository {
  protected readonly config: ApiConfig;
  
  constructor(config: ApiConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      ...config,
    };
  }

  /**
   * Make an HTTP request to the external API
   */
  protected async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options?: {
      body?: any;
      query?: Record<string, any>;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    const url = new URL(path, this.config.baseUrl);
    
    // Add query parameters
    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
      ...options?.headers,
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const error = await response.text().catch(() => 'Unknown error');
        logger.error('API request failed', {
          method,
          url: url.toString(),
          status: response.status,
          error,
        });
        
        throw new Error(`API request failed: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      logger.error('API request error', {
        method,
        url: url.toString(),
        error,
      });
      throw error;
    }
  }
}