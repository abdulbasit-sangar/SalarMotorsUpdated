// Auth session isolation — superadmin and manager sessions must be fully
// independent: separate refresh-token cookies, separate refresh/logout/me
// endpoints, and strict role validation on refresh. No database needed:
// the Admin model is mocked and real JWTs are signed with test secrets.
import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.ACCESS_TOKEN_SECRET ||= "test-access-secret";
process.env.REFRESH_TOKEN_SECRET ||= "test-refresh-secret";
// manager.service.js -> email.service.js -> imagekit config chain needs these
// at import time; nothing here ever reaches the network.
process.env.IMAGEKIT_PUBLIC_KEY ||= "test_public";
process.env.IMAGEKIT_PRIVATE_KEY ||= "test_private";
process.env.IMAGEKIT_URL_ENDPOINT ||= "https://ik.imagekit.io/test";

const { default: Admin } = await import("../src/models/admin.model.js");
const {
  generateTokenPair,
  refreshCookieNameForRole,
  REFRESH_COOKIE_NAMES,
} = await import("../src/utils/tokenUtils.js");
const authService = await import("../src/services/auth.service.js");
const authController = await import("../src/controllers/auth.controller.js");
const managerController =
  await import("../src/controllers/manager.controller.js");
const { verifyJWT, requireRole } =
  await import("../src/middlewares/auth.middleware.js");
const { hashSecret } = await import("../src/utils/otpUtils.js");
const jwt = (await import("jsonwebtoken")).default;

afterEach(() => mock.restoreAll());

// ── helpers ──────────────────────────────────────────────────────────────────

