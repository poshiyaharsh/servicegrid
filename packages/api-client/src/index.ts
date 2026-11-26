import type { ApiErrorResponse, ApiSuccessResponse } from '@servicegrid/types';

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: () => string | null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getAccessToken = config.getAccessToken;
  }

  async request<T>(
    path: string,
    options: RequestInit & { idempotencyKey?: string } = {},
  ): Promise<ApiSuccessResponse<T>> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    const token = this.getAccessToken?.();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (options.idempotencyKey) {
      headers.set('Idempotency-Key', options.idempotencyKey);
    }

    const response = await fetch(`${this.baseUrl}/api/v1${path}`, {
      ...options,
      headers,
    });

    const body = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;
    if (!response.ok || !body.success) {
      const err = !body.success ? body.error : { code: 'HTTP_ERROR', message: response.statusText };
      throw new Error(`${err.code}: ${err.message}`);
    }
    return body;
  }
}
