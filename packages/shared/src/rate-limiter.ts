export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private readonly requests = new Map<string, number[]>();
  private readonly config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const timestamps = this.requests.get(key) ?? [];
    const validTimestamps = timestamps.filter((t) => t > windowStart);

    if (validTimestamps.length >= this.config.maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);

    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const timestamps = this.requests.get(key) ?? [];
    const validTimestamps = timestamps.filter((t) => t > windowStart);

    return Math.max(0, this.config.maxRequests - validTimestamps.length);
  }

  clear(): void {
    this.requests.clear();
  }
}

export const createRateLimiter = (config: RateLimitConfig): RateLimiter => {
  return new RateLimiter(config);
};