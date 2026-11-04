// Shared rate-limit storage factory.
//
// When REDIS_URL is set, every limiter gets its OWN GuardedRedisStore
// instance (express-rate-limit forbids sharing one store across
// limiters) backed by the single shared Redis client, each with a
// distinct key prefix — so counters are shared across backend instances
// and survive restarts, while limiters never see each other's buckets.
// When REDIS_URL is unset, the default in-memory store is used
// (previous behavior; server.js warns loudly about this in production).
//
// Failure policy (Redis unreachable), via RATE_LIMIT_FAIL_CLOSED:
// - "false" (default): FAIL OPEN — the request is allowed and the outage
//   is logged loudly. Rationale: failing closed would let anyone deny
//   all logins by disrupting Redis, and the primary brute-force defenses
//   (per-account lockout, OTP attempt caps, refresh reuse detection)
//   live in MongoDB and keep working regardless.
// - "true": FAIL CLOSED — the bucket is reported as exceeded so the
//   limiter's own 429 handler runs (no 500s, no special error paths).
// Either way, an in-memory fallback is deliberately NOT used on Redis
// failure: it would silently pretend to protect while enforcing
// per-instance limits.

import { MemoryStore } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient, isRedisEnabled } from "../config/redis.js";

const FAIL_CLOSED = process.env.RATE_LIMIT_FAIL_CLOSED === "true";
const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || "safar:rl:";
const COMMAND_TIMEOUT_MS = 1000;

const withTimeout = (promise, ms, label) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`[rate-limit] ${label} timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([
    promise.then(
      (value) => {
        clearTimeout(timer);
        return value;
      },
      (err) => {
        clearTimeout(timer);
        throw err;
      },
    ),
    timeout,
  ]);
};

export class GuardedRedisStore extends RedisStore {
  constructor({ prefix, sendCommand, failClosed = FAIL_CLOSED, commandTimeoutMs = COMMAND_TIMEOUT_MS }) {
    super({ prefix, sendCommand });
    // Explicit: also feeds express-rate-limit's per-request double-count
    // check, which keys off store.prefix.
    this.prefix = prefix;
    this.failClosed = failClosed;
    this.commandTimeoutMs = commandTimeoutMs;
    // RedisStore loads its Lua scripts eagerly via sendCommand. Before
    // initRedis() runs (or when Redis is down) that load rejects — mark
    // it handled here so Node doesn't crash on an unhandled rejection.
    // retryableIncrement reloads the scripts on next use, so recovery is
    // automatic once Redis is reachable.
    this.incrementScriptSha?.catch?.(() => {});
    this.getScriptSha?.catch?.(() => {});
  }

  async increment(key) {
    try {
      return await withTimeout(
        super.increment(key),
        this.commandTimeoutMs,
        `increment ${key}`,
      );
    } catch (err) {
      return this.handleStoreError(err);
    }
  }

  async decrement(key) {
    try {
      await withTimeout(super.decrement(key), this.commandTimeoutMs, `decrement ${key}`);
    } catch (err) {
      console.error(`[rate-limit] Redis decrement failed: ${err.message}`);
    }
  }

  async get(key) {
    try {
      return await withTimeout(super.get(key), this.commandTimeoutMs, `get ${key}`);
    } catch (err) {
      console.error(`[rate-limit] Redis get failed: ${err.message}`);
      return undefined;
    }
  }

  async resetKey(key) {
    try {
      await withTimeout(super.resetKey(key), this.commandTimeoutMs, `resetKey ${key}`);
    } catch (err) {
      console.error(`[rate-limit] Redis resetKey failed: ${err.message}`);
    }
  }

  handleStoreError(err) {
    console.error(
      `[rate-limit] Redis store failure (${this.failClosed ? "fail-closed" : "fail-open"}): ${err.message}`,
    );
    // Fail open: rethrow and let express-rate-limit's passOnStoreError
    // allow the request (it logs as well).
    if (!this.failClosed) throw err;
    // Fail closed without 500s: report the bucket as exceeded so the
    // limiter's own 429 handler runs with its configured message.
    return {
      totalHits: Number.MAX_SAFE_INTEGER,
      resetTime: new Date(Date.now() + (this.windowMs || 60_000)),
    };
  }
}

const sendCommand = (...args) => {
  const client = getRedisClient();
  if (!client || client.isReady !== true) {
    return Promise.reject(new Error("Redis client not connected"));
  }
  return client.sendCommand(args);
};

// One store instance per limiter (required by express-rate-limit), each
// with a distinct prefix. Safe to call at import time: no connection is
// attempted until initRedis() runs.
export const createRateLimitStore = (name) => {
  if (!isRedisEnabled()) return new MemoryStore();
  return new GuardedRedisStore({
    prefix: `${KEY_PREFIX}${name}:`,
    sendCommand,
    failClosed: FAIL_CLOSED,
  });
};
