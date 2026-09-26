# AutoMarket Frontend

Frontend for the AutoMarket car marketplace API (Node/Express/MongoDB backend).
Built with React + Vite, React Router, Tailwind CSS, and Axios.

## Phase 7 — Optimization & Deployment Readiness (this delivery)

Added on top of Phases 1–6:

**Reduced redundant requests**
- New `services/api/cache.js`: a small in-memory cache for public catalog
  reads (`fetchCars`, `fetchFeaturedCars`, `fetchRightHandCars`,
  `fetchLeftHandCars`, `searchCars`, `filterCars`, `fetchSimilarCars`,
  `fetchCarById`). It does two things — dedupes concurrent identical
  requests into one network call, and serves cached data for ~30s
  (~15s for search/filter) so hopping Home → Listings → back to Home
  doesn't re-hit the network for data that hasn't had time to change.
  `createCar`/`toggleFeatureCar`/`toggleHideCar` call `invalidateCache()`
  on success so admin actions are never masked by stale cached reads.
  Verified directly with a small Node script exercising dedup, TTL reuse,
  invalidation, and per-params key isolation — all four passed.

**Image optimization**
- `shared/utils/imagekit.js`: appends ImageKit transform params
  (`?tr=w-,q-,f-webp`) to any ImageKit URL, so the browser downloads an
  image sized for where it's displayed instead of the original upload —
  cards request ~480px with a responsive `srcset` (320/480/640/800),
  gallery thumbnails request 96px, the gallery hero requests up to 1200px
  only at the breakpoints that need it. Falls through untouched for
  non-ImageKit URLs (safe for local/mock testing).
- Explicit `width`/`height` on card images to prevent layout shift;
  `decoding="async"` throughout; the gallery hero loads eager (it's above
  the fold) while everything else stays `loading="lazy"`.

**Bundle size / code-splitting**
- Home and Listings stay in the main bundle (most common entry points);
  every other route — search, filter, details, both auth pages, and the
  entire admin surface — is now `React.lazy()`-loaded behind a Suspense
  spinner. A public visitor who never logs in no longer downloads any
  admin-only code. Confirmed via `npm run build`: the main chunk dropped
  from 354KB to 216KB (66KB gzip), with the rest split into ~10 small
  per-route chunks loaded on demand.

**Deployment readiness**
- `public/_redirects` (Netlify) and `vercel.json` (Vercel) SPA fallback
  rewrites — without one of these, a hard refresh on a deep route like
  `/listings/right-hand` 404s on most static hosts, since there's no
  server-side router to fall back to `index.html`.
- `public/robots.txt`, Open Graph + Twitter card meta tags in `index.html`
  for link-preview support.
- Confirmed `npm run build` output is correct and `_redirects`/`robots.txt`
  copy through to `dist/` as static assets.

### Deploying this project

1. `npm install && npm run build` — output lands in `dist/`
2. Set `VITE_API_URL` to your deployed backend's API base
   (e.g. `https://api.yourdomain.com/api`) at build time — Vite inlines
   `import.meta.env.VITE_API_URL` into the bundle, so it must be set
   *before* building, not just at runtime
3. Deploy `dist/` to any static host:
   - **Netlify**: `_redirects` is already in place
   - **Vercel**: `vercel.json` is already in place
   - **Other static hosts** (S3+CloudFront, GitHub Pages, nginx): configure
     a catch-all rewrite to `index.html` for any path that isn't a real
     file — this app is 100% client-side routed
4. On the backend, set `FRONTEND_URL` to this app's deployed origin exactly
   (scheme + host + port) — `app.js`'s CORS config only allows that one
   origin, and cookies require it to match precisely

## Phase 6 — Polish & Edge Cases (this delivery)

Added on top of Phases 1–5:

**Accessibility**
- Skip-to-content link on both layouts (`shared/components/SkipToContent.jsx`)
- All slide-in overlays (Navbar mobile menu, Filter drawer, Admin drawer)
  now close on **Escape** (`shared/hooks/useEscapeKey.js`) and carry
  `role="dialog"` / `aria-modal` where they're full overlays
