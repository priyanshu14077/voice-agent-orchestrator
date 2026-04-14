export interface DebounceOptions {
  delayMs: number;
  leading?: boolean;
  trailing?: boolean;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: DebounceOptions
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const { delayMs, leading = false, trailing = true } = options;

  return ((...args: Parameters<T>) => {
    lastArgs = args;

    if (leading && !timeoutId) {
      fn(...args);
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (trailing && lastArgs) {
        fn(...lastArgs);
      }
    }, delayMs);
  }) as T;
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = delayMs - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        if (lastArgs) {
          fn(...lastArgs);
        }
      }, remaining);
    }

    let lastArgs: Parameters<T> | null = args;
  }) as T;
}