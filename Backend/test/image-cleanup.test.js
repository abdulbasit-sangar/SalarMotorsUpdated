// Image cleanup reliability across multiple backend instances.
//
// Verifies: atomic task claiming (exactly one winner under genuine
// concurrency), lease expiry + safe recovery, stale workers cannot
// modify reclaimed tasks, pre-deletion reference protection, idempotent
// handling of already-deleted files, bounded retries with backoff,
// permanent vs temporary failures, worker-restart recovery, and that
// database failures never silently lose tasks.
//
// The ImageCleanupTask model is replaced with a faithful in-memory fake
// that implements the exact filter/update shapes the service uses —
// including the atomic findOneAndUpdate claim — so the concurrency tests
// exercise the real claiming logic. ImageKit is mocked at the
// imagekit.deleteFile seam, so the real deleteFromImageKit /
// deleteManyFromImageKit code (404 handling, permanent flag) runs.

import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

process.env.IMAGEKIT_PUBLIC_KEY ||= "test_public";
process.env.IMAGEKIT_PRIVATE_KEY ||= "test_private";
process.env.IMAGEKIT_URL_ENDPOINT ||= "https://ik.imagekit.io/test";

const ImageCleanupTask = (await import("../src/models/imageCleanupTask.model.js")).default;
const Car = (await import("../src/models/car.model.js")).default;
const ListingCreation = (await import("../src/models/listingCreation.model.js")).default;
const imagekit = (await import("../src/config/imagekit.js")).default;
const {
  processImageCleanupTask,
  processPendingImageCleanup,
  releaseWorkerLeases,
} = await import("../src/services/imageCleanup.service.js");

afterEach(() => mock.restoreAll());

// ── faithful in-memory task collection ─────────────────────────────────────

const makeFakeTasks = (seed = []) => {
  const docs = new Map();
  for (const d of seed) docs.set(String(d._id), { ...d });

  const matchCond = (doc, key, cond) => {
    const val = doc[key];
    if (cond !== null && typeof cond === "object" && !(cond instanceof Date) && !Array.isArray(cond)) {
      for (const [op, arg] of Object.entries(cond)) {
        if (op === "$in") {
          const norm = (v) => (v instanceof Date ? v.getTime() : String(v));
          if (!arg.some((a) => norm(a) === norm(val))) return false;
        } else if (op === "$lte") {
          if (!(val <= arg)) return false;
        } else if (op === "$lt") {
          if (!(val < arg)) return false;
        } else {
          return false;
        }
      }
      return true;
    }
    if (cond === null) return val === null || val === undefined;
    if (val instanceof Date && cond instanceof Date) {
      return val.getTime() === cond.getTime();
    }
    return String(val) === String(cond);
  };

  const matches = (doc, filter) => {
    for (const [key, cond] of Object.entries(filter)) {
      if (key === "$or") {
        if (!cond.some((f) => matches(doc, f))) return false;
        continue;
      }
      if (!matchCond(doc, key, cond)) return false;
    }
    return true;
  };

  const applyUpdate = (doc, update) => {
    if (update.$set) for (const [k, v] of Object.entries(update.$set)) doc[k] = v;
    if (update.$inc) for (const [k, v] of Object.entries(update.$inc)) doc[k] = (doc[k] || 0) + v;
  };

  return {
    get: (id) => docs.get(String(id)),
    mutate: (id, patch) => Object.assign(docs.get(String(id)), patch),
    claims: [],
    async findOneAndUpdate(filter, update, opts = {}) {
      for (const doc of docs.values()) {
        if (matches(doc, filter)) {
          if (update?.$set?.claimedBy) this.claims.push(update.$set.claimedBy);
          applyUpdate(doc, update);
          return { ...doc };
        }
      }
      return null;
    },
    async find(filter) {
      return [...docs.values()].filter((d) => matches(d, filter)).map((d) => ({ ...d }));
    },
    async updateMany(filter, update) {
      let n = 0;
      for (const doc of docs.values()) {
        if (matches(doc, filter)) {
          applyUpdate(doc, update);
          n++;
        }
      }
      return { modifiedCount: n };
    },
  };
};

const installTaskMocks = (fake) => {
  mock.method(ImageCleanupTask, "findOneAndUpdate", (f, u, o) => fake.findOneAndUpdate(f, u, o));
  mock.method(ImageCleanupTask, "find", (filter) => ({
    sort: () => ({ limit: async () => fake.find(filter) }),
  }));
  mock.method(ImageCleanupTask, "updateMany", (f, u) => fake.updateMany(f, u));
};

