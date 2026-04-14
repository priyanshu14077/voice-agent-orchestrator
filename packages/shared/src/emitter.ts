export class Emitter<T extends Record<string, unknown[]>> {
  private listeners = new Map<keyof T, Set<Function>>();

  on<K extends keyof T>(event: K, fn: (...args: T[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
  }

  off<K extends keyof T>(event: K, fn: (...args: T[K]) => void): void {
    this.listeners.get(event)?.delete(fn);
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }

  once<K extends keyof T>(event: K, fn: (...args: T[K]) => void): void {
    const wrapper = ((...args: T[K]) => {
      fn(...args);
      this.off(event, wrapper);
    }) as any;
    this.on(event, wrapper);
  }

  clear(event?: keyof T): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}