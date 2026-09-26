# Salar Motors — UI Redesign, Phase 1: Foundation

Scope of this phase: design tokens (color/type/glass system) + Navbar + Hero + Vehicle Cards.
No backend, API, auth, routing, or business logic touched anywhere.

## How to apply

Option A — patch (preferred, preserves history):
```
cd Salar_Motors
git apply phase1-foundation-navbar-hero-cards.patch
```
If it doesn't apply cleanly (e.g. you've since changed these files), use Option B.

Option B — manual copy:
Copy the files in this zip into the matching paths under `Frontend/`, overwriting the
originals. The folder structure mirrors the repo (`Frontend/src/...`).

Then:
```
cd Frontend
npm install
npm run dev
```

## What changed, and why

**`tailwind.config.js` + `src/shared/styles/index.css`** — the whole design system.
New bright/warm palette (paper background, deep-ink text, refined brass/gold accent),
a distinctive display typeface (Bricolage Grotesque, paired with Inter body / IBM Plex
Mono for data), and a small set of new component classes: `.glass-panel`,
`.glass-panel-strong`, `.glass-nav`, `.chip-glass`, `.chip-dark`. These are used
selectively (navbar, hero search, filters, modals) — not applied to whole sections.

Because color values are still driven by the same CSS variable / Tailwind token
names the rest of the app already uses (`bg-graphite-950`, `text-bone`, `bg-brass`,
etc.), **every other page picks up the new palette automatically**, even before its
layout is redesigned in later phases. You'll notice Browse, Details, Auth, and Admin
already look "warmer" even though I haven't touched their files yet — that's expected
and intentional.

I also fixed a real pre-existing contrast bug: `text-graphite-950` (used for button/badge
text on the gold accent) was resolving to a near-white value, making primary button
text almost unreadable. It now resolves to the dark ink token. Purely a CSS value fix,
no logic touched.

**`Navbar.jsx`** — visual rebuild only. Same links, same mobile drawer state machine,
same search-overlay logic, same `useEscapeKey` / body-scroll-lock behavior. Now a
floating frosted-glass bar, glass mobile drawer, and glass search overlay.

**`HeroSection.jsx` + `HeroSearchBar.jsx`** — `HeroSection` now accepts an optional
`heroCar` prop (wired in `HomePage.jsx` to the first featured listing) and uses that
vehicle's real photo as a cinematic background with a gradient scrim, falling back to
the existing grain/gradient treatment if there's no featured car yet. I did not hotlink
the reference images from the brief (openai.com CDN links) — those aren't stable,
production-safe image sources; using real inventory photos is both more correct
engineering and matches "use existing project vehicle images" from the brief. Search
fields, values, and submit-to-`/filter` logic are unchanged.

**`CarCard.jsx` + `Skeleton.jsx`** — the app previously had two divergent card themes
(a "premium" light card and a plain dark "tag-shape" card, selected by a `premium`
prop). Collapsed into one consistent premium product card used everywhere, with glass
badges over the image and pill-style "dashboard chip" spec rows (location/mileage) —
the one recurring signature motif tying the glass system to an automotive feel.
`premium`/`sponsored` props are still accepted for backward compatibility with existing
call sites (CarSection, Search, Filters, Listings) — no call-site changes needed.

**`Badge.jsx` / `Button.jsx`** — same variants/API, refined visuals (rounded-full badges,
new `glass` badge variant, slightly softer button radii and hover states).

**`icons.jsx`** — added Search, Close, Menu, ChevronDown, ArrowRight, Calendar,
SteeringWheel, Fuel, Check, Sliders icons in the same stroke style as the existing
CarSilhouette/Gauge/MapPin icons, for use in later phases (filters, specs, forms).

## Verified

- `npm run build` succeeds (no errors)
- Playwright screenshots at 1440px and 375px — no horizontal scroll, mobile drawer and
  hero both readable and usable one-handed
- No files outside `Frontend/` touched; no API/service/store files touched

## Known gaps (intentional — later phases)

