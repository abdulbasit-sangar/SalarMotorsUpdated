// One-time Super Admin setup — atomicity.
// The old flow (countDocuments, then create) let two overlapping requests
// both pass the count check and create two initial admins. The fix is a
// database-enforced partial unique index on initialSuperAdmin: MongoDB
// itself admits only one such document, across requests AND backend
// instances. These tests verify the declaration, the overlapping race,
// and that setup-token protection is untouched. No database needed:
// Admin.create faithfully simulates the index's first-writer-wins rule.
import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.ACCESS_TOKEN_SECRET ||= "test-access-secret";
process.env.REFRESH_TOKEN_SECRET ||= "test-refresh-secret";
// auth.service.js -> email.service.js -> imagekit config chain needs these
// at import time; nothing here ever reaches the network.
process.env.IMAGEKIT_PUBLIC_KEY ||= "test_public";
process.env.IMAGEKIT_PRIVATE_KEY ||= "test_private";
process.env.IMAGEKIT_URL_ENDPOINT ||= "https://ik.imagekit.io/test";

const { default: Admin } = await import("../src/models/admin.model.js");
const authService = await import("../src/services/auth.service.js");
const { requireSetupToken } =
  await import("../src/middlewares/setup.middleware.js");

afterEach(() => mock.restoreAll());

// ── helpers ──────────────────────────────────────────────────────────────────

const runMiddleware = (mw, req) =>
  new Promise((resolve) => mw(req, {}, (err) => resolve(err)));

// Stand-in for the document Admin.create resolves with.
const createdDoc = (data, id = "admin-new") => {
  const doc = {
    _id: id,
    username: data.username,
    email: data.email,
    role: "superadmin",
    tokenVersion: 0,
    refreshToken: undefined,
    lastLogin: null,
    toPublicJSON() {
      return {
        _id: this._id,
        username: this.username,
        email: this.email,
        role: this.role,
      };
    },
    async save() {
      return this;
    },
  };
  return doc;
};

// Faithful simulation of the partial unique index on initialSuperAdmin:
// the FIRST insert carrying the marker wins; every later one fails the
// way MongoDB would — E11000 duplicate key.
const installRacingCreate = () => {
  let claimed = false;
  return mock.method(Admin, "create", async (data) => {
    if (data && data.initialSuperAdmin) {
      if (claimed) {
        const err = new Error(
          "E11000 duplicate key error collection: test.admins " +
            "index: initial_superadmin_singleton dup key: { initialSuperAdmin: true }",
        );
        err.code = 11000;
        throw err;
      }
      claimed = true;
    }
    return createdDoc(data);
  });
};

// ── the atomicity mechanism ──────────────────────────────────────────────────

test("Admin schema declares a partial unique index for one-time setup", () => {
  const found = Admin.schema
    .indexes()
    .find(
      ([fields, opts]) =>
        fields && fields.initialSuperAdmin === 1 &&
        opts && opts.unique === true &&
        opts.partialFilterExpression &&
        opts.partialFilterExpression.initialSuperAdmin === true,
    );
  assert.ok(
    found,
    "expected a partial unique index on initialSuperAdmin — " +
      "this index IS the cross-instance atomicity guarantee",
  );
});

// ── single setup ─────────────────────────────────────────────────────────────

test("a single valid setup request creates the initial superadmin", async () => {
  mock.method(Admin, "countDocuments", async () => 0);
  let createdWith = null;
  mock.method(Admin, "create", async (data) => {
    createdWith = data;
    return createdDoc(data);
  });

  const out = await authService.registerAdminService({
    username: "root",
    email: "root@test.local",
    password: "password123",
  });

  // The one-time slot is claimed atomically as part of the insert.
  assert.equal(createdWith.initialSuperAdmin, true);
  assert.equal(out.admin.role, "superadmin");
  assert.ok(out.accessToken);
  assert.ok(out.refreshToken);
});

// ── genuine overlapping concurrency ──────────────────────────────────────────

