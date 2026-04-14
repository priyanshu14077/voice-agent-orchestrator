import type { Logger } from "./logger.js";

export { ConsoleLogger, createLogger } from "./logger.js";
export type { LogLevel, LogEntry, Logger } from "./logger.js";

export interface Metrics {
  increment(name: string, value?: number): void;
  decrement(name: string, value?: number): void;
  gauge(name: string, value: number): void;
  timing(name: string, durationMs: number): void;
}

export class InMemoryMetrics implements Metrics {
  private readonly metrics = new Map<string, number>();

  increment(name: string, value = 1): void {
    const current = this.metrics.get(name) ?? 0;
    this.metrics.set(name, current + value);
  }

  decrement(name: string, value = 1): void {
    const current = this.metrics.get(name) ?? 0;
    this.metrics.set(name, current - value);
  }

  gauge(name: string, value: number): void {
    this.metrics.set(name, value);
  }

  timing(name: string, durationMs: number): void {
    this.metrics.set(name, durationMs);
  }

  get(name: string): number {
    return this.metrics.get(name) ?? 0;
  }

  reset(): void {
    this.metrics.clear();
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}

export const createMetrics = (): Metrics => {
  return new InMemoryMetrics();
};