- Homepage sections below the hero (Categories, Why Choose Us, How It Works, About)
  inherited the new colors but not yet the new card/spacing system
- Browse, Filters, Vehicle Details, Auth, Admin — not yet touched structurally
- Full 320–430px QA pass across all pages — only Home has been checked so far

## Next phase

Phase 2: Browse & Search — listings grid, `FilterPanel` (incl. mobile bottom-sheet),
`SearchBar`/`SearchResultsPage`.
# Salar Motors — UI Redesign, Phase 2: Browse & Search

Scope of this phase: listings grid header/controls, the filter system (new shared
bottom-sheet/glass-drawer component), search results page, and the shared primitives
that support them (Input/Select, Pagination, EmptyState, ErrorState, SearchBar).

No backend, API, auth, routing, or business logic touched. Depends on Phase 1's design
tokens (`tailwind.config.js`, `index.css`) already being applied — apply Phase 1 first
if you haven't.

## How to apply

```
cd Salar_Motors
git apply phase2-browse-search-filters.patch
```
or copy the files in this zip into matching paths under `Frontend/`.

```
cd Frontend
npm install
npm run dev
```

## What changed, and why

**`FilterSheet.jsx` (new)** — the centerpiece of this phase. A single shared component
that renders as:
- a **full-height bottom sheet** on mobile — drag-handle affordance, rounded top
  corners, scrollable body, sticky-safe
- a **floating glass drawer** sliding in from the right on tablet/desktop

Previously `ListingsPage.jsx` and `FilterResultsPage.jsx` each had their own duplicated
centered-modal markup (same modal on every screen size, including mobile — not what the
brief asked for). Both now use `FilterSheet`, which also owns the escape-key handling
and body-scroll-lock that used to be duplicated in each page.

**`FilterPanel.jsx`** — same fields, same validation (min/max range check), same
`onApply`/`onReset` contract. Visually reorganized into labeled sections (Vehicle,
Location & Color, Specifications, Ranges, Sort) and given a sticky Apply/Reset footer
that stays visible while scrolling through a long filter list — important on mobile
where the field list runs well past one screen.

**`ListingsPage.jsx` / `FilterResultsPage.jsx`** — headers rebuilt with the glass pill
Filters/Sort buttons, wired to `FilterSheet` instead of the old inline modal. All
fetching, URL param logic, pagination, and filter-apply/reset handlers are untouched.

**`SteeringListingsPage.jsx` / `SearchResultsPage.jsx`** — heading weight touched up
for visual consistency with the rest of the catalog pages. No logic changes.

**`Input.jsx`** (Input/Select/Textarea) — restyled to the bright glass system
(rounded-xl, frosted background, brass focus ring). This is a shared primitive used
by filters now and by Auth/Admin forms in later phases — low-risk, high-reuse change.

**`Pagination.jsx`** — rounded-pill page buttons matching the new system, same
windowed-page-list logic.

**`EmptyState.jsx` / `ErrorState.jsx`** — softer icon treatment (circle badge), used
across every listing/search/filter page — no prop or behavior changes.

**`SearchBar.jsx`** — pill-shaped with a leading search icon, matching the new input
language. Same submit-to-`/search?keyword=` logic, same props.

## Verified

- `npm run build` succeeds (no errors)
- Playwright screenshots at 1440px and 375px:
  - Browse header (Filters/Sort controls) — desktop and mobile
  - Filter sheet open — desktop glass drawer and mobile bottom sheet
  - Search results page
- No horizontal scroll or overlapping controls at 375px
- No files outside `Frontend/` touched; no API/service/store files touched

Note: screenshots show an "Couldn't load this" error card on data-dependent sections —
that's expected in this environment since there's no backend running against the
preview build, not a UI defect. It's a good incidental check that `ErrorState` renders
correctly.

## Known gaps (intentional — later phases)

- Vehicle Details page (gallery, specs, related vehicles) — Phase 3
- Auth screens — Phase 4
- Admin/Manager dashboards — Phase 5
- Footer, modals, loading states + full mobile QA pass — Phase 6