test("two overlapping setup requests create exactly one admin", async () => {
  // The count gate stays shut until BOTH requests are inside
  // registerAdminService awaiting countDocuments — proving the requests
  // genuinely overlap instead of running one after another.
  let releaseCount;
  const countGate = new Promise((resolve) => {
    releaseCount = resolve;
  });
  let countCalls = 0;
  mock.method(Admin, "countDocuments", () => {
    countCalls += 1;
    if (countCalls === 2) releaseCount();
    return countGate.then(() => 0); // both observe an empty collection
  });
  installRacingCreate();

  const attempt = () =>
    authService.registerAdminService({
      username: "root",
      email: "root@test.local",
      password: "password123",
    });
  const [r1, r2] = await Promise.allSettled([attempt(), attempt()]);

  assert.equal(countCalls, 2, "both requests must have overlapped");
  const fulfilled = [r1, r2].filter((r) => r.status === "fulfilled");
  const rejected = [r1, r2].filter((r) => r.status === "rejected");
  assert.equal(fulfilled.length, 1, "exactly one setup must succeed");
  assert.equal(rejected.length, 1, "exactly one setup must fail");
  assert.ok(fulfilled[0].value.accessToken);
  // The loser fails safely with the same 403 the API has always returned.
  assert.equal(rejected[0].reason.statusCode, 403);
  assert.match(rejected[0].reason.message, /already exists/i);
});

test("three overlapping setup requests still create exactly one admin", async () => {
  let releaseCount;
  const countGate = new Promise((resolve) => {
    releaseCount = resolve;
  });
  let countCalls = 0;
  mock.method(Admin, "countDocuments", () => {
    countCalls += 1;
    if (countCalls === 3) releaseCount();
    return countGate.then(() => 0);
  });
  installRacingCreate();

  const attempt = (i) =>
    authService.registerAdminService({
      username: `root${i}`,
      email: `root${i}@test.local`,
      password: "password123",
    });
  const results = await Promise.allSettled([attempt(1), attempt(2), attempt(3)]);

  assert.equal(countCalls, 3);
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 2);
  for (const r of rejected) {
    assert.equal(r.reason.statusCode, 403);
  }
});

// ── setup cannot run twice ───────────────────────────────────────────────────

test("setup is rejected when an admin already exists (fast path)", async () => {
  mock.method(Admin, "countDocuments", async () => 1);
  const create = mock.method(Admin, "create", async () => {
    throw new Error("create must not run when setup already happened");
  });

  await assert.rejects(
    authService.registerAdminService({
      username: "root",
      email: "root@test.local",
      password: "password123",
    }),
    (err) =>
      err.statusCode === 403 && /already exists/i.test(err.message),
  );
  assert.equal(create.mock.callCount(), 0);
});

// ── setup-token protection is untouched ──────────────────────────────────────

test("missing setup token disables setup before any database write", async () => {
  const prev = process.env.ADMIN_SETUP_TOKEN;
  delete process.env.ADMIN_SETUP_TOKEN;
  try {
    const create = mock.method(Admin, "create", async () => {
      throw new Error("create must not run without a setup token");
    });
    const err = await runMiddleware(requireSetupToken, { headers: {} });
    assert.ok(err);
    assert.equal(err.statusCode, 503);
    assert.equal(create.mock.callCount(), 0);
  } finally {
    if (prev === undefined) delete process.env.ADMIN_SETUP_TOKEN;
    else process.env.ADMIN_SETUP_TOKEN = prev;
  }
});

test("wrong setup token is rejected; the right one passes", async () => {
  const prev = process.env.ADMIN_SETUP_TOKEN;
  process.env.ADMIN_SETUP_TOKEN = "a".repeat(32);
  try {
    const bad = await runMiddleware(requireSetupToken, {
      headers: { "x-admin-setup-token": "wrong-token" },
    });
    assert.ok(bad);
    assert.equal(bad.statusCode, 403);

    const good = await runMiddleware(requireSetupToken, {
      headers: { "x-admin-setup-token": "a".repeat(32) },
    });
    assert.equal(good, undefined);
  } finally {
    if (prev === undefined) delete process.env.ADMIN_SETUP_TOKEN;
    else process.env.ADMIN_SETUP_TOKEN = prev;
  }
});
