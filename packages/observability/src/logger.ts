export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  constructor(private readonly context?: Record<string, unknown>) {}

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context: { ...this.context, ...context }
    };

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    const ctxStr = entry.context ? ` ${JSON.stringify(entry.context)}` : "";

    switch (level) {
      case "debug":
        console.log(prefix, message, ctxStr);
        break;
      case "info":
        console.log(prefix, message, ctxStr);
        break;
      case "warn":
        console.warn(prefix, message, ctxStr);
        break;
      case "error":
        console.error(prefix, message, ctxStr);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context);
  }
}

export const createLogger = (context?: Record<string, unknown>): Logger => {
  return new ConsoleLogger(context);
};