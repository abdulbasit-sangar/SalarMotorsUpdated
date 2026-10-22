// Translation integrity — runs in plain Node, no browser needed.
//  • every language ships every namespace, as valid JSON
//  • key parity with English (so nothing silently falls back), incl. plurals
//  • {{placeholders}} match English in every string
//  • Pashto/Dari strings are actually translated (not left in English)
//  • every static t("...") key used in the source exists in English
//  • every backend option value has a label key in every language
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LANGUAGES, NAMESPACES, NUMBER_LOCALE, getDirection, intlLocale, isSupportedLanguage, readStoredLanguage, writeStoredLanguage, STORAGE_KEY } from "./config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(here, "..", "locales");
const srcDir = path.join(here, "..");

const read = (lng, ns) => JSON.parse(fs.readFileSync(path.join(localesDir, lng, `${ns}.json`), "utf8"));
const flat = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
  );
const placeholders = (s) => [...String(s).matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

const CODES = LANGUAGES.map((l) => l.code);
const OTHERS = CODES.filter((c) => c !== "en");
const ARABIC_SCRIPT = /[\u0600-\u06FF]/;

// English strings that are intentionally identical/Latin in Pashto and Dari
// (brand names, technical acronyms, product names).
const LATIN_OK = new Set([
  "footer.copyright",
  "specs.vin",
  "options.feature.abs", "options.feature.usb", "options.feature.aux",
  "options.feature.apple_carplay", "options.feature.android_auto", "options.feature.4x4",
  "options.fuelType.cng", "options.bodyType.suv", "options.transmission.cvt",
]);

test("language configuration: codes, labels and directions", () => {
  assert.deepEqual(CODES, ["en", "ps", "fa-AF"]);
  assert.deepEqual(LANGUAGES.map((l) => l.label), ["English", "پښتو", "دری"]);
  assert.equal(getDirection("en"), "ltr");
  assert.equal(getDirection("ps"), "rtl");
  assert.equal(getDirection("fa-AF"), "rtl");
  assert.equal(getDirection("unknown"), "ltr"); // safe default
  assert.ok(isSupportedLanguage("ps") && !isSupportedLanguage("fr"));
});

test("dates keep Latin digits and the Gregorian calendar in every language", () => {
  for (const code of CODES) {
    const year = new Intl.DateTimeFormat(intlLocale(code), { year: "numeric" }).format(new Date("2026-03-01T12:00:00Z"));
    assert.equal(year, "2026", code);
    const full = new Intl.DateTimeFormat(intlLocale(code), { dateStyle: "medium" }).format(new Date("2026-03-01T12:00:00Z"));
    assert.doesNotMatch(full, /[\u0660-\u0669\u06F0-\u06F9]/, `${code} must not use Arabic-Indic digits`);
  }
});

test("numbers use one unambiguous convention in every language (no '12.500' for 12,500)", () => {
  for (const code of CODES) {
    // Guard the premise: the language's own CLDR grouping can differ, which is why NUMBER_LOCALE exists.
    assert.equal(new Intl.NumberFormat(NUMBER_LOCALE).format(12500), "12,500", code);
  }
});

test("persisted language: stored choice is restored, junk is ignored, errors are swallowed", () => {
  const store = new Map();
  const storage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) };
  assert.equal(readStoredLanguage(storage), null); // nothing stored → caller defaults to English
  for (const code of CODES) {
    writeStoredLanguage(code, storage);
    assert.equal(store.get(STORAGE_KEY), code);
    assert.equal(readStoredLanguage(storage), code);
  }
  store.set(STORAGE_KEY, "klingon");
  assert.equal(readStoredLanguage(storage), null);
  writeStoredLanguage("klingon", storage);
  assert.equal(store.get(STORAGE_KEY), "klingon"); // unchanged: unsupported codes are never written
  const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  assert.equal(readStoredLanguage(broken), null);
  assert.doesNotThrow(() => writeStoredLanguage("ps", broken));
});

test("every language ships every namespace as valid JSON", () => {
  for (const lng of CODES) {
    for (const ns of NAMESPACES) {
      const file = path.join(localesDir, lng, `${ns}.json`);
      assert.ok(fs.existsSync(file), `missing ${lng}/${ns}.json`);
      assert.doesNotThrow(() => JSON.parse(fs.readFileSync(file, "utf8")), `${lng}/${ns}.json`);
    }
    const extra = fs.readdirSync(path.join(localesDir, lng)).filter((f) => !NAMESPACES.includes(f.replace(".json", "")));
    assert.deepEqual(extra, [], `${lng} has unregistered files`);
  }
});

test("key parity with English (no missing, no stray keys), including plural forms", () => {
  const problems = [];
  for (const ns of NAMESPACES) {
    const en = new Map(flat(read("en", ns)));
    for (const lng of OTHERS) {
      const other = new Map(flat(read(lng, ns)));
      for (const k of en.keys()) if (!other.has(k)) problems.push(`${lng}/${ns}: missing ${k}`);
      for (const k of other.keys()) if (!en.has(k)) problems.push(`${lng}/${ns}: stray ${k}`);
    }
  }
  assert.deepEqual(problems, []);
});