// Minimal thenable stand-in for a Mongoose Query (supports .select()).
const query = (result) => {
  const q = {
    select: () => q,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return q;
};

const makeDoc = ({ _id, email, role, refreshToken }) => ({
  _id,
  email,
  role,
  isActive: true,
  emailVerified: true,
  tokenVersion: 0,
  refreshToken,
  lastLogin: null,
  failedLoginAttempts: 0,
  lockoutUntil: null,
  toPublicJSON() {
    return { _id, email, role };
  },
  async isPasswordCorrect() {
    return true;
  },
  async save() {
    return this;
  },
});

const runMiddleware = (mw, req) =>
  new Promise((resolve) => mw(req, {}, (err) => resolve(err)));

const mockRes = () => {
  const res = {
    statusCode: null,
    cookies: {},
    cleared: [],
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    cookie(n, v) {
      this.cookies[n] = v;
      return this;
    },
    clearCookie(n) {
      this.cleared.push(n);
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
  return res;
};

// asyncHandler does not return the inner promise, so `await controller(...)`
// resolves before the work finishes. This helper waits for the real
// completion signal: res.json() on success, next(err) on failure.
const callController = (controllerFn, req) =>
  new Promise((resolve, reject) => {
    const res = mockRes();
    res.json = (body) => {
      res.body = body;
      resolve(res);
      return res;
    };
    const next = (err) => {
      if (err) reject(err);
      else resolve(res);
    };
    try {
      controllerFn(req, res, next);
    } catch (e) {
      reject(e);
    }
  });

const tokenPairFor = (role, id) =>
  generateTokenPair({
    _id: id,
    email: `${id}@test.local`,
    role,
    tokenVersion: 0,
  });

// ── cookie names ─────────────────────────────────────────────────────────────

test("refresh cookies are role-scoped and distinct", () => {
  assert.equal(refreshCookieNameForRole("superadmin"), "adminRefreshToken");
  assert.equal(refreshCookieNameForRole("manager"), "managerRefreshToken");
  assert.notEqual(
    REFRESH_COOKIE_NAMES.superadmin,
    REFRESH_COOKIE_NAMES.manager,
  );
});

// ── simultaneous login ───────────────────────────────────────────────────────

test("superadmin and manager can log in simultaneously with separate cookies", async () => {
  const adminDoc = makeDoc({
    _id: "admin1",
    email: "admin@test.local",
    role: "superadmin",
  });
  const managerDoc = makeDoc({
    _id: "mgr1",
    email: "manager@test.local",
    role: "manager",
  });
  mock.method(Admin, "findOne", (filter) =>
    query(filter.email === "admin@test.local" ? adminDoc : managerDoc),
  );

  const adminRes = await callController(authController.loginAdmin, {
    body: { email: "admin@test.local", password: "pw" },
  });
  const mgrRes = await callController(managerController.loginManager, {
    body: { email: "manager@test.local", password: "pw" },
  });

  assert.equal(adminRes.statusCode, 200);
  assert.equal(mgrRes.statusCode, 200);
  // Each login sets ONLY its own role's cookie — no shared "refreshToken".
  assert.ok(adminRes.cookies["adminRefreshToken"]);
  assert.ok(!("managerRefreshToken" in adminRes.cookies));
  assert.ok(!("refreshToken" in adminRes.cookies));
  assert.ok(mgrRes.cookies["managerRefreshToken"]);
  assert.ok(!("adminRefreshToken" in mgrRes.cookies));
  assert.ok(!("refreshToken" in mgrRes.cookies));
  // Each account stores its own refresh-token hash.
  assert.ok(adminDoc.refreshToken);
  assert.ok(managerDoc.refreshToken);
  assert.notEqual(adminDoc.refreshToken, managerDoc.refreshToken);
});

// ── independent refresh ──────────────────────────────────────────────────────

test("refreshing one session never disturbs the other", async () => {
  const adminPair = tokenPairFor("superadmin", "admin1");
  const mgrPair = tokenPairFor("manager", "mgr1");
  const adminDoc = makeDoc({
    _id: "admin1",
    email: "admin@test.local",
    role: "superadmin",
    refreshToken: hashSecret(adminPair.refreshToken),
  });
  const managerDoc = makeDoc({
    _id: "mgr1",
    email: "manager@test.local",
    role: "manager",
    refreshToken: hashSecret(mgrPair.refreshToken),
  });
  mock.method(Admin, "findById", (id) =>
    query(id === "admin1" ? adminDoc : managerDoc),
  );

  const adminHashBefore = adminDoc.refreshToken;
  const { accessToken, refreshToken: newMgrRefresh } =
    await authService.refreshAccessTokenService(mgrPair.refreshToken, "manager");

  assert.ok(accessToken);
  assert.equal(managerDoc.refreshToken, hashSecret(newMgrRefresh)); // rotated
  assert.equal(adminDoc.refreshToken, adminHashBefore); // untouched

  // And the superadmin session still refreshes fine afterwards.
  const out = await authService.refreshAccessTokenService(
    adminPair.refreshToken,
    "superadmin",
  );
  assert.ok(out.accessToken);
});

// ── independent logout ───────────────────────────────────────────────────────

test("logout revokes only that role's session and clears only its cookie", async () => {
  const updates = [];
  mock.method(
    Admin,
    "findByIdAndUpdate",
    async (id, update) => {
      updates.push({ id, update });
      return null;
    },
  );

  await authService.logoutAdminService("admin1");
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, "admin1");
  assert.ok(updates[0].update.$unset.refreshToken);
  assert.equal(updates[0].update.$inc.tokenVersion, 1);

  const adminRes = await callController(authController.logoutAdmin, {
    admin: { _id: "admin1" },
  });
  assert.deepEqual(adminRes.cleared, ["adminRefreshToken"]);

  const mgrRes = await callController(managerController.logoutManager, {
    admin: { _id: "mgr1" },
  });
  assert.deepEqual(mgrRes.cleared, ["managerRefreshToken"]);

  // The manager session survives the superadmin logout.
  const mgrPair = tokenPairFor("manager", "mgr1");
  const managerDoc = makeDoc({
    _id: "mgr1",
    email: "manager@test.local",
    role: "manager",
    refreshToken: hashSecret(mgrPair.refreshToken),
  });
  mock.method(Admin, "findById", () => query(managerDoc));
  const out = await authService.refreshAccessTokenService(
    mgrPair.refreshToken,
    "manager",
  );
  assert.ok(out.accessToken);
});

// ── token expiration ─────────────────────────────────────────────────────────

test("expired access token is rejected", async () => {
  const expired = jwt.sign(
    { _id: "admin1", role: "superadmin", tokenVersion: 0 },
    process.env.ACCESS_TOKEN_SECRET,
    { algorithm: "HS256", expiresIn: "-10s" },
  );
  const err = await runMiddleware(verifyJWT, {
    headers: { authorization: `Bearer ${expired}` },
  });
  assert.ok(err);
  assert.equal(err.statusCode, 401);
});

test("expired refresh token is rejected", async () => {
  const expired = jwt.sign(
    { _id: "mgr1", role: "manager", tokenVersion: 0 },
    process.env.REFRESH_TOKEN_SECRET,
    { algorithm: "HS256", expiresIn: "-10s" },
  );
  await assert.rejects(
    authService.refreshAccessTokenService(expired, "manager"),
    (err) => err.statusCode === 401,
  );
});

// ── unauthorized role access ─────────────────────────────────────────────────

test("manager refresh token is rejected at the superadmin endpoint without revoking the manager session", async () => {
  const mgrPair = tokenPairFor("manager", "mgr1");
  const managerDoc = makeDoc({
    _id: "mgr1",
    email: "manager@test.local",
    role: "manager",
    refreshToken: hashSecret(mgrPair.refreshToken),
  });
  mock.method(Admin, "findById", () => query(managerDoc));
  const revoke = mock.method(Admin, "findByIdAndUpdate", async () => null);

  const err = await authService
    .refreshAccessTokenService(mgrPair.refreshToken, "superadmin")
    .catch((e) => e);
  assert.equal(err.statusCode, 401);
  assert.equal(err.code, "ROLE_MISMATCH");

  // Crucially: no family revocation was triggered …
  assert.equal(revoke.mock.callCount(), 0);
  assert.equal(managerDoc.refreshToken, hashSecret(mgrPair.refreshToken));
  // … so the manager session still works at its own endpoint.
  const out = await authService.refreshAccessTokenService(
    mgrPair.refreshToken,
    "manager",
  );
  assert.ok(out.accessToken);
});

test("superadmin-only routes reject a manager access token", () => {
  assert.throws(
    () =>
      requireRole("superadmin")({ admin: { role: "manager" } }, {}, () => {}),
    (err) => err.statusCode === 403,
  );
  let nextCalled = false;
  requireRole("superadmin")({ admin: { role: "superadmin" } }, {}, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});

test("manager endpoints reject a superadmin access token", () => {
  assert.throws(
    () =>
      requireRole("manager")({ admin: { role: "superadmin" } }, {}, () => {}),
    (err) => err.statusCode === 403,
  );
});

// ── page reload ──────────────────────────────────────────────────────────────

test("page reload: each session is restored from its refresh cookie alone", async () => {
  // Simulate a fresh page load: no in-memory access token anywhere, only
  // the two HttpOnly cookies the browser kept.
  const adminPair = tokenPairFor("superadmin", "admin1");
  const mgrPair = tokenPairFor("manager", "mgr1");
  const adminDoc = makeDoc({
    _id: "admin1",
    email: "admin@test.local",
    role: "superadmin",
    refreshToken: hashSecret(adminPair.refreshToken),
  });
  const managerDoc = makeDoc({
    _id: "mgr1",
    email: "manager@test.local",
    role: "manager",
    refreshToken: hashSecret(mgrPair.refreshToken),
  });
  mock.method(Admin, "findById", (id) =>
    query(id === "admin1" ? adminDoc : managerDoc),
  );

  const adminRes = await callController(authController.refreshAccessToken, {
    cookies: { adminRefreshToken: adminPair.refreshToken },
  });
  const mgrRes = await callController(managerController.refreshManagerToken, {
    cookies: { managerRefreshToken: mgrPair.refreshToken },
  });

  assert.equal(adminRes.statusCode, 200);
  assert.ok(adminRes.body.data.accessToken);
  assert.ok(adminRes.cookies["adminRefreshToken"]); // rotated cookie re-issued
  assert.equal(mgrRes.statusCode, 200);
  assert.ok(mgrRes.body.data.accessToken);
  assert.ok(mgrRes.cookies["managerRefreshToken"]);
});
