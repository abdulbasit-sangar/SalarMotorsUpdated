// Tests for useAsyncData request cancellation.
//
// The real hook file is imported (not a copy) with "react" and the API
// client swapped for test doubles via the module loader below, so these
// tests exercise the actual shipped control flow: signal passing,
// physical abort, stale-response guards, and unmount cleanup.

import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./support/hook-loader.mjs", import.meta.url);

const { useAsyncData } = await import("../src/shared/hooks/useAsyncData.js");
const { renderHook } = await import("./support/react-shim.mjs");

const flush = () => new Promise((r) => setTimeout(r, 5));

const cancelError = () =>
  Object.assign(new Error("canceled"), {
    code: "ERR_CANCELED",
    name: "CanceledError",
  });

test("passes an AbortSignal to the fetcher and aborts it on unmount", () => {
  let seen;
  const fetcher = ({ signal }) => {
    seen = signal;
    return new Promise(() => {});
  };
  const h = renderHook(useAsyncData, [fetcher, []]);
  assert.ok(seen instanceof AbortSignal, "fetcher receives a real AbortSignal");
  assert.equal(seen.aborted, false);
  h.unmount();
  assert.equal(seen.aborted, true, "unmount physically aborts the request");
});

test("refetch() aborts the previous request before starting a new one", () => {
  const signals = [];
  const fetcher = ({ signal }) => {
    signals.push(signal);
    return new Promise(() => {});
  };
  const h = renderHook(useAsyncData, [fetcher, []]);
  assert.equal(signals.length, 1);
  h.result.refetch();
  assert.equal(signals.length, 2);
  assert.equal(signals[0].aborted, true, "previous request aborted");
  assert.equal(signals[1].aborted, false, "new request is live");
});

test("a cancelled request is not reported as an error and releases loading", async () => {
  const h = renderHook(useAsyncData, [() => Promise.reject(cancelError()), []]);
  assert.equal(h.result.loading, true);
  await flush();
  h.rerender();
  assert.equal(h.result.error, null, "cancel never becomes a user-facing error");
  assert.equal(h.result.loading, false, "loading is released");
  assert.equal(h.result.data, null);
});

test("stale responses cannot overwrite newer data when the fetcher ignores the signal", async () => {
  const resolvers = [];
  const fetcher = () => new Promise((r) => resolvers.push(r)); // no signal support
  const h = renderHook(useAsyncData, [fetcher, ["a"]]);
  h.rerender([fetcher, ["b"]]); // deps change: abort (no-op) + new run
  resolvers[1]("fresh");
  await flush();
  h.rerender();
  assert.equal(h.result.data, "fresh");
  resolvers[0]("stale");
  await flush();
  h.rerender();
  assert.equal(h.result.data, "fresh", "older response ignored");
  assert.equal(h.result.loading, false);
});

test("an older response cannot overwrite newer data (slow vs fast)", async () => {
  const resolvers = [];
  const fetcher = () => new Promise((r) => resolvers.push(r));
  const h = renderHook(useAsyncData, [fetcher, ["a"]]);
  h.result.refetch();
  resolvers[0]("first");
  await flush();
  h.rerender();
  assert.equal(h.result.data, null, "superseded response ignored");
  resolvers[1]("second");
  await flush();
  h.rerender();
  assert.equal(h.result.data, "second");
});

test("strict-mode double effect: first request aborted, second wins", async () => {
  const signals = [];
  const resolvers = [];
  const fetcher = ({ signal }) => {
    signals.push(signal);
    return new Promise((r) => resolvers.push(r));
  };
  const h = renderHook(useAsyncData, [fetcher, []]);
  h.reinvokeEffects(); // cleanup + re-effect, like React StrictMode
  assert.equal(signals[0].aborted, true, "first request aborted");
  assert.equal(signals[1].aborted, false);
  resolvers[0]("first");
  await flush();
  h.rerender();
  assert.equal(h.result.data, null);
  resolvers[1]("second");
  await flush();
  h.rerender();
  assert.equal(h.result.data, "second");
  assert.equal(h.result.loading, false);
});

test("successful request updates data and clears loading", async () => {
  const h = renderHook(useAsyncData, [() => Promise.resolve("hello"), []]);
  assert.equal(h.result.loading, true);
  assert.equal(h.result.data, null);
  await flush();
  h.rerender();
  assert.equal(h.result.data, "hello");
  assert.equal(h.result.loading, false);
  assert.equal(h.result.error, null);
});

test("non-cancel errors still surface via parseApiError", async () => {
  const h = renderHook(useAsyncData, [() => Promise.reject(new Error("boom")), []]);
  await flush();
  h.rerender();
  assert.equal(h.result.error.message, "boom");
  assert.equal(h.result.loading, false);
  assert.equal(h.result.data, null);
});

test("no state updates happen after unmount", async () => {
  let resolveFetch;
  const fetcher = () => new Promise((r) => (resolveFetch = r));
  const h = renderHook(useAsyncData, [fetcher, []]);
  h.unmount();
  resolveFetch("late");
  await flush();
  h.rerender();
  assert.equal(h.result.data, null, "late response ignored after unmount");
  assert.equal(h.result.error, null);
});

test("hook keeps its public API shape", async () => {
  const h = renderHook(useAsyncData, [() => Promise.resolve(1), []]);
  assert.deepEqual(Object.keys(h.result).sort(), ["data", "error", "loading", "refetch"]);
  assert.equal(typeof h.result.refetch, "function");
});
