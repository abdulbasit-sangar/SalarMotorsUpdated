// Child-process harness for runtime.test.js. Boots the REAL app modules via
// Vite's SSR loader with a stubbed DOM + localStorage and prints one JSON
// line. A fresh process per scenario keeps i18next's singleton state clean.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const scenario = process.env.SCENARIO;
const initialStorage = JSON.parse(process.env.STORAGE || "{}");

// ── stubbed browser globals ──────────────────────────────────────────────────
const store = new Map(Object.entries(initialStorage));
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
};
const meta = { content: "", setAttribute(_k, v) { this.content = v; } };
const head = { children: [], appendChild(el) { this.children.push(el); } };
globalThis.document = {
  documentElement: { lang: "", dir: "" },
  head,
  title: "",
  getElementById: (id) => head.children.find((c) => c.id === id) || null,
  createElement: () => ({}),
  querySelector: (sel) => (sel === 'meta[name="description"]' ? meta : null),
};
const snapshot = () => ({
  lang: document.documentElement.lang,
  dir: document.documentElement.dir,
  title: document.title,
  description: meta.content,
  stored: store.get("safar.language") ?? null,
  rtlFont: !!document.getElementById("rtl-font"),
});

const vite = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const load = (p) => vite.ssrLoadModule(p);
const req = createRequire(root + "/");
const React = req("react");
const { renderToStaticMarkup } = req("react-dom/server");
const { MemoryRouter, Routes, Route } = req("react-router-dom");
const h = React.createElement;

