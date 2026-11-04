// Catalog pagination optimization.
//
// Verifies: exact counts run only where needed (admin always, public page 1),
// hasNextPage comes from a limit+1 fetch on public page 2+, deterministic
// ordering with the _id tie-breaker (no duplicates/skips across pages),
// identical sort values paginate cleanly, filters/sorts are preserved, and
// the API response shape is backward compatible.
//
// The Car model is replaced with a faithful in-memory collection that
// applies the real filter/sort/skip/limit semantics of the query the
// service builds, so the tests exercise genuine query construction.

import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.IMAGEKIT_PUBLIC_KEY ||= "test_public";
process.env.IMAGEKIT_PRIVATE_KEY ||= "test_private";
process.env.IMAGEKIT_URL_ENDPOINT ||= "https://ik.imagekit.io/test";

const Car = (await import("../src/models/car.model.js")).default;
const {
  getAllCarsService,
  searchCarsService,
  filterCarsService,
} = await import("../src/services/car.service.js");

afterEach(() => mock.restoreAll());

// ── faithful in-memory collection ──────────────────────────────────────────

const matchesFilter = (doc, filter) => {
  for (const [key, cond] of Object.entries(filter || {})) {
    if (key === "$or") {
      if (!cond.some((sub) => matchesFilter(doc, sub))) return false;
      continue;
    }
    const val = doc[key];
    if (cond instanceof RegExp) {
      if (!cond.test(String(val ?? ""))) return false;
    } else if (cond !== null && typeof cond === "object" && !(cond instanceof Date)) {
      for (const [op, arg] of Object.entries(cond)) {
        if (op === "$ne" && String(val) === String(arg)) return false;
        if (op === "$gte" && !(val >= arg)) return false;
        if (op === "$lte" && !(val <= arg)) return false;
        if (op === "$in" && !arg.map(String).includes(String(val))) return false;
      }
    } else if (cond instanceof Date) {
      if (!(val instanceof Date) || val.getTime() !== cond.getTime()) return false;
    } else {
      if (String(val) !== String(cond)) return false;
    }
  }
  return true;
};

const compareDocs = (sort) => (a, b) => {
  for (const [key, dir] of Object.entries(sort || {})) {
    const av = a[key];
    const bv = b[key];
    let cmp;
    if (av instanceof Date && bv instanceof Date) cmp = av - bv;
    else if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
    if (cmp !== 0) return dir === -1 ? -cmp : cmp;
  }
  return 0;
};

// Zero-padded ids sort lexicographically in insertion order, like ObjectIds.
const makeDocs = (n, overrides = {}) =>
  Array.from({ length: n }, (_, i) => ({
    _id: `car${String(i).padStart(4, "0")}`,
    title: `Car ${i}`,
    brand: i % 2 === 0 ? "Toyota" : "Honda",
    model: "Model",
    year: 2020,
    price: 100 + i * 10,
    mileage: 5000 + i * 100,
    createdAt: new Date(Date.now() - i * 1000),
    isHidden: false,
    featured: false,
    isSold: false,
    fuelType: "Petrol",
    ...overrides,
  }));

const installCarMocks = (docs) => {
  const calls = { countDocuments: 0 };
  const queries = [];
  mock.method(Car, "find", (filter) => {
    const q = {
      _filter: filter,
      _sort: null,
      _skip: 0,
      _limit: null,
      select() { return q; },
      sort(s) { q._sort = s; return q; },
      skip(n) { q._skip = n; return q; },
      limit(n) { q._limit = n; return q; },
      async lean() {
        let out = docs.filter((d) => matchesFilter(d, q._filter));
        out = [...out].sort(compareDocs(q._sort));
        const lim = q._limit ?? out.length;
        return out.slice(q._skip, q._skip + lim);
      },
    };
    queries.push(q);
    return q;
  });
  mock.method(Car, "countDocuments", async (filter) => {
    calls.countDocuments++;
    return docs.filter((d) => matchesFilter(d, filter)).length;
  });
  return { calls, queries };
};

// ── count optimization ─────────────────────────────────────────────────────

test("public page 1 runs the exact count; pages expose full pagination", async () => {
  const { calls } = installCarMocks(makeDocs(25));
  const res = await getAllCarsService({ page: 1, limit: 10 });
  assert.equal(calls.countDocuments, 1);
  assert.equal(res.cars.length, 10);
  assert.deepEqual(res.pagination, {
    page: 1,
    limit: 10,
    totalCars: 25,
    totalPages: 3,
    hasNextPage: true,
    hasPrevPage: false,
  });
});

test("public page 2+ skips the count; hasNextPage comes from limit+1", async () => {
  const { calls } = installCarMocks(makeDocs(25));
  const p2 = await getAllCarsService({ page: 2, limit: 10 });
  assert.equal(calls.countDocuments, 0, "no exact count on scroll requests");
  assert.equal(p2.cars.length, 10);
  assert.equal(p2.pagination.totalCars, null);
  assert.equal(p2.pagination.totalPages, null);
  assert.equal(p2.pagination.hasNextPage, true);
  assert.equal(p2.pagination.hasPrevPage, true);

  const p3 = await getAllCarsService({ page: 3, limit: 10 });
  assert.equal(calls.countDocuments, 0);
  assert.equal(p3.cars.length, 5);
  assert.equal(p3.pagination.hasNextPage, false, "limit+1 detects the final page");
});

test("limit+1 never leaks the extra document", async () => {
  installCarMocks(makeDocs(10));
  const res = await getAllCarsService({ page: 1, limit: 10 });
  assert.equal(res.cars.length, 10);
  assert.equal(res.pagination.hasNextPage, false);
});

