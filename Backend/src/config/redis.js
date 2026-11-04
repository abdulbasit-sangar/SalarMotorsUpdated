// Shared Redis client for rate limiting (and any future shared state).
//
// Design notes:
// - The client is created lazily by initRedis(), called once from
//   server.js at startup. Nothing connects at import time, so tests and
//   scripts that never call initRedis() are unaffected.
// - Connection is best-effort and NEVER blocks or crashes startup: a
//   Redis outage must not take the API down. Per-request failures are
//   governed by the rate-limit failure policy (see rateLimitStore.js).
// - Reconnection uses bounded exponential backoff (capped at 5s) —
//   never a hot retry loop.
// - The 'error' listener is mandatory: without it, node-redis emits an
//   unhandled 'error' event and the process crashes.
// - No credentials are ever logged.

import { createClient } from "redis";

const CONNECT_TIMEOUT_MS = 5000;
const MAX_RECONNECT_DELAY_MS = 5000;

let client = null;

export const isRedisEnabled = () => Boolean(process.env.REDIS_URL?.trim());

export const getRedisClient = () => client;

export const initRedis = async () => {
  if (client || !isRedisEnabled()) return client;
  try {
    client = createClient({
      url: process.env.REDIS_URL.trim(),
      socket: {
        connectTimeout: CONNECT_TIMEOUT_MS,
        reconnectStrategy: (retries) =>
          Math.min(retries * 100, MAX_RECONNECT_DELAY_MS),
      },
    });
  } catch (err) {
    console.error(
      `[redis] invalid REDIS_URL (${err.message}) — rate limiting follows the configured failure policy`,
    );
    client = null;
    return null;
  }

  client.on("error", (err) => {
    console.error(`[redis] client error: ${err.message}`);
  });

  // Best-effort: kick off the connection without awaiting it, so a slow
  // or down Redis never delays boot. The client reconnects in the
  // background; the store starts working as soon as it is ready.
  client
    .connect()
    .then(() =>
      console.log("[redis] connected — rate limits are shared across instances"),
    )
    .catch((err) =>
      console.error(
        `[redis] connection failed (${err.message}) — rate limiting follows the configured failure policy; will keep retrying`,
      ),
    );
  return client;
};

export const closeRedis = async () => {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    // shutting down — nothing useful to do
  } finally {
    client = null;
  }
};