const out = {};
try {
  const { initI18n, setLanguage } = await load("/src/i18n/index.js");
  const i18n = (await load("/src/i18n/index.js")).default;

  if (scenario === "switch") {
    await initI18n();
    out.start = { ...snapshot(), language: i18n.language };
    out.steps = [];
    for (const code of ["ps", "fa-AF", "en", "ps"]) {
      const ok = await setLanguage(code);
      out.steps.push({ code, ok, language: i18n.language, home: i18n.t("nav.home", { ns: "layout" }), ...snapshot() });
    }
    out.rejected = await setLanguage("fr");
    out.afterRejected = snapshot().stored;
  }

  if (scenario === "restore") {
    await initI18n();
    out.state = { ...snapshot(), language: i18n.language, home: i18n.t("nav.home", { ns: "layout" }) };
  }

  if (scenario === "format") {
    await initI18n();
    const fmt = await load("/src/shared/utils/format.js");
    const msgs = await load("/src/services/api/apiMessages.js");
    out.rows = {};
    for (const code of ["en", "ps", "fa-AF"]) {
      await setLanguage(code);
      out.rows[code] = {
        price: fmt.formatPrice(12500, "AED"),
        priceUsd: fmt.formatPrice(8900, "USD"),
        mileage: fmt.formatMileage(85000, "km"),
        date: fmt.formatDate("2026-03-15T00:00:00Z"),
        location: fmt.carLocation({ city: "Jalalabad", province: "Kabul" }),
        category: fmt.carLocation({ province: "From America to Herat" }),
        apiKnown: msgs.localizeApiMessage("Invalid email or password"),
        apiPlural: msgs.localizeApiMessage("Upload at least 5 images to publish this listing."),
        apiUnknown: msgs.localizeApiMessage("A message the backend adds tomorrow"),
        validation: (await load("/src/shared/utils/validators.js")).validateLoginForm({ email: "", password: "" }),
      };
    }
  }

  if (scenario === "pages") {
    await initI18n();
    const { AuthProvider } = await load("/src/store/auth/AuthContext.jsx");
    const { ToastProvider } = await load("/src/store/ui/ToastContext.jsx");
    const { FavoritesProvider } = await load("/src/store/favorites/FavoritesContext.jsx");
    const pages = {
      Home: "/src/features/catalog/home/HomePage.jsx",
      Listings: "/src/features/catalog/filters/FilterResultsPage.jsx",
      Search: "/src/features/catalog/search/SearchResultsPage.jsx",
      Favorites: "/src/features/catalog/favorites/FavoritesPage.jsx",
      Login: "/src/features/auth/login/LoginPage.jsx",
      Register: "/src/features/auth/register/RegisterPage.jsx",
      ManagerRegister: "/src/features/auth/manager-register/ManagerRegisterPage.jsx",
      Forgot: "/src/features/auth/forgot-password/ForgotPasswordPage.jsx",
      Dashboard: "/src/features/admin/dashboard/DashboardPage.jsx",
      Managers: "/src/features/admin/managers/ManagersPage.jsx",
      ManageListings: "/src/features/admin/manage-listings/ManageListingsPage.jsx",
      CreateListing: "/src/features/admin/create-listing/CreateListingPage.jsx",
      NotFound: "/src/app/router/NotFoundPage.jsx",
      Navbar: "/src/app/layout/Navbar.jsx",
      Footer: "/src/app/layout/Footer.jsx",
      AdminSidebar: "/src/app/layout/AdminSidebar.jsx",
      LanguageList: "/src/shared/components/LanguageSwitcher.jsx",
    };
    const wrap = (el, entry = "/") =>
      h(MemoryRouter, { initialEntries: [entry] }, h(ToastProvider, null, h(AuthProvider, null, h(FavoritesProvider, null, el))));
    const render = async (name, file) => {
      const mod = await load(file);
      const C = mod.default ?? mod.Navbar ?? mod.Footer ?? mod.AdminSidebar;
      if (name === "LanguageList") return renderToStaticMarkup(wrap(h(mod.LanguageSwitcher, { variant: "list" })));
      if (name === "AdminSidebar") return renderToStaticMarkup(wrap(h(mod.AdminSidebar, {})));
      return renderToStaticMarkup(wrap(h(C), name === "Search" ? "/search?keyword=Toyota" : "/"));
    };
    // CarDetailsPage needs a route param
    const details = await load("/src/features/catalog/details/CarDetailsPage.jsx");
    const specs = await load("/src/features/catalog/details/SpecsGrid.jsx");
    const status = await load("/src/shared/components/ImageCountStatus.jsx");
    const features = await load("/src/shared/components/FeaturesList.jsx");

    out.pages = {};
    for (const code of ["en", "ps", "fa-AF"]) {
      await setLanguage(code);
      out.pages[code] = { ...{ doc: snapshot() }, html: {}, errors: {} };
      for (const [name, file] of Object.entries(pages)) {
        try { out.pages[code].html[name] = await render(name, file); }
        catch (e) { out.pages[code].errors[name] = String(e?.message || e).slice(0, 200); }
      }
      try {
        out.pages[code].html.Details = renderToStaticMarkup(wrap(h(Routes, null, h(Route, { path: "/cars/:id", element: h(details.default) })), "/cars/abc123"));
        const car = { brand: "Toyota", model: "Corolla", year: 2022, price: 15000, currency: "USD", mileage: 12000, mileageUnit: "km", condition: "Used", fuelType: "Petrol", bodyType: "Sedan", transmission: "Automatic", engineCC: 1800, province: "Kabul", city: "Kabul", vin: "1HGCM82633A004352", color: "White" };
        out.pages[code].html.Specs = renderToStaticMarkup(wrap(h(specs.SpecsGrid, { car })));
        out.pages[code].html.Features = renderToStaticMarkup(wrap(h(features.FeaturesList, { featureGroups: [{ group: "Safety", features: ["Airbags", "ABS", "360° Camera"] }, { group: "Off-Road & Drive", features: ["4x4"] }], selectedFeatures: ["Airbags", "ABS", "360° Camera", "4x4"] })));
        out.pages[code].html.ImageStatusShort = renderToStaticMarkup(h(status.ImageCountStatus, { count: 3, needsPublish: true }));
        out.pages[code].html.ImageStatusOk = renderToStaticMarkup(h(status.ImageCountStatus, { count: 7, needsPublish: true }));
      } catch (e) { out.pages[code].errors.Extras = String(e?.message || e).slice(0, 200); }
    }
    // English strings (for the leak check in the test)
    const fs = await import("node:fs");
    const ns = ["common", "layout", "home", "catalog", "auth", "admin", "validation", "options"];
    out.english = [];
    const walk = (o) => Object.values(o).forEach((v) => (typeof v === "object" ? walk(v) : out.english.push(v)));
    for (const n of ns) walk(JSON.parse(fs.readFileSync(`${root}/src/locales/en/${n}.json`, "utf8")));
  }
} catch (e) {
  out.fatal = String(e?.stack || e).slice(0, 800);
}
await vite.close();
// Large output + process.exit() can truncate a piped stdout; exit on flush.
process.stdout.write("@@RESULT@@" + JSON.stringify(out) + "\n", () => process.exit(0));
