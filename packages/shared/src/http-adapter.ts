export interface AdapterOptions {
  baseUrl?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface HttpResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export class HttpAdapter {
  private readonly baseUrl?: string;
  private readonly timeoutMs: number;
  private readonly headers: Record<string, string>;

  constructor(options: AdapterOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.headers = options.headers ?? {};
  }

  async get<T = unknown>(path: string): Promise<HttpResponse<T>> {
    return this.request<T>("GET", path);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>("POST", path, body);
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>("PUT", path, body);
  }

  async delete<T = unknown>(path: string): Promise<HttpResponse<T>> {
    return this.request<T>("DELETE", path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<HttpResponse<T>> {
    const url = this.baseUrl ? new URL(path, this.baseUrl) : new URL(path);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          "Content-Type": "application/json",
          ...this.headers
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeout);

      let data: T | undefined;
      try {
        data = (await response.json()) as T;
      } catch {
        // no body
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
        error: response.ok ? undefined : `HTTP ${response.status}`
      };
    } catch (error) {
      clearTimeout(timeout);

      return {
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : "Request failed"
      };
    }
  }
}

export const createHttpAdapter = (options?: AdapterOptions): HttpAdapter => {
  return new HttpAdapter(options);
};