test("admin requests keep exact counts on every page (page jumps need totalPages)", async () => {
  const { calls } = installCarMocks(makeDocs(25));
  const admin = { _id: "admin1", role: "superadmin" };
  const res = await getAllCarsService({ page: 3, limit: 10 }, true, admin);
  assert.equal(calls.countDocuments, 1);
  assert.equal(res.pagination.totalPages, 3);
  assert.equal(res.pagination.hasNextPage, false);
  assert.equal(res.pagination.hasPrevPage, true);
});

test("empty catalog paginates cleanly", async () => {
  installCarMocks([]);
  const res = await getAllCarsService({ page: 1, limit: 10 });
  assert.deepEqual(res.cars, []);
  assert.deepEqual(res.pagination, {
    page: 1,
    limit: 10,
    totalCars: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
});

// ── determinism: no duplicates, no skips ───────────────────────────────────

test("pages partition the catalog with no duplicates or skips", async () => {
  installCarMocks(makeDocs(25));
  const ids = [];
  for (const page of [1, 2, 3]) {
    const res = await getAllCarsService({ page, limit: 10, sort: "newest" });
    ids.push(...res.cars.map((c) => c._id));
  }
  assert.equal(ids.length, 25);
  assert.equal(new Set(ids).size, 25, "no duplicates across pages");
});

test("ordering is deterministic across repeated requests", async () => {
  installCarMocks(makeDocs(25));
  const a = await getAllCarsService({ page: 1, limit: 10, sort: "price_asc" });
  const b = await getAllCarsService({ page: 1, limit: 10, sort: "price_asc" });
  assert.deepEqual(
    a.cars.map((c) => c._id),
    b.cars.map((c) => c._id),
  );
});

test("identical sort values paginate cleanly via the _id tie-breaker", async () => {
  const sameTime = new Date("2024-01-01T00:00:00Z");
  installCarMocks(makeDocs(25, { createdAt: sameTime }));
  const ids = [];
  for (const page of [1, 2, 3]) {
    const res = await getAllCarsService({ page, limit: 10, sort: "newest" });
    ids.push(...res.cars.map((c) => c._id));
  }
  assert.equal(new Set(ids).size, 25, "ties do not duplicate or skip");
  // Tie-breaker is _id descending for newest-first.
  const p1 = await getAllCarsService({ page: 1, limit: 25, sort: "newest" });
  const sorted = [...p1.cars.map((c) => c._id)].sort().reverse();
  assert.deepEqual(p1.cars.map((c) => c._id), sorted);
});

// ── sort / filter preservation ─────────────────────────────────────────────

test("all sort options keep their _id tie-breaker", async () => {
  const { queries } = installCarMocks(makeDocs(5));
  const expected = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    price_asc: { price: 1, _id: 1 },
    price_desc: { price: -1, _id: -1 },
    mileage_low: { mileage: 1, _id: 1 },
  };
  for (const [sort, want] of Object.entries(expected)) {
    queries.length = 0;
    await getAllCarsService({ page: 1, limit: 5, sort });
    assert.deepEqual(queries[0]._sort, want, `sort=${sort}`);
  }
});

test("price_asc actually returns ascending prices", async () => {
  installCarMocks(makeDocs(15));
  const res = await getAllCarsService({ page: 1, limit: 15, sort: "price_asc" });
  const prices = res.cars.map((c) => c.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
});

test("search filters by keyword, counts once, scrolls without recount", async () => {
  const { calls, queries } = installCarMocks(makeDocs(20));
  const p1 = await searchCarsService({ keyword: "Toyota", page: 1, limit: 10 });
  assert.equal(calls.countDocuments, 1);
  assert.ok(p1.cars.length > 0 && p1.cars.every((c) => c.brand === "Toyota"));
  assert.equal(p1.pagination.totalCars, 10);
  assert.equal(p1.keyword, "Toyota");

  const p2 = await searchCarsService({ keyword: "Toyota", page: 2, limit: 10 });
  assert.equal(calls.countDocuments, 1, "no recount on page 2");
  assert.equal(p2.cars.length, 0, "10 Toyota docs fit on page 1");
  assert.equal(p2.pagination.hasNextPage, false);
  assert.ok(queries[1]._filter.$or, "keyword $or filter preserved");
});

test("filter service applies ranges and sort, paginates without recount", async () => {
  const { calls } = installCarMocks(makeDocs(30));
  const p1 = await filterCarsService({
    minPrice: "150",
    maxPrice: "250",
    sort: "price_asc",
    page: 1,
    limit: 10,
  });
  assert.equal(calls.countDocuments, 1);
  assert.ok(p1.cars.every((c) => c.price >= 150 && c.price <= 250));
  const prices = p1.cars.map((c) => c.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  assert.ok(p1.appliedFilters, "appliedFilters still returned");

  const p2 = await filterCarsService({
    minPrice: "150",
    maxPrice: "250",
    sort: "price_asc",
    page: 2,
    limit: 10,
  });
  assert.equal(calls.countDocuments, 1, "no recount on page 2");
  assert.equal(p2.pagination.totalCars, null);
});

// ── backward compatibility ─────────────────────────────────────────────────

test("response shape is unchanged", async () => {
  installCarMocks(makeDocs(5));
  const res = await getAllCarsService({ page: 1, limit: 10 });
  assert.deepEqual(Object.keys(res).sort(), ["cars", "pagination"]);
  assert.deepEqual(Object.keys(res.pagination).sort(), [
    "hasNextPage",
    "hasPrevPage",
    "limit",
    "page",
    "totalCars",
    "totalPages",
  ]);
});
