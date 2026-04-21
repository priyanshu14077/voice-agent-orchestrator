import { describe, it, expect, beforeEach } from "vitest";
import { CircuitBreaker, createCircuitBreaker } from "./circuit-breaker.js";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = createCircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      resetTimeout: 1000
    });
  });

  it("should start in closed state", () => {
    expect(breaker.getState()).toBe("closed");
  });

  it("should remain closed after successful calls", async () => {
    await breaker.execute(() => Promise.resolve("success"));
    expect(breaker.getState()).toBe("closed");
  });

  it("should open after reaching failure threshold", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    await breaker.execute(fn).catch(() => {});
    await breaker.execute(fn).catch(() => {});
    await breaker.execute(fn).catch(() => {});

    expect(breaker.getState()).toBe("open");
  });

  it("should throw when circuit is open", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    await breaker.execute(fn).catch(() => {});
    await breaker.execute(fn).catch(() => {});
    await breaker.execute(fn).catch(() => {});

    await expect(breaker.execute(() => Promise.resolve("test"))).rejects.toThrow(
      "Circuit breaker is open"
    );
  });

  it("should enter half-open state after timeout", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    await breaker.execute(fn).catch(() => {});
    await breaker.execute(fn).catch(() => {});
    await breaker.execute(fn).catch(() => {});

    expect(breaker.getState()).toBe("open");

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const result = await breaker.execute(() => Promise.resolve("test"));
    expect(result).toBe("test");
  });

  it("should reset metrics on reset()", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    await breaker.execute(fn).catch(() => {});
    await breaker.execute(fn).catch(() => {});

    breaker.reset();

    expect(breaker.getState()).toBe("closed");
    expect(breaker.getMetrics().consecutiveFailures).toBe(0);
  });
});
