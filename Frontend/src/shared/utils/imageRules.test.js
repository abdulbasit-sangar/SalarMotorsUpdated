import test from "node:test";
import assert from "node:assert/strict";
import {
  IMAGE_LIMITS,
  resolveImageLimits,
  countValidImages,
  getPublishStatus,
  getPublishMessages,
  remainingSlots,
  countSelectableFiles,
} from "./imageRules.js";

const imgs = (n) =>
  Array.from({ length: n }, (_, i) => ({ url: `https://ik.imagekit.io/t/${i}.jpg`, public_id: `id_${i}` }));

test("defaults are min 5 / max 20", () => {
  assert.deepEqual({ ...IMAGE_LIMITS }, { min: 5, max: 20 });
});

test("server-provided limits win; garbage falls back to defaults", () => {
  assert.deepEqual(resolveImageLimits({ min: 3, max: 30 }), { min: 3, max: 30 });
  assert.deepEqual(resolveImageLimits(undefined), { min: 5, max: 20 });
  assert.deepEqual(resolveImageLimits({ min: "5", max: null }), { min: 5, max: 20 });
  assert.deepEqual(resolveImageLimits({ min: 9, max: 4 }), { min: 9, max: 20 }); // max < min is nonsense
});

// Messages are built from translation keys; this stand-in `t` mirrors the
// English locale so the wording the admin sees is still pinned by a test.
const en = {
  "images.counter": "{{count}} / {{max}} images",
  "images.requirement": "Upload at least {{min}} images to publish this listing.",
  "images.missing": (p) =>
    `You have ${p.have} of the ${p.min} required — add ${p.count} more image${p.count === 1 ? "" : "s"}.`,
};
const t = (key, params) =>
  typeof en[key] === "function"
    ? en[key](params)
    : en[key].replace(/{{(\w+)}}/g, (_, k) => params[k]);

test("counter label reads like '3 / 20 images'", () => {
  assert.equal(getPublishMessages(t, getPublishStatus(3)).counterLabel, "3 / 20 images");
  assert.equal(getPublishMessages(t, getPublishStatus(0)).counterLabel, "0 / 20 images");
});

test("fewer than 5 images cannot publish and the message says exactly what is missing", () => {
  for (const n of [0, 1, 2, 3, 4]) {
    const s = getPublishStatus(n);
    assert.equal(s.canPublish, false, `n=${n}`);
    const m = getPublishMessages(t, s);
    assert.equal(m.requirementMessage, "Upload at least 5 images to publish this listing.");
    assert.equal(s.missing, 5 - n);
    assert.match(m.missingMessage, new RegExp(`You have ${n} of the 5 required`));
  }
  assert.match(getPublishMessages(t, getPublishStatus(4)).missingMessage, /add 1 more image\./); // singular
  assert.match(getPublishMessages(t, getPublishStatus(3)).missingMessage, /add 2 more images\./);
});

test("exactly 5 and exactly 20 images can publish", () => {
  for (const n of [5, 12, 20]) {
    const s = getPublishStatus(n);
    assert.equal(s.canPublish, true);
    assert.equal(s.missing, 0);
    assert.equal(getPublishMessages(t, s).missingMessage, null);
  }
  assert.equal(getPublishStatus(20).remaining, 0);
});

test("removing an image updates eligibility: 5 → 4 flips to not publishable", () => {
  assert.equal(getPublishStatus(countValidImages(imgs(5))).canPublish, true);
  assert.equal(getPublishStatus(countValidImages(imgs(5).slice(1))).canPublish, false);
});

test("failed uploads, empty entries and invalid objects never count as attached", () => {
  const attached = [
    ...imgs(3),
    null,
    undefined,
    {},
    { url: "", public_id: "x" },
    { url: "https://x/y.jpg" },
    { public_id: "only-id" },
    new File(["x"], "local.jpg", { type: "image/jpeg" }), // selected locally, not attached
  ];
  assert.equal(countValidImages(attached), 3);
  assert.equal(getPublishStatus(countValidImages(attached)).canPublish, false);
  assert.equal(countValidImages(undefined), 0);
});

test("remainingSlots counts images already attached (18 existing → 2 more)", () => {
  assert.equal(remainingSlots(18), 2);
  assert.equal(remainingSlots(20), 0);
  assert.equal(remainingSlots(25), 0);
  assert.equal(remainingSlots(0), 20);
  assert.equal(remainingSlots(18, { min: 5, max: 30 }), 12);
});

test("empty local files are not selectable images", () => {
  const ok = new File(["abc"], "a.jpg", { type: "image/jpeg" });
  const empty = new File([], "b.jpg", { type: "image/jpeg" });
  assert.equal(countSelectableFiles([ok, empty, null]), 1);
});
