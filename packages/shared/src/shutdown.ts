export type Signal = "SIGINT" | "SIGTERM" | "SIGUSR2";

export type CleanupHandler = () => void | Promise<void>;

export class GracefulShutdown {
  private readonly handlers: CleanupHandler[] = [];
  private readonly signal: Signal;
  private shutdownInProgress = false;

  constructor(signal: Signal = "SIGTERM") {
    this.signal = signal;
  }

  register(handler: CleanupHandler): void {
    this.handlers.push(handler);
  }

  start(): void {
    const shutdown = async (signal: Signal): Promise<void> => {
      if (this.shutdownInProgress) {
        return;
      }

      this.shutdownInProgress = true;
      console.log(`[shutdown] received ${signal}, starting graceful shutdown...`);

      for (const handler of this.handlers) {
        try {
          await handler();
        } catch (error) {
          console.error("[shutdown] handler error:", error);
        }
      }

      console.log("[shutdown] complete");
      process.exit(0);
    };

    process.on(this.signal, () => void shutdown(this.signal));
    process.on("uncaughtException", (error) => {
      console.error("[shutdown] uncaught exception:", error);
      void shutdown("SIGTERM");
    });

    process.on("unhandledRejection", (reason) => {
      console.error("[shutdown] unhandled rejection:", reason);
    });
  }
}

export const createGracefulShutdown = (signal?: Signal): GracefulShutdown => {
  return new GracefulShutdown(signal);
};