- Toast viewport now has `aria-live="polite"` so notifications are announced
- Fixed a real gap: `Input`/`Select`/`Textarea` accepted a `required` prop
  for the visual asterisk but never forwarded it to the field itself —
  `aria-required` is now set correctly
- Pagination buttons bumped from 36px to 40px for friendlier touch targets
- Buttons in a loading state now expose `aria-busy`

**Edge cases**
- **`ErrorBoundary`** (`shared/components/ErrorBoundary.jsx`) now wraps the
  whole app in `main.jsx` — a render-time crash shows a recovery screen
  with a reload button instead of a blank page
- **`OfflineBanner`** — a persistent banner appears the moment
  `navigator.onLine` goes false, and clears automatically when back online
- **Filter range validation** — entering a minimum greater than a maximum
  (price/year/mileage) is now caught client-side with an inline message
  instead of silently sending a query the backend would just return zero
  results for
- **Fixed a real memory leak**: `ImageUploader` was calling
  `URL.createObjectURL()` inline during render, which re-ran (and leaked a
  new blob URL) on every keystroke anywhere else in the Create Listing
  form — not just when images changed. Preview URLs are now created once
  per `files` change via `useEffect`, with proper `revokeObjectURL` cleanup.

Expired-token handling, network-error messaging, large-upload rejection,
and empty/no-results states were already covered in earlier phases and
were re-verified here rather than rebuilt.

## Phase 5 — Admin Content Management (this delivery)

Added on top of Phases 1–4:

- **Admin sidebar** (`app/layout/AdminSidebar.jsx`): Dashboard, Manage
  Listings, Create Listing, Profile — desktop fixed sidebar, mobile slide-in
  drawer. `AdminLayout` was rebuilt around it, replacing the Phase 1
  placeholder top bar.
- **Dashboard** (`features/admin/dashboard/`): total/RHD/LHD listing counts
  (real `pagination.totalCars` from three cheap `limit:1` calls) and a
  featured count. The featured count is honestly capped — `GET
  /cars/featured` clamps `limit` to 20 server-side and returns no total, so
  past 20 the dashboard shows "20+" rather than a fabricated number. Recent
  Arrivals section reuses `CarCard`. Quick actions link to Create and
  Manage.
- **Create Listing** (`features/admin/create-listing/`): full form
  covering every field `car.validator.js` accepts, client-side validation
  mirroring the same required/min/max rules, and an **ImageUploader**
  (`shared/components/ImageUploader.jsx`) that enforces the exact backend
  constraints up front — JPEG/PNG/WEBP only, 5MB/file, 10 files max (see
  `upload.middleware.js`) — with drag-and-drop, previews, a "Cover" tag on
  the first image, and per-file removal. Submits as `multipart/form-data`
  to `POST /cars`.
- **Manage Listings** (`features/admin/manage-listings/`): paginated,
  sortable list with Feature/Unfeature and Hide/Unhide actions per row.

### A real backend constraint this phase had to design around

`GET /api/cars` (and `/cars/:id`, `/search`, `/filter`, `/right-hand`,
`/left-hand`) all filter `isHidden: false` unconditionally — there is no
admin variant that also returns hidden cars. That's correct for the public
site, but it means: **once a car is hidden, no GET endpoint can find it
again** to display it back to the admin. The `PATCH` toggle endpoints
themselves aren't filtered (`toggleHideCarService` does a plain
`findById`), so un-hiding still works *if you already have the car in
front of you* — it just can't be re-discovered through search/browse/list
once it drops out of every GET response.

The Manage Listings page works around this instead of hiding the problem:
toggling mutates the row **in local state** rather than refetching, so a
newly-hidden car stays visible (marked "Hidden") and unhide-able for the
rest of that session. A note banner on the page explains that refreshing
or changing pages will drop hidden listings from view, since that's a
backend limitation the frontend can't fully paper over. If you want true
hidden-listing management later, the backend would need something like
`GET /api/cars/admin?includeHidden=true` behind `verifyJWT`.