## Next phase

Phase 3: Vehicle Details — `CarDetailsPage`, `ImageGallery`, `SpecsGrid`, related
vehicles section.
# Salar Motors — UI Redesign, Phase 3: Vehicle Details

Scope of this phase: the vehicle details page (`CarDetailsPage`), the image gallery,
and the specifications grid.

No backend, API, auth, routing, or business logic touched. Depends on Phase 1's design
tokens being applied — apply Phases 1 and 2 first if you haven't.

## How to apply

```
cd Salar_Motors
git apply phase3-vehicle-details.patch
```
or copy the files in this zip into matching paths under `Frontend/`.

**One thing to note:** `icons.jsx` is included as a full file, not a patch fragment,
because it already picked up new icons in Phase 1. Overwriting it with the copy in
this zip is safe either way — it's a strict superset (adds `GearIcon` and `EngineIcon`
on top of what Phase 1 added). If you already applied Phase 1 and don't want to
overwrite the whole file, just add these two exports manually instead.

```
cd Frontend
npm install
npm run dev
```

## What changed, and why

**`ImageGallery.jsx`** — same active-image state and thumbnail-click logic, restyled:
rounded glass frame around the main image, a small glass image-counter badge
("2 / 5") in the corner instead of no page indicator at all, and rounded thumbnail
tiles with a brass active-border instead of a plain highlight.

**`SpecsGrid.jsx`** — same fields, same `null`/`undefined` filtering logic. Added
icons per spec (calendar for year/imported date, gauge for mileage, fuel pump, gear
for transmission, steering wheel, engine) — this follows the brief's icon mapping
directly and reuses the existing spec-icon set from Phase 1 plus two new icons
(`GearIcon`, `EngineIcon`) added to `icons.jsx` in the same stroke style as the rest.

**`CarDetailsPage.jsx`** — restructured hierarchy, same data fetching
(`useAsyncData`, `fetchCarById`, `fetchSimilarCars`), same loading/error states:
- Back link now has a chevron icon instead of a text arrow
- Badges use the new glass/brass/neutral variants from Phase 1
- Price is now presented in its own glass panel directly under the title — it's
  the first thing a buyer looks for, so it's promoted above the description
  instead of sitting plainly inline
- Description and Specifications each got a proper section heading
- On mobile, the grid naturally collapses to the brief's recommended order:
  gallery → thumbnails → badges → title → location → price → description →
  specs → related vehicles (verified in QA, no forced two-column layout)

## Verified

- `npm run build` succeeds (no errors)
- Playwright screenshots at 1440px and 375px, using mocked API responses (this
  sandbox has no live backend) to render the page with real vehicle data — confirms
  gallery, badges, price panel, description, spec icons, and mobile stacking order
  all render correctly
- No horizontal scroll or overlap at 375px

## Known gaps (intentional — later phases)

- Auth screens — Phase 4
- Admin/Manager dashboards — Phase 5
- Footer, modals, loading states + full mobile QA pass — Phase 6

## Next phase

Phase 4: Auth screens — Login, Register, Forgot/Reset Password, OTP.
# Salar Motors — UI Redesign, Phase 4: Auth Screens

Scope of this phase: Login, Register (initial admin), Forgot/Reset Password + OTP,
Manager Register + email-verification OTP, and the Admin Profile page (incl. Change
Password).

No backend, API, auth logic, RBAC, or validation touched. Depends on Phase 1/2's
design tokens and `Input`/`Button`/`Badge` components — apply Phases 1–3 first if you
haven't.

## How to apply

```
cd Salar_Motors
git apply phase4-auth-screens.patch
```
or copy the files in this zip into matching paths under `Frontend/`.

