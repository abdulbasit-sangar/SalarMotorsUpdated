// Runtime behaviour of the localization layer, exercised against the real app
// modules (via Vite SSR in a child process with a stubbed DOM/localStorage).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const harness = path.join(path.dirname(fileURLToPath(import.meta.url)), "runtimeHarness.mjs");

const run = (scenario, storage = {}) => {
  const res = spawnSync(process.execPath, [harness], {
    env: { ...process.env, SCENARIO: scenario, STORAGE: JSON.stringify(storage) },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120_000,
  });
  const line = res.stdout.split("\n").find((l) => l.startsWith("@@RESULT@@"));
  assert.ok(line, `harness produced no result.\nstdout: ${res.stdout.slice(-500)}\nstderr: ${res.stderr.slice(-800)}`);
  const out = JSON.parse(line.slice("@@RESULT@@".length));
  assert.equal(out.fatal, undefined, out.fatal);
  return out;
};

const text = (html) =>
  html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");

test("English is the default and LTR; the selector switches ps/fa-AF/en and updates <html lang/dir>", () => {
  const out = run("switch");
  assert.deepEqual(
    { lang: out.start.lang, dir: out.start.dir, language: out.start.language, stored: out.start.stored },
    { lang: "en", dir: "ltr", language: "en", stored: null }, // defaults; nothing stored until the user chooses
  );
  const [ps, fa, en, ps2] = out.steps;
  assert.deepEqual([ps.ok, ps.lang, ps.dir, ps.stored], [true, "ps", "rtl", "ps"]);
  assert.deepEqual([fa.ok, fa.lang, fa.dir, fa.stored], [true, "fa-AF", "rtl", "fa-AF"]);
  assert.deepEqual([en.ok, en.lang, en.dir, en.stored], [true, "en", "ltr", "en"]);
  assert.deepEqual([ps2.lang, ps2.dir], ["ps", "rtl"]);
  assert.equal(ps.home, "کورپاڼه");
  assert.equal(fa.home, "صفحه اصلی");
  assert.equal(en.home, "Home");
  assert.notEqual(ps.title, en.title, "tab title follows the language");
  assert.match(ps.title, /[\u0600-\u06FF]/);
  assert.ok(ps.rtlFont && fa.rtlFont, "Arabic-script font requested for RTL languages");
  assert.equal(out.rejected, false, "unsupported languages are refused");
  assert.equal(out.afterRejected, "ps", "a refused switch never overwrites the saved choice");
});

test("a saved language is restored on startup (refresh), including direction", () => {
  for (const [code, dir, home] of [["ps", "rtl", "کورپاڼه"], ["fa-AF", "rtl", "صفحه اصلی"], ["en", "ltr", "Home"]]) {
    const { state } = run("restore", { "safar.language": code });
    assert.deepEqual([state.language, state.lang, state.dir, state.home], [code, code, dir, home]);
  }
});

test("missing or corrupt saved language falls back to English, never to a raw key", () => {
  for (const storage of [{}, { "safar.language": "xx" }, { "safar.language": "" }]) {
    const { state } = run("restore", storage);
    assert.deepEqual([state.language, state.dir, state.home], ["en", "ltr", "Home"]);
  }
});

