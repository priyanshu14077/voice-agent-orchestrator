export interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class Cache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs = 60000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const expiry = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expiry });
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  prune(): number {
    const now = Date.now();
    let pruned = 0;
    
    for (const [key, entry] of this.store) {
      if (now > entry.expiry) {
        this.store.delete(key);
        pruned++;
      }
    }
    
    return pruned;
  }

  get size(): number {
    return this.store.size;
  }
}