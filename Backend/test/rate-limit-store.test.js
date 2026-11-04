// Shared rate-limit storage.
//
// Verifies:
//  1. Every limiter is wired to a Redis-backed store with a DISTINCT key
//     prefix when REDIS_URL is set (MemoryStore otherwise).
//  2. Two independent limiter instances sharing one store backend see
//     each other's counters (the cross-instance architecture).
//  3. Counters survive an instance "restart" (new limiter, same backend).
//  4. The failure policy: fail-open allows, fail-closed 429s, on both
//     store errors and command timeouts.
//  5. All expected limiters are still exported.
//
// No real Redis is needed: the shared-store seam is exercised with a
// backend-faithful in-memory implementation of the express-rate-limit
// Store interface (production puts Redis via rate-limit-redis behind
// the same seam). A live two-instance Redis check still belongs in the
// deployment verification step (see DEPLOYMENT_CHECKLIST.md 5b).

import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import rateLimit from "express-rate-limit";

process.env.REDIS_URL = "redis://localhost:6379/0";
process.env.REDIS_KEY_PREFIX = "test:rl:";

const mw = await import("../src/middlewares/rateLimiter.middleware.js");
const { GuardedRedisStore, createRateLimitStore } =
  await import("../src/middlewares/rateLimitStore.js");

afterEach(() => mock.restoreAll());

const EXPECTED_LIMITERS = [
  "globalLimiter",
  "authLimiter",
  "uploadLimiter",
  "searchLimiter",
  "otpRequestLimiter",
  "managerRegisterLimiter",
  "otpResendLimiter",
  "otpVerifyLimiter",
  "refreshLimiter",
  "resetPasswordLimiter",
  "adminRegisterLimiter",
  "favoritesLimiter",
];

// ── 1. wiring ──────────────────────────────────────────────────────────────

test("every limiter uses a Redis-backed store with a distinct key prefix", () => {
  assert.equal(EXPECTED_LIMITERS.length, 12);
  const prefixes = [];
  for (const name of EXPECTED_LIMITERS) {
    assert.ok(typeof mw[name] === "function", `${name} is exported`);
    assert.ok(mw[name].store, `${name} exposes its store`);
    assert.equal(
      mw[name].store.constructor.name,
      "GuardedRedisStore",
      `${name} is Redis-backed when REDIS_URL is set`,
    );
    prefixes.push(mw[name].store.prefix);
  }
  assert.equal(
    new Set(prefixes).size,
    EXPECTED_LIMITERS.length,
    `prefixes must be distinct, got: ${prefixes.join(", ")}`,
  );
  for (const p of prefixes) {
    assert.ok(p.startsWith("test:rl:"), `prefix honors REDIS_KEY_PREFIX: ${p}`);
  }
});

test("without REDIS_URL, limiters keep the in-memory store", async () => {
  delete process.env.REDIS_URL;
  const mem = await import("../src/middlewares/rateLimiter.middleware.js?store=mem");
  assert.equal(
    mem.globalLimiter.store.constructor.name,
    "MemoryStore",
    "falls back to MemoryStore without REDIS_URL",
  );
  process.env.REDIS_URL = "redis://localhost:6379/0";
});

test("createRateLimitStore honors REDIS_URL at call time", () => {
  const redisStore = createRateLimitStore("probe");
  assert.equal(redisStore.constructor.name, "GuardedRedisStore");
  assert.equal(redisStore.prefix, "test:rl:probe:");
});

// ── 2/3. cross-instance + restart, via the shared-store seam ───────────────

// Fake shared backend implementing the express-rate-limit Store interface.
// Each makeStore() call returns a DISTINCT store object (as production
// does per limiter/instance) over one shared counter map (as Redis does).
const makeBackend = () => {
  const hits = new Map();
  const entryFor = (pkey) => {
    let e = hits.get(pkey);
    const now = Date.now();
    if (!e || e.resetTime.getTime() <= now) {
      e = { totalHits: 0, resetTime: new Date(now + 60_000) };
      hits.set(pkey, e);
    }
    return e;
  };
  return {
    makeStore: (prefix) => ({
      prefix,
      localKeys: false,
      async increment(key) {
        const e = entryFor(prefix + key);
        e.totalHits += 1;
        return { totalHits: e.totalHits, resetTime: e.resetTime };
      },
      async decrement(key) {
        const e = hits.get(prefix + key);
        if (e && e.totalHits > 0) e.totalHits -= 1;
      },
      async get(key) {
        return hits.get(prefix + key);
      },
      async resetKey(key) {
        hits.delete(prefix + key);
      },
    }),
  };
};