const mockNoReferences = () =>
  mock.method(Car, "find", () => ({ lean: async () => [] }));
const mockReferences = (carId, publicIds) =>
  mock.method(Car, "find", () => ({
    lean: async () => [
      { _id: carId, images: publicIds.map((public_id) => ({ public_id })) },
    ],
  }));

const mockDeleteFile = (impl) => mock.method(imagekit, "deleteFile", impl);
const okDelete = () => mockDeleteFile(async () => ({}));
const failDelete = (statusCode) =>
  mockDeleteFile(async () => {
    const err = new Error(`ImageKit ${statusCode}`);
    err.statusCode = statusCode;
    throw err;
  });

const pendingTask = (overrides = {}) => ({
  _id: "task1",
  operationKey: "op:task1",
  operation: "upload_rollback",
  carId: null,
  images: [{ url: "https://x/img1", public_id: "img1" }],
  imagePublicId: null,
  status: "pending",
  attempts: 0,
  nextAttemptAt: new Date(Date.now() - 1000),
  lastError: null,
  claimedBy: null,
  leaseUntil: null,
  ...overrides,
});

const withDbConnected = (t) => {
  const conn = mongoose.connection;
  const prev = conn.readyState;
  Object.defineProperty(conn, "readyState", {
    value: 1,
    configurable: true,
    writable: true,
  });
  t.after(() =>
    Object.defineProperty(conn, "readyState", {
      value: prev,
      configurable: true,
      writable: true,
    }),
  );
};

// ── concurrency ────────────────────────────────────────────────────────────

test("concurrent claim: exactly one worker wins", async () => {
  const fake = makeFakeTasks([pendingTask()]);
  installTaskMocks(fake);
  mockNoReferences();
  okDelete();

  // Gate inside the claim so all three workers are genuinely in flight
  // before any of them evaluates the atomic filter.
  let inFlight = 0;
  const waiting = [];
  const orig = ImageCleanupTask.findOneAndUpdate;
  mock.method(ImageCleanupTask, "findOneAndUpdate", async (filter, update, opts) => {
    if (update?.$set?.status === "processing" && update?.$set?.claimedBy) {
      inFlight++;
      if (inFlight < 3) await new Promise((r) => waiting.push(r));
      else waiting.forEach((r) => r());
    }
    return orig(filter, update, opts);
  });

  const results = await Promise.all([
    processImageCleanupTask({ _id: "task1" }, "worker-a"),
    processImageCleanupTask({ _id: "task1" }, "worker-b"),
    processImageCleanupTask({ _id: "task1" }, "worker-c"),
  ]);
  const winners = results.filter(Boolean);
  assert.equal(winners.length, 1, "exactly one worker claims the task");
  assert.equal(fake.claims.length, 1, "exactly one atomic claim succeeded");
  assert.ok(["worker-a", "worker-b", "worker-c"].includes(fake.claims[0]));
  assert.equal(fake.get("task1").status, "completed");
});

test("expired lease allows another worker to recover the task", async () => {
  const fake = makeFakeTasks([
    pendingTask({
      status: "processing",
      claimedBy: "worker-a",
      leaseUntil: new Date(Date.now() - 1000),
      attempts: 1,
    }),
  ]);
  installTaskMocks(fake);
  mockNoReferences();
  okDelete();

  const result = await processImageCleanupTask({ _id: "task1" }, "worker-b");
  assert.ok(result, "worker-b reclaims the expired task");
  assert.deepEqual(fake.claims, ["worker-b"]);
  assert.equal(result.attempts, 2);
  assert.equal(fake.get("task1").status, "completed");
});

test("a stale worker cannot complete a task reclaimed by another worker", async () => {
  const fake = makeFakeTasks([pendingTask()]);
  installTaskMocks(fake);
  mockNoReferences();

  // Worker A's delete hangs mid-processing.
  let calls = 0;
  const releaseA = [];
  mockDeleteFile((fileId) => {
    calls++;
    if (calls === 1) return new Promise((r) => releaseA.push(() => r({})));
    return Promise.resolve({});
  });

  const aPromise = processImageCleanupTask({ _id: "task1" }, "worker-a");
  // Let A park inside the ImageKit delete.
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  assert.equal(fake.get("task1").claimedBy, "worker-a");

  // A's lease expires; worker B reclaims and finishes.
  fake.mutate("task1", { leaseUntil: new Date(Date.now() - 1000) });
  const bResult = await processImageCleanupTask({ _id: "task1" }, "worker-b");
  assert.equal(bResult.status, "completed");
  assert.equal(bResult.claimedBy, null);

  // A's stale completion attempt must be a no-op.
  releaseA.forEach((r) => r());
  const aResult = await aPromise;
  assert.equal(aResult, null, "stale worker's terminal update is rejected");
  assert.equal(fake.get("task1").status, "completed");
  assert.equal(calls, 2, "both attempted the idempotent delete");
});

