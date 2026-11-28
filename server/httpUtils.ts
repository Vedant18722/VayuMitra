/**
 * Shared server-side HTTP retry/timeout helpers and bounded LRU TTL cache.
 */

export class NonRetryableHttpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableHttpError';
  }
}

export interface CachedEntry<T> {
  value: T;
  cachedAtMs: number;
}

/**
 * Bounded LRU cache with per-entry TTL to prevent unbounded server memory growth.
 */
export class BoundedTtlCache<T> {
  private readonly store = new Map<string, CachedEntry<T>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(maxEntries: number, ttlMs: number) {
    this.maxEntries = Math.max(1, maxEntries);
    this.ttlMs = Math.max(1, ttlMs);
  }

  getFresh(key: string, nowMs = Date.now()): CachedEntry<T> | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (nowMs - entry.cachedAtMs >= this.ttlMs) return null;
    // Refresh LRU order on fresh hit
    this.store.delete(key);
    this.store.set(key, entry);
    return entry;
  }

  getStaleAllowed(key: string): CachedEntry<T> | null {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: T, nowMs = Date.now()): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { value, cachedAtMs: nowMs });
  }

  get size(): number {
    return this.store.size;
  }
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJsonWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retries = 1
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, 8500);
      if (!response.ok) {
        if ((response.status >= 500 || response.status === 429) && attempt < retries) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new NonRetryableHttpError(`Upstream HTTP ${response.status}`);
        }
        throw new Error(`Upstream HTTP ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (err) {
      lastError = err;
      if (err instanceof NonRetryableHttpError) {
        throw err;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}