const buildApp = (store, max = 2) => {
  const app = express();
  const limiter = rateLimit({
    windowMs: 60_000,
    max,
    store,
    standardHeaders: false,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ limited: true }),
  });
  app.get("/ping", limiter, (req, res) => res.json({ ok: true }));
  return app;
};

const listen = (app) =>
  new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
const get = (server) =>
  fetch(`http://127.0.0.1:${server.address().port}/ping`).then((r) => r.status);

test("two instances sharing a store backend share counters; restart does not reset; prefixes isolate", async (t) => {
  const backend = makeBackend();
  const prefix = "test:rl:login:";

  // Two independent limiter instances ("two app instances"), one backend.
  const serverA = await listen(buildApp(backend.makeStore(prefix)));
  const serverB = await listen(buildApp(backend.makeStore(prefix)));
  t.after(() => {
    serverA.close();
    serverB.close();
  });

  assert.equal(await get(serverA), 200, "instance A: 1st request ok");
  assert.equal(await get(serverB), 200, "instance B: sees A's count (shared)");
  assert.equal(await get(serverA), 429, "instance A: B's hit counts against A's budget");

  // "Restart": brand-new limiter instance over the same backend/prefix.
  const serverC = await listen(buildApp(backend.makeStore(prefix)));
  t.after(() => serverC.close());
  assert.equal(await get(serverC), 429, "restarted instance: counter survived, still limited");

  // A different limiter prefix on the same backend is an independent bucket.
  const serverD = await listen(buildApp(backend.makeStore("test:rl:other:")));
  t.after(() => serverD.close());
  assert.equal(await get(serverD), 200, "different prefix: independent bucket");
});

// ── 4. failure policy ──────────────────────────────────────────────────────

const buildGuardedApp = ({ failClosed, sendCommand, commandTimeoutMs }) => {
  const app = express();
  const store = new GuardedRedisStore({
    prefix: "test:rl:guard:",
    sendCommand,
    failClosed,
    ...(commandTimeoutMs ? { commandTimeoutMs } : {}),
  });
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 1000,
    store,
    // Mirrors the production wiring in rateLimiter.middleware.js.
    passOnStoreError: !failClosed,
    standardHeaders: false,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ limited: true }),
  });
  app.get("/ping", limiter, (req, res) => res.json({ ok: true }));
  return app;
};

const boom = () => Promise.reject(new Error("redis down"));
const hang = () => new Promise(() => {});

test("fail-open (default): store errors and timeouts allow the request", async (t) => {
  mock.method(console, "error", () => {});
  const s1 = await listen(buildGuardedApp({ failClosed: false, sendCommand: boom }));
  const s2 = await listen(
    buildGuardedApp({ failClosed: false, sendCommand: hang, commandTimeoutMs: 50 }),
  );
  t.after(() => {
    s1.close();
    s2.close();
  });
  assert.equal(await get(s1), 200, "store error → allowed when fail-open");
  assert.equal(await get(s2), 200, "command timeout → allowed when fail-open");
});

test("fail-closed: store errors and timeouts are rejected with 429", async (t) => {
  mock.method(console, "error", () => {});
  const s1 = await listen(buildGuardedApp({ failClosed: true, sendCommand: boom }));
  const s2 = await listen(
    buildGuardedApp({ failClosed: true, sendCommand: hang, commandTimeoutMs: 50 }),
  );
  t.after(() => {
    s1.close();
    s2.close();
  });
  assert.equal(await get(s1), 429, "store error → 429 when fail-closed");
  assert.equal(await get(s2), 429, "command timeout → 429 when fail-closed");
});