test("two workers process different tasks concurrently", async () => {
  const fake = makeFakeTasks([
    pendingTask({ _id: "task1", operationKey: "op:1" }),
    pendingTask({ _id: "task2", operationKey: "op:2" }),
  ]);
  installTaskMocks(fake);
  mockNoReferences();
  okDelete();

  const [r1, r2] = await Promise.all([
    processImageCleanupTask({ _id: "task1" }, "worker-a"),
    processImageCleanupTask({ _id: "task2" }, "worker-b"),
  ]);
  assert.equal(r1.status, "completed");
  assert.equal(r2.status, "completed");
});

// ── image safety ───────────────────────────────────────────────────────────

test("unreferenced image is deleted", async () => {
  const fake = makeFakeTasks([pendingTask()]);
  installTaskMocks(fake);
  mockNoReferences();
  const deleted = [];
  mockDeleteFile(async (fileId) => {
    deleted.push(fileId);
    return {};
  });

  const result = await processImageCleanupTask({ _id: "task1" }, "worker-a");
  assert.deepEqual(deleted, ["img1"]);
  assert.equal(result.status, "completed");
  assert.equal(result.lastError, null);
});

test("image referenced by an active listing is never deleted", async () => {
  const fake = makeFakeTasks([pendingTask()]);
  installTaskMocks(fake);
  mockReferences("car9", ["img1"]);
  const deleted = [];
  mockDeleteFile(async (fileId) => {
    deleted.push(fileId);
    return {};
  });

  const result = await processImageCleanupTask({ _id: "task1" }, "worker-a");
  assert.deepEqual(deleted, [], "referenced image must not reach ImageKit");
  assert.equal(result.status, "completed");
  assert.match(result.lastError, /still referenced/);
});

test("image_delete skips images referenced by another listing, pulls its own", async () => {
  const fake = makeFakeTasks([
    pendingTask({
      operation: "image_delete",
      carId: "car1",
      imagePublicId: "img1",
    }),
  ]);
  installTaskMocks(fake);
  // Referenced by a DIFFERENT car — must be retained.
  mockReferences("car2", ["img1"]);
  const deleted = [];
  mockDeleteFile(async (fileId) => {
    deleted.push(fileId);
    return {};
  });
  const pulled = [];
  mock.method(Car, "findByIdAndUpdate", async (id, update) => {
    pulled.push([String(id), update]);
    return {};
  });

  const result = await processImageCleanupTask({ _id: "task1" }, "worker-a");
  assert.deepEqual(deleted, [], "image used by another listing is retained");
  assert.deepEqual(pulled, [], "its reference is not pulled either");
  assert.equal(result.status, "completed");
});

test("image_delete deletes and pulls when only its own listing references it", async () => {
  const fake = makeFakeTasks([
    pendingTask({
      operation: "image_delete",
      carId: "car1",
      imagePublicId: "img1",
    }),
  ]);
  installTaskMocks(fake);
  mockReferences("car1", ["img1"]);
  const deleted = [];
  mockDeleteFile(async (fileId) => {
    deleted.push(fileId);
    return {};
  });
  const pulled = [];
  mock.method(Car, "findByIdAndUpdate", async (id, update) => {
    pulled.push([String(id), update]);
    return {};
  });

  const result = await processImageCleanupTask({ _id: "task1" }, "worker-a");
  assert.deepEqual(deleted, ["img1"]);
  assert.equal(pulled.length, 1);
  assert.deepEqual(pulled[0][1], { $pull: { images: { public_id: "img1" } } });
  assert.equal(result.status, "completed");
});

test("already-deleted ImageKit files are handled idempotently", async () => {
  const fake = makeFakeTasks([pendingTask()]);
  installTaskMocks(fake);
  mockNoReferences();
  failDelete(404);

  const result = await processImageCleanupTask({ _id: "task1" }, "worker-a");
  assert.equal(result.status, "completed", "404 is success, not a retry");
  assert.equal(result.attempts, 1);
});

// ── failure and recovery ───────────────────────────────────────────────────