**Also apply `hotfix-invalid-tailwind-class.patch`** (see below — separate patch,
apply it too, it's small and fixes a real visual bug from earlier phases).

```
cd Frontend
npm install
npm run dev
```

## What changed, and why

**`features/auth/shared/AuthCard.jsx` (new)** — every one of the 5 auth pages had
its own copy-pasted `StepHeading` component, its own error-banner markup, and the
same `min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-16` wrapper.
Extracted into one shared file: `AuthShell`, `AuthHeading`, `AuthCardPanel`,
`AuthFormError`, `AuthFootnote`. No auth state or logic lives here — every page still
owns its own `useState`, validation, and API calls exactly as before.

One incidental correctness fix bundled into `AuthShell`: the old wrapper hardcoded
`calc(100vh-64px)`, a leftover from before Phase 1 changed the navbar height to 76px.
It now reads `calc(100vh-var(--header-h,76px))`, matching the actual navbar height
token from Phase 1's `index.css`.

**`LoginPage.jsx`** — same state, same `login()` call, same redirect-after-login
logic. The password show/hide toggle now uses `EyeIcon`/`EyeOffIcon` (added to the
shared icon set) instead of two inline SVGs, and sits inside a glass card panel.

**`RegisterPage.jsx`** — same one-time-admin-registration logic, including the
403-means-already-set-up handling. Visual only.

**`ForgotPasswordPage.jsx`** — same 4-step state machine (email → otp → reset →
done), same countdown/resend-cooldown timers, same API calls. The OTP input keeps
its centered, letter-spaced numeric styling; each step now sits in its own glass
card.

**`ManagerRegisterPage.jsx`** — same 3-step flow (register → verify → done), same
API calls. Visual only, mirrors ForgotPasswordPage's presentation for consistency.

**`ProfilePage.jsx`** — same admin data display, same change-password form and
logic, same logout handling. The account summary and change-password form are now
in glass panels; the show/hide toggle for the change-password section is now a
rotating chevron icon instead of text ("Hide"/"Show").

## A real bug found and fixed (separate hotfix patch)

While testing the password-visibility toggle, the eye icon didn't render — `h-4.5`
and `w-4.5` are not valid Tailwind classes (Tailwind's default spacing scale doesn't
include a `4.5` step), so any element sized with them renders at 0×0. I swept the
whole codebase for the same mistake and found it in two more places from earlier
phases: the mobile navbar's search-close button (Phase 1) and the filter sheet's
close button (Phase 2) — both icons have been invisible (though still clickable,
since the button itself still had a hit area) since those phases shipped.

Fixed all three by replacing `h-4.5 w-4.5` with the valid `h-[18px] w-[18px]`.

Because `Navbar.jsx` and `FilterSheet.jsx` belong to earlier phases, this fix ships
as a **separate small patch** — `hotfix-invalid-tailwind-class.patch` — rather than
being folded into this zip, so it applies whether or not you've already merged
Phases 1–2 into your own branch. It's two lines total. Apply it alongside this phase.

## Verified

- `npm run build` succeeds (no errors)
- Playwright screenshots at 1000px and 375px: Login (including the password-reveal
  state, confirming the eye icon fix), Register, Forgot Password step 1
- Confirmed via screenshot that the mobile navbar close icon is now visible
  (previously invisible due to the bug above)
- No horizontal scroll or overlap at 375px

## Known gaps (intentional — later phases)

- Admin/Manager dashboards — Phase 5
- Footer, modals, loading states + full mobile QA pass — Phase 6

## Next phase

Phase 5: Admin/Manager dashboards — listing management, manager accounts, CRUD forms.
# Salar Motors — UI Redesign, Phase 5: Admin/Manager Dashboards

Scope of this phase: the admin shell (sidebar + mobile drawer), Dashboard, Manage
Listings, Managers, and Create Listing.

No backend, API, RBAC, or business logic touched. Depends on earlier phases' design
tokens and shared components (`Input`, `Button`, `Badge`, `Pagination`, `EmptyState`,
`ErrorState`) — apply Phases 1–4 first if you haven't.

## How to apply

```
cd Salar_Motors
git apply phase5-admin-dashboard.patch
```
or copy the files in this zip into matching paths under `Frontend/`.

**Note on `icons.jsx`:** included as a full file again, same reasoning as Phase 3 —
it's cumulative across phases (Phase 1, 3, and 4 each added icons). This version is a
strict superset; safe to overwrite regardless of which earlier phases you've applied.
It adds four icons for this phase: `PlusIcon`, `UsersIcon`, `UserIcon`, `DashboardIcon`.

```
cd Frontend
npm install
npm run dev
```

## What changed, and why

**`AdminSidebar.jsx`** — same links, same RBAC-based superadmin-only "Managers" link
logic, same active-route highlighting. Each link now has an icon (Dashboard, car
silhouette, plus, user, users) and the active state is a soft rounded-pill highlight
instead of the old uppercase-text-with-left-border treatment.

**`AdminLayout.jsx`** — same logout handling, same escape-key/drawer-state logic. The
mobile drawer now matches the same glass slide-in pattern used by the public site's
Navbar and FilterSheet (Phases 1–2) instead of a plain opaque dark panel, so the admin
section feels like part of the same product rather than a bolted-on dashboard.

**`StatCard.jsx`** — glass panel instead of a flat dark card. Same `loading`/`accent`
props, same skeleton-while-loading behavior.

**`DashboardPage.jsx`** — heading weight touched up for consistency. All data fetching
(`Promise.all` over cars/RHD/LHD/featured counts) and the `FEATURED_CAP` display logic
are untouched.

**`ManageListingsPage.jsx` / `AdminCarRow.jsx`** — the "hidden listings" info banner
and each listing row restyled to the premium card system. Every action
(feature/unfeature, hide/unhide, delete with confirm, view live) and the RBAC check
that hides Feature/Delete from non-superadmins is untouched.

**`ManagersPage.jsx`** — same restyle treatment applied to `ManagerRow`. Activate/
deactivate/delete logic, confirm dialogs, and local-state syncing after each action
are untouched.

**`CreateListingPage.jsx`** — the four repeated `bg-graphite-800 border border-steel`
section wrappers (Core Details, Location, Specifications, Media) became glass panels
with a consistent heading style. Every field, every validation rule, and the submit
handler are untouched — this was purely a find-and-replace on the wrapper markup.

**`ImageUploader.jsx`** — dropzone restyled with the glass hover/drag states, preview
tiles get rounded corners and a proper `CloseIcon` (SVG component) on the remove
button instead of a plain "✕" character. Upload validation (file type, 5MB limit,
20-file max) and drag/drop handling are untouched.

## A near-miss worth mentioning

While building the new sidebar icons, I initially wrote `w-4.5 h-4.5` again — the
exact invalid-Tailwind-class mistake fixed in Phase 4's hotfix. Caught it before it
shipped this time and used the same `h-[18px] w-[18px]` pattern. Re-ran a full
codebase sweep afterward and confirmed there are no other instances anywhere.

## Verified

- `npm run build` succeeds (no errors)
- Playwright screenshots at 1440px and 375px, using mocked auth + API responses (this
  sandbox has no live backend): Dashboard, Manage Listings, Managers, Create Listing,
  mobile dashboard, and the mobile drawer all render correctly
- Confirmed all sidebar/drawer icons render at their intended size (not 0×0)
- No horizontal scroll or overlap at 375px

## Known gaps (intentional — next phase)

- Footer redesign
- Modal-specific polish pass (some modals already got the glass treatment as a side
  effect of `FilterSheet` in Phase 2, but a dedicated pass hasn't been done)
- Loading/empty/error state polish beyond what `EmptyState`/`ErrorState`/`Skeleton`
  already got in Phase 2
- Full 320–430px mobile QA pass across every page, not just the ones spot-checked
  per-phase

## Next phase

Phase 6: Footer, modals, loading/empty/error states, and a full mobile QA sweep
(320–430px) across the whole app.
# Salar Motors — UI Redesign, Phase 6: Footer, Modals, States & Mobile QA

Final phase. Scope: Footer polish, toast/notification restyle, offline banner, crash
screen (`ErrorBoundary`), the dev placeholder component, and a full mobile QA sweep
across the app.

No backend, API, or logic touched. Depends on all previous phases.

## How to apply

```
cd Salar_Motors
git apply phase6-footer-modals-qa.patch
```
or copy the files in this zip into matching paths under `Frontend/`.

```
cd Frontend
npm install
npm run dev
```

## What changed, and why

**`Footer.jsx`** — social icons changed from square to rounded-full glass buttons to
match the pill/glass language used everywhere else (Navbar, FilterSheet, badges).
Border and background tokens updated to the `border-card` / warm-tinted-section
convention used elsewhere. All links and content untouched.

**`ToastViewport.jsx`** — the main "modal-adjacent" surface still on the old dark
card style. Restyled as a glass panel with a colored left accent bar (green/red/brass
by type) instead of a full colored border, using the shared `CheckIcon`/`CloseIcon`
components instead of raw "✓"/"✕" characters. Same toast queue, same dismiss
behavior, same auto-timeout logic in `ToastContext` (untouched).

**`ErrorBoundary.jsx`** — the full-screen crash fallback. Previously used a
`tag-shape` clip-path badge reading "ERR // CRASH" in the old dark theme. Restyled to
match the pattern used by `ErrorState` elsewhere in the app (circular danger icon,
glass card) — so if the whole app tree ever crashes, the person doesn't hit a jarring
visual regression back to the pre-redesign look. Reload behavior unchanged.

**`OfflineBanner.jsx`** — same online/offline detection logic, softer visual
treatment (no more shouting uppercase red bar).

**`PagePlaceholder.jsx`** — heading weight consistency only.

## Full mobile QA sweep

Checked at 320px, 375px, and 414px — the brief's three mandatory mobile
breakpoints — across Home, Browse/Listings, About, and Login:

- **Zero horizontal scroll** at any width, on any of the checked pages (verified
  programmatically via `scrollWidth > clientWidth`, not just eyeballed)
- No clipped text, no overlapping controls, no oversized typography at 320px — the
  tightest width
- Footer verified separately at both mobile and desktop
- Toast notification verified end-to-end (triggered a real failed-login toast and
  screenshotted it) — confirms the glass panel, accent border, and icon sizing all
  render correctly together, not just in isolation

This wasn't a from-scratch pass on every single page — phases 1–5 each did spot QA
on the pages they touched as they went. This phase's sweep is the belt-and-suspenders
check across the pages most likely to surface a cross-page regression (shared
Navbar/Footer/toast usage), plus a final codebase-wide grep for the invalid
`h-4.5`/`w-4.5` Tailwind class pattern fixed in Phase 4 and Phase 5, confirming zero
remaining instances anywhere in `src/`.

## Verified

- `npm run build` succeeds (no errors)
- Playwright: 4 pages × 3 widths = 12 checks, all zero horizontal scroll
- Toast, footer, and crash-screen visuals confirmed by direct screenshot

---

# Project summary — all 6 phases

| Phase | Scope |
|---|---|
| 1 | Foundation — design tokens, Navbar, Hero, Vehicle Cards |
| 2 | Browse & Search — listings grid, filter system (bottom sheet + glass drawer) |
| 3 | Vehicle Details — gallery, specs, related vehicles |
| 4 | Auth screens — Login, Register, Forgot/Reset Password, OTP, Profile |
| 5 | Admin/Manager dashboards |
| 6 | Footer, modals/toasts, error states, mobile QA |

Throughout, the constraint held: **no backend, API, auth logic, RBAC, validation, or
business logic was modified in any phase** — every change was CSS classes, component
markup, and a handful of new small presentational components (`FilterSheet`,
`AuthCard`, plus a few icons). Two real bugs were found and fixed along the way:
a button-text contrast issue (Phase 1) and an invalid Tailwind class making three
different icons render at zero size (found in Phase 4, swept clean by Phase 5–6).

Apply all six patches in order (or use the combined full-project zip) for the
complete redesign.
