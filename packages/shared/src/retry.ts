export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error) => boolean;
}

export const defaultRetryOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  shouldRetry: () => true
};

export const retry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const opts = { ...defaultRetryOptions, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === opts.maxAttempts || !opts.shouldRetry(lastError)) {
        throw lastError;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
};

export const retryWithCircuit = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions & { failureThreshold?: number; resetTimeoutMs?: number }
): Promise<T> => {
  let failures = 0;
  let lastFailureTime = 0;
  const failureThreshold = options.failureThreshold ?? 5;
  const resetTimeoutMs = options.resetTimeoutMs ?? 60000;

  return retry(fn, {
    ...options,
    shouldRetry: (error) => {
      failures++;
      lastFailureTime = Date.now();

      if (failures >= failureThreshold) {
        const timeSinceLastFailure = Date.now() - lastFailureTime;
        if (timeSinceLastFailure > resetTimeoutMs) {
          failures = 0;
          return true;
        }
        console.warn("[circuit-breaker] open, failing fast");
        return false;
      }

      return options.shouldRetry?.(error) ?? true;
    }
  });
};