## Phase 4 — Admin Authentication (this delivery)

Added on top of Phases 1–3:

- **Login page** (`features/auth/login/`): email/password form, client-side
  validation mirroring the backend's Joi rules (valid email, 8+ char
  password), maps backend validation error arrays into a visible banner,
  redirects back to wherever the person was headed before being bounced to
  login (`location.state.from`)
- **Registration page** (`features/auth/register/`): the one-time
  initial-admin setup form. There's no "does an admin exist" check
  endpoint on the backend, so this mirrors the actual contract instead of
  guessing: submitting when an admin already exists surfaces the backend's
  403 with a direct link to Login, rather than trying to pre-detect it
- **Profile page** (`features/auth/profile/`): shows the authenticated
  admin's username, email, role, active status, last login, and
  account-since date, sourced from `GET /admin/me`
- **`GuestOnlyRoute`**: the mirror image of `ProtectedRoute` — signed-in
  admins hitting `/admin/login` or `/admin/register` get bounced to the
  dashboard instead of seeing the form again
- Admin top bar now links to Profile in addition to logout

Verified against a mock auth backend that reproduces the real contract
exactly — register-once enforcement (second registration attempt returns
403 "Admin already exists"), login, refresh, `/me`, and logout — plus
confirmed every new route resolves through the dev server.

## Phase 3 — Search, Filter, Details & Steering Browsing (this delivery)

Added on top of Phase 1 + 2:

- **SearchBar** (`shared/components/SearchBar.jsx`): keyword search wired into
  the Navbar (desktop + mobile) and the Home hero; submits to
  `/search?keyword=...`
- **Search results page** (`features/catalog/search/`): calls
  `GET /cars/search`, paginated, with an explicit "type something" state
  before a keyword is entered and a "no matches" state after
- **Filter panel + results page** (`features/catalog/filters/`): every
  filterable field from `filterCarsService` (brand, model, province, color,
  steering/fuel/body/transmission/condition, price/year/mileage ranges,
  sort) synced to the URL query string, so filtered links are shareable.
  Desktop shows a sticky sidebar; mobile gets a slide-in drawer with an
  active-filter count on the toggle button
- **RHD/LHD dedicated pages** (`features/catalog/listings/SteeringListingsPage.jsx`):
  one component parameterized by `steering`, backing both
  `/listings/right-hand` (`GET /cars/right-hand`) and `/listings/left-hand`
  (`GET /cars/left-hand`), each independently paginated/sortable
- **Car details page** (`features/catalog/details/`): image gallery with
  thumbnail strip (falls back to the silhouette icon for cars with no
  photos yet), full specs grid pulling every optional field the backend
  supports, price, badges, description, and a "Similar Listings" section
  powered by `GET /cars/similar/:id` — with a dedicated "listing not found"
  state for hidden/deleted/invalid IDs (backend 404s these)

Verified against an extended mock backend covering `/cars/search`,
`/cars/filter`, `/cars/similar/:id`, `/cars/:id` (including a 404 case), and
the RHD/LHD endpoints — every new route resolves and renders.

## Phase 2 — Public Catalog Core (this delivery)

Added on top of Phase 1:

- **Home page** (`features/catalog/home/`): hero with a live "manifest
  strip" (real counts pulled from `/cars`, `/cars/right-hand`,
  `/cars/left-hand`, `/cars/featured` — not placeholder numbers), a
  Featured Listings section, and a Recent Arrivals section
- **Listings page** (`features/catalog/listings/ListingsPage.jsx`): fully
  paginated + sortable against `GET /api/cars`, with `page`/`sort` synced
  to the URL query string so links are shareable and back/forward works
