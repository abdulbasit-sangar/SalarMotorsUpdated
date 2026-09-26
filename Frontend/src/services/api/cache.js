/**
 * A small in-memory cache for public catalog GET requests.
 *
 * Two problems this solves:
 *  1. Duplicate in-flight requests — if two components ask for the same
 *     data in the same tick (e.g. Home's manifest strip and a Listings
 *     prefetch), they share one network call instead of firing two.
 *  2. Short-lived staleness tolerance — navigating Home -> Listings -> back
 *     to Home within a few seconds won't re-hit the network for data that
 *     hasn't had time to change.
 *
 * This is intentionally simple (no LRU eviction, no persistence) — it only
 * needs to survive a single browser tab session and a modest number of
 * keys. Write operations (create/feature/hide) call `invalidate()` so the
 * next read is always fresh after a mutation.
 */

const store = new Map(); // key -> { expiry: number, promise: Promise }

const DEFAULT_TTL_MS = 30_000;

export const cacheKey = (name, params = {}) => `${name}:${JSON.stringify(params)}`;

/**
 * Returns a cached promise for `key` if it's still fresh; otherwise calls
 * `fetcher()`, caches the resulting promise immediately (so concurrent
 * callers dedupe), and evicts the entry if the fetch fails so a retry
 * isn't permanently stuck behind a bad cache entry.
 */
export const cached = (key, fetcher, ttlMs = DEFAULT_TTL_MS) => {
  const now = Date.now();
  const entry = store.get(key);

  if (entry && entry.expiry > now) {
    return entry.promise;
  }

  const promise = fetcher().catch((err) => {
    store.delete(key);
    throw err;
  });

  store.set(key, { expiry: now + ttlMs, promise });
  return promise;
};

/**
 * Clears cache entries. With no argument, clears everything — used after
 * any car mutation (create/feature/hide) so admin and public views never
 * show stale data past the point of a write.
 */
export const invalidateCache = (prefix) => {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};