test("placeholders match English and no value is empty", () => {
  const problems = [];
  for (const ns of NAMESPACES) {
    const en = new Map(flat(read("en", ns)));
    for (const lng of OTHERS) {
      for (const [k, v] of flat(read(lng, ns))) {
        if (typeof v !== "string" || !v.trim()) problems.push(`${lng}/${ns}.${k}: empty`);
        else if (en.has(k) && placeholders(v).join() !== placeholders(en.get(k)).join())
          problems.push(`${lng}/${ns}.${k}: placeholders ${placeholders(en.get(k))} ≠ ${placeholders(v)}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("Pashto and Dari are translated, not left in English", () => {
  const problems = [];
  for (const ns of NAMESPACES) {
    for (const lng of OTHERS) {
      for (const [k, v] of flat(read(lng, ns))) {
        if (!ARABIC_SCRIPT.test(v) && !LATIN_OK.has(`${ns === "options" ? "options." : ""}${k}`) && !LATIN_OK.has(k))
          problems.push(`${lng}/${ns}.${k}: "${v}" has no Arabic-script text`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("Dari uses Afghan vocabulary and avoids Iranian-only terms", () => {
  const all = (lng) => NAMESPACES.flatMap((ns) => flat(read(lng, ns)).map(([, v]) => v)).join("\n");
  const dari = all("fa-AF");
  // Afghan Dari says موتر for "car"; Iranian Persian says ماشین / خودرو.
  assert.doesNotMatch(dari, /ماشین|خودرو/);
  assert.match(dari, /موتر/);
  // Afghan Dari says معلومات, not Iranian اطلاعات.
  assert.doesNotMatch(dari, /اطلاعات/);
});

test("every static t('…') key used by the source exists in English", () => {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "locales" || e.name === "node_modules") continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(jsx?)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p);
    }
  };
  walk(srcDir);

  const en = Object.fromEntries(NAMESPACES.map((ns) => [ns, new Set(flat(read("en", ns)).map(([k]) => k))]));
  const hasKey = (ns, key) =>
    en[ns]?.has(key) || en[ns]?.has(`${key}_other`) || en[ns]?.has(`${key}_one`);

  const missing = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    // namespaces this file binds: useTranslation("x"), plus common as default
    const bound = new Set([...src.matchAll(/useTranslation\(\s*"(\w+)"\s*\)/g)].map((m) => m[1]));
    if (/useTranslation\(\s*\)/.test(src) || bound.size === 0) bound.add("common");
    // imageRules.js receives the "admin"-namespace `t` from its callers.
    if (path.basename(file) === "imageRules.js") bound.add("admin");
    const calls = [...src.matchAll(/\b(?:t|tv|i18n\.t)\(\s*(["'])([A-Za-z0-9_.:-]+)\1([^)]*)/g)];
    for (const [, , rawKey, rest] of calls) {
      let ns = null;
      let key = rawKey;
      if (key.includes(":")) [ns, key] = key.split(":");
      const nsOpt = rest.match(/ns:\s*"(\w+)"/);
      if (nsOpt) ns = nsOpt[1];
      const candidates = ns ? [ns] : [...bound];
      // validators.js binds the validation namespace through its tv() helper
      if (/tv\(/.test(src) && rawKey && path.basename(file) === "validators.js") candidates.push("validation");
      if (!candidates.some((c) => hasKey(c, key))) missing.push(`${path.relative(srcDir, file)}: ${rawKey} (looked in ${candidates.join(",")})`);
    }
  }
  assert.deepEqual(missing, []);
});

test("every backend option value has a label key in every language", async () => {
  const backend = path.join(srcDir, "..", "..", "Backend", "src", "constants", "car.constants.js");
  if (!fs.existsSync(backend)) return; // frontend-only checkout
  const c = await import(pathToFileURL(backend).href);
  const arr = (v) => (Array.isArray(v) ? v : Object.values(v));
  const key = (v) => String(v).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const expectations = {
    province: [...arr(c.PROVINCES), ...arr(c.SPECIAL_LOCATIONS)],
    featureGroup: c.FEATURE_GROUPS.map((g) => g.group || g.label),
    feature: c.FEATURE_GROUPS.flatMap((g) => g.features),
    fuelType: arr(c.FUEL_TYPE),
    bodyType: arr(c.BODY_TYPE),
    transmission: arr(c.TRANSMISSION),
    condition: arr(c.CONDITION),
  };
  const problems = [];
  for (const lng of CODES) {
    const opts = read(lng, "options");
    for (const [group, values] of Object.entries(expectations)) {
      assert.ok(values.length > 0, `could not read ${group} from backend constants`);
      for (const v of values) if (!opts[group]?.[key(v)]) problems.push(`${lng}: options.${group}.${key(v)} (${v})`);
    }
  }
  assert.deepEqual(problems, []);
});
