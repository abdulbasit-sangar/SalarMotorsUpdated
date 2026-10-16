import test from "node:test";
import assert from "node:assert/strict";
import { cached } from "./cache.js";

test("a stale failed request does not evict a newer cached request", async () => {
  let rejectFirst;
  let resolveSecond;
  let fetchCount = 0;

  const firstRequest = cached(
    "retry-race",
    () =>
      new Promise((_, reject) => {
        rejectFirst = reject;
      }),
    -1,
  );
  const secondRequest = cached("retry-race", () => {
    fetchCount += 1;
    return new Promise((resolve) => {
      resolveSecond = resolve;
    });
  });

  rejectFirst(new Error("temporary failure"));
  await assert.rejects(firstRequest, /temporary failure/);

  const thirdRequest = cached("retry-race", () => {
    fetchCount += 1;
    return Promise.resolve("unexpected duplicate");
  });

  assert.strictEqual(thirdRequest, secondRequest);
  assert.equal(fetchCount, 1);

  resolveSecond("recovered");
  assert.equal(await thirdRequest, "recovered");
});