test("numbers, prices, dates, provinces and API messages format per language", () => {
  const { rows } = run("format");
  // English output is unchanged from before localization.
  assert.equal(rows.en.price, "12,500 AED");
  assert.equal(rows.en.priceUsd, "8,900 $"); // existing display format, unchanged
  assert.equal(rows.en.mileage, "85,000 km");
  assert.equal(rows.en.location, "Jalalabad, Kabul");

  for (const code of ["ps", "fa-AF"]) {
    const r = rows[code];
    // Latin digits (not Arabic-Indic), currency never converted, wrapped in an LTR isolate.
    assert.match(r.price, /^\u2066.*12,500 AED.*\u2069$/, code);
    assert.doesNotMatch(r.price + r.mileage + r.date, /[\u0660-\u0669\u06F0-\u06F9]/, `${code}: no Eastern-Arabic digits`);
    assert.match(r.mileage, /^\u2066.*85,000 km.*\u2069$/);
    assert.equal(r.priceUsd.replace(/[\u2066\u2069]/g, ""), "8,900 $", `${code}: same separators as English`);
    assert.match(r.date, /2026/, `${code}: Gregorian year`);
    // City is free text and kept; the province is translated.
    assert.match(r.location, /^Jalalabad، کابل$/);
    assert.match(r.category, /هرات/);
    assert.match(r.apiKnown, /[\u0600-\u06FF]/);
    assert.match(r.apiPlural, /5/);
    assert.match(r.apiPlural, /[\u0600-\u06FF]/);
    assert.equal(r.apiUnknown, "A message the backend adds tomorrow", "unknown server text is shown as-is, not as a key");
    assert.match(r.validation.email, /[\u0600-\u06FF]/);
    assert.match(r.validation.password, /[\u0600-\u06FF]/);
  }
  assert.equal(rows.en.validation.email, "Email is required");
  assert.notEqual(rows.ps.apiKnown, rows["fa-AF"].apiKnown, "Pashto and Dari are different texts");
});

test("every page renders in all three languages with the right content and no leaked English", () => {
  const out = run("pages");
  const english = out.english.filter((s) => typeof s === "string" && s.length >= 14 && s.includes(" ") && !s.includes("{{"));
  const failures = [];

  for (const code of ["en", "ps", "fa-AF"]) {
    const { html, errors, doc } = out.pages[code];
    assert.deepEqual(errors, {}, `${code}: pages that failed to render`);
    assert.equal(doc.dir, code === "en" ? "ltr" : "rtl");
    for (const [name, markup] of Object.entries(html)) {
      assert.ok(markup.length > 0, `${code}/${name} rendered nothing`);
      const visible = text(markup);
      if (/\bundefined\b|\bnull\b|\[object /.test(visible)) failures.push(`${code}/${name}: contains undefined/null`);
      if (code === "en") continue;
      // Specs is a fragment and Details is a loading skeleton during SSR: neither has prose to check.
      if (!/[\u0600-\u06FF]/.test(visible) && !["Specs", "Details"].includes(name))
        failures.push(`${code}/${name}: no Arabic-script text`);
      for (const s of english) if (visible.includes(s)) failures.push(`${code}/${name}: English leaked → "${s}"`);
    }
  }
  assert.deepEqual(failures, []);

  // Spot checks on content that must be translated while values stay intact.
  const ps = out.pages.ps.html;
  const fa = out.pages["fa-AF"].html;
  assert.match(text(ps.Specs), /1HGCM82633A004352/, "VIN preserved");
  assert.match(text(ps.Specs), /Toyota/, "brand preserved");
  assert.match(text(ps.Specs), /Corolla/, "model preserved");
  assert.match(text(ps.Specs), /کابل/, "province translated");
  assert.match(ps.Specs, /ltr-isolate/, "VIN isolated for bidi");
  assert.match(text(ps.Features), /ایربګونه/);
  assert.match(text(fa.Features), /ایربگ‌ها/);
  assert.match(text(ps.Features), /ABS/);
  assert.match(text(ps.Features), /4x4/);
  assert.match(text(ps.ImageStatusShort), /3 \/ 20/);
  assert.match(text(fa.ImageStatusShort), /حداقل 5/);
  assert.match(text(fa.ImageStatusOk), /7 \/ 20/);
  // The language selector shows the three endonyms and marks the active one.
  for (const code of ["en", "ps", "fa-AF"]) {
    const list = out.pages[code].html.LanguageList;
    assert.match(list, /English/);
    assert.match(list, /پښتو/);
    assert.match(list, /دری/);
    const checked = [...list.matchAll(/<button[^>]*aria-checked="true"[^>]*lang="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(checked, [code]);
  }
  // Navbar exposes the selector control with an accessible label.
  assert.match(out.pages.ps.html.Navbar, /aria-haspopup="listbox"/);
  assert.match(out.pages.ps.html.Navbar, /aria-label="ژبه: پښتو"/);
  assert.match(out.pages["fa-AF"].html.Navbar, /aria-label="زبان: دری"/);
  assert.match(out.pages.en.html.Navbar, /aria-label="Language: English"/);
});
