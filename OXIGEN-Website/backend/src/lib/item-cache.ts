import { logger } from "./logger.js";
/**
 * Shared in-memory cache — imported by items.ts and webhooks.ts.
 *
 * VERSION SYSTEM:
 * When the cache is cleared (for example, by a webhook), the version timestamp updates.
 * The frontend checks GET /api/items/version — if the version changed
 * it clears localStorage cache and fetches fresh data.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

// ✅ This updates on webhook events — the frontend compares against it
let cacheVersion = Date.now();

export const itemCache = {
  get(key: string): unknown | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.data;
  },

  set(key: string, data: unknown): void {
    store.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  },

  delete(key: string): void {
    store.delete(key);
  },

  /** Clear the cache and bump the version so the frontend can detect it */
  clear(): void {
    const before = store.size;
    store.clear();
    cacheVersion = Date.now();
    logger.info(
      `[item-cache] Cache cleared — ${before} entries removed, version: ${cacheVersion}`,
    );
  },

  /** Returned by the frontend GET /api/items/version endpoint */
  getVersion(): number {
    return cacheVersion;
  },

  get size(): number {
    return store.size;
  },
};