- **CarCard** (`shared/components/CarCard.jsx`): the signature spec-tag
  card — image (or silhouette fallback if a car has no images yet),
  steering-type and featured badges, monospace price ticket, location and
  mileage row
- **CarSection**: shared title+grid+viewAll wrapper handling
  loading/empty/error consistently, reused by both Home sections
- **Pagination**: windowed page numbers with `…` gaps for large result sets
- **useAsyncData** hook (`shared/hooks/`): the shared data-fetching pattern
  (loading/error/data, stale-response guarding) all catalog pages build on

Verified by pointing the app at a small mock server matching the real
response shapes (`/cars`, `/cars/featured`, `/cars/right-hand`,
`/cars/left-hand`) — home and listings render, paginate, and sort correctly.

## Phase 1 — Foundation

What's included:

- **Project scaffold**: Vite + React, feature-based folder structure
- **Routing**: every page from the plan is routed (most as placeholders — real
  screens land in Phases 2-5), 404 page fully built
- **API client layer** (`src/services/api/client.js`): axios instance with
  `withCredentials: true`, automatic `Authorization` header injection, and a
  queued single-flight 401 -> `/admin/refresh` -> retry interceptor
- **Auth & Cars API services**: thin wrappers mapped 1:1 to every backend
  route (`src/services/auth/authApi.js`, `src/services/cars/carsApi.js`)
- **Global state**: `AuthContext` (session bootstrap, login/register/logout)
  and `ToastContext` (notifications), both via React Context - no extra
  state library needed at this scale
- **Design system**: color/type tokens in `tailwind.config.js`, base
  components (Button, Input/Select/Textarea, Card, Badge, Spinner,
  Skeleton, EmptyState, ErrorState, ToastViewport)
- **Layout shells**: public Navbar/Footer, minimal admin top bar, protected
  route guard

### Design system summary

| Token | Value | Use |
|---|---|---|
| `graphite-950` | `#14171C` | App background |
| `graphite-800` | `#1E232B` | Card/surface background |
| `steel` | `#2B323C` | Borders, dividers |
| `ash` | `#8891A0` | Muted text |
| `bone` | `#F2EFE9` | Primary text |
| `brass` | `#C9A24B` | Primary accent (CTAs, active states, prices) |
| `signal` | `#3FBFAD` | Secondary accent (RHD/LHD badges, success) |
| `danger` | `#D9604E` | Errors |

Typography: **Big Shoulders Display** (headings - a condensed,
signage/plate-inspired face fitting an automotive/import marketplace),
**Inter** (body/UI), **IBM Plex Mono** (prices, mileage, VINs, ticket-style
data - anything that reads like a spec sheet or import stamp).

Signature shape: the **spec tag** - a corner-notched card (`.tag-shape` in
`shared/styles/index.css`), used for car cards and price badges. It nods to
a dealer tag / manifest stub, and is the one deliberate visual flourish;
everything else stays quiet and disciplined around it.

## Getting started

```bash
npm install
cp .env.example .env   # point VITE_API_URL at your backend
npm run dev
```

Make sure the backend's `FRONTEND_URL` env var matches wherever this app
runs (e.g. `http://localhost:5173`) - CORS is locked to that origin with
`credentials: true`.

## Folder structure

```
src/
  app/            # router, layouts, providers
  features/       # one folder per screen group (auth, catalog, admin)
  shared/         # reusable components, styles
  services/       # api client + per-domain API wrappers
  store/          # React Context providers (auth, toast/ui)
```

## Roadmap

- **Phase 2**: ✅ Public catalog core - Home, Listings, Car Card, pagination
- **Phase 3**: ✅ Search, Filter, Car Details, RHD/LHD browsing
- **Phase 4**: ✅ Admin auth - Login, Register (one-time setup), Profile
- **Phase 5**: ✅ Admin management - Dashboard, Create Listing, Manage Listings
- **Phase 6**: ✅ Responsive/accessibility/edge-case polish
- **Phase 7**: ✅ Performance, caching, deployment readiness