test("temporary ImageKit failure retries with backoff", async () => {
  const fake = makeFakeTasks([pendingTask()]);
  installTaskMocks(fake);
  mockNoReferences();
  failDelete(500);

  const before = Date.now();
  const result = await processImageCleanupTask({ _id: "task1" }, "worker-a");
  assert.equal(result.status, "failed");
  assert.equal(result.attempts, 1);
  const delay = result.nextAttemptAt.getTime() - before;
  assert.ok(delay >= 55_000 && delay <= 65_000, `first retry ~60s, got ${delay}ms`);
});

test("backoff grows with attempts", async () => {
  const fake = makeFakeTasks([pendingTask({ attempts: 5 })]);
  installTaskMocks(fake);
  mockNoReferences();
  failDelete(500);

  const before = Date.now();
  const result = await processImageCleanupTask({ _id: "task1" }, "worker-a");
  assert.equal(result.status, "failed");
  assert.equal(result.attempts, 6);
  const delay = result.nextAttemptAt.getTime() - before;
  // 60s * 2^(6-1) = 1920s
  assert.ok(delay >= 1900_000 && delay <= 1940_000, `6th attempt ~1920s, got ${delay}ms`);
});

test("attempts beyond the max reach the exhausted final state", async () => {
  const fake = makeFakeTasks([pendingTask({ attempts: 9 })]);
  installTaskMocks(fake);
  mockNoReferences();
  failDelete(500);

  const result = await processImageCleanupTask({ _id: "task1" }, "worker-a");
  assert.equal(result.status, "exhausted");
  assert.equal(result.attempts, 10);
  assert.equal(result.nextAttemptAt, null, "exhausted tasks are never rescheduled");
  assert.match(result.lastError, /will not retry/);
});

test("permanent ImageKit failure exhausts immediately", async () => {
  const fake = makeFakeTasks([pendingTask()]);
  installTaskMocks(fake);
  mockNoReferences();
  failDelete(400);

  const result = await processImageCleanupTask({ _id: "task1" }, "worker-a");
  assert.equal(result.status, "exhausted");
  assert.equal(result.attempts, 1, "no pointless retries for 4xx");
  assert.match(result.lastError, /Permanent/);
});

test("worker restart recovers an interrupted task via the pending sweep", async (t) => {
  withDbConnected(t);
  const fake = makeFakeTasks([
    pendingTask({
      status: "processing",
      claimedBy: "worker-old",
      leaseUntil: new Date(Date.now() - 1000),
      attempts: 3,
    }),
  ]);
  installTaskMocks(fake);
  mock.method(ListingCreation, "find", () => ({ limit: async () => [] }));
  mockNoReferences();
  const deleted = [];
  mockDeleteFile(async (fileId) => {
    deleted.push(fileId);
    return {};
  });

  await processPendingImageCleanup("worker-new");
  assert.deepEqual(deleted, ["img1"], "restarted worker picked up the task");
  assert.equal(fake.get("task1").status, "completed");
  assert.equal(fake.get("task1").claimedBy, null);
});

test("database failure during claim never loses the task", async (t) => {
  withDbConnected(t);
  const fake = makeFakeTasks([pendingTask()]);
  installTaskMocks(fake);
  mock.method(ListingCreation, "find", () => ({ limit: async () => [] }));
  // Only the claim itself fails; the guarded last-resort update must still
  // run (and correctly do nothing, since the claim never happened).
  mock.method(ImageCleanupTask, "findOneAndUpdate", async (filter, update, opts) => {
    if (update?.$inc) throw new Error("connection reset");
    return fake.findOneAndUpdate(filter, update, opts);
  });

  await processPendingImageCleanup("worker-a");
  const doc = fake.get("task1");
  assert.equal(doc.status, "pending", "task untouched — still eligible");
  assert.equal(doc.attempts, 0, "claim never happened");
});

test("shutdown releases in-flight leases for immediate reclaim", async (t) => {
  withDbConnected(t);
  const fake = makeFakeTasks([pendingTask({ _id: "task1" })]);
  installTaskMocks(fake);
  mockNoReferences();

  // Park worker A inside the ImageKit delete (in-flight, lease held).
  const releaseA = [];
  mockDeleteFile(() => new Promise((r) => releaseA.push(() => r({}))));
  const aPromise = processImageCleanupTask({ _id: "task1" }, "worker-a");
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  assert.equal(fake.get("task1").claimedBy, "worker-a");

  const released = await releaseWorkerLeases("worker-a");
  assert.equal(released, 1);
  assert.ok(fake.get("task1").leaseUntil.getTime() < Date.now(), "lease expired now");

  // Cleanup: let A finish; its guarded completion still applies (it owns it).
  releaseA.forEach((r) => r());
  const aResult = await aPromise;
  assert.equal(aResult.status, "completed");
});
