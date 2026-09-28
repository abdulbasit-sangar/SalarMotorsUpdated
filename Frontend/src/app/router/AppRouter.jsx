import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { PublicLayout } from "../layout/PublicLayout.jsx";
import { AdminLayout } from "../layout/AdminLayout.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { GuestOnlyRoute } from "./GuestOnlyRoute.jsx";
import { SuperAdminOnlyRoute } from "./SuperAdminOnlyRoute.jsx";
import { RouteLoadingFallback } from "./RouteLoadingFallback.jsx";
import NotFoundPage from "./NotFoundPage.jsx";
import {
  LOCATION_DUBAI,
  LOCATION_ON_THE_WAY,
} from "../../shared/constants/locations.js";

// Home and the Browse/Listings page are eager — they're the most common
// entry points and keeping them in the main bundle avoids a loading flash
// on first visit. FilterResultsPage is the one main filter used for
// Browse (/listings) — kept eager alongside it since it's what actually
// renders there now; fixed-location categories reuse it on dedicated routes.
import HomePage from "../../features/catalog/home/HomePage.jsx";
import FilterResultsPage from "../../features/catalog/filters/FilterResultsPage.jsx";

// Everything else is route-split: search/details/admin are visited less
// often per-session than the catalog root, and the entire admin surface is
// irrelevant to the ~100% of visitors who aren't the site admin — no
// reason to ship that JS to every public visitor upfront.
const SearchResultsPage = lazy(
  () => import("../../features/catalog/search/SearchResultsPage.jsx"),
);
const CarDetailsPage = lazy(
  () => import("../../features/catalog/details/CarDetailsPage.jsx"),
);
const FavoritesPage = lazy(
  () => import("../../features/catalog/favorites/FavoritesPage.jsx"),
);

const LoginPage = lazy(() => import("../../features/auth/login/LoginPage.jsx"));
const RegisterPage = lazy(
  () => import("../../features/auth/register/RegisterPage.jsx"),
);
const ManagerRegisterPage = lazy(
  () => import("../../features/auth/manager-register/ManagerRegisterPage.jsx"),
);
const ForgotPasswordPage = lazy(
  () => import("../../features/auth/forgot-password/ForgotPasswordPage.jsx"),
);
const ProfilePage = lazy(
  () => import("../../features/auth/profile/ProfilePage.jsx"),
);

const DashboardPage = lazy(
  () => import("../../features/admin/dashboard/DashboardPage.jsx"),
);
const CreateListingPage = lazy(
  () => import("../../features/admin/create-listing/CreateListingPage.jsx"),
);
const ManageListingsPage = lazy(
  () => import("../../features/admin/manage-listings/ManageListingsPage.jsx"),
);
const ManagersPage = lazy(
  () => import("../../features/admin/managers/ManagersPage.jsx"),
);

const withSuspense = (Element) => (
  <Suspense fallback={<RouteLoadingFallback />}>{Element}</Suspense>
);

// Redirects /filter?<query> -> /listings?<query>, preserving whatever
// filter params were already in the URL (e.g. from the home page search).
const RedirectToListings = () => {
  const location = useLocation();
  return <Navigate to={`/listings${location.search}`} replace />;
};

export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      {/* ── Public site ─────────────────────────────────────────────── */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/listings" element={<FilterResultsPage />} />
        <Route
          path="/dubai-cars"
          element={
            <FilterResultsPage
              fixedProvince={LOCATION_DUBAI}
              fixedTitle="Dubai Cars"
            />
          }
        />
        <Route
          path="/on-the-way/from-america-to-herat"
          element={
            <FilterResultsPage
              fixedProvince={LOCATION_ON_THE_WAY.AMERICA_TO_HERAT}
              fixedTitle="From America to Herat"
            />
          }
        />
        <Route
          path="/on-the-way/from-dubai-to-herat"
          element={
            <FilterResultsPage
              fixedProvince={LOCATION_ON_THE_WAY.DUBAI_TO_HERAT}
              fixedTitle="From Dubai to Herat"
            />
          }
        />
        <Route path="/search" element={withSuspense(<SearchResultsPage />)} />
        {/* Filter + Sort now live only inside Browse (/listings). /filter
            is kept as a redirect so any old links/bookmarks still land
            somewhere useful, carrying their query params along. */}
        <Route path="/filter" element={<RedirectToListings />} />
        <Route path="/cars/:id" element={withSuspense(<CarDetailsPage />)} />
        <Route path="/favorites" element={withSuspense(<FavoritesPage />)} />

        {/* Admin auth screens live under the public layout — no sidebar yet */}
        <Route
          path="/admin/login"
          element={
            <GuestOnlyRoute>{withSuspense(<LoginPage />)}</GuestOnlyRoute>
          }
        />
        <Route
          path="/admin/register"
          element={
            <GuestOnlyRoute>{withSuspense(<RegisterPage />)}</GuestOnlyRoute>
          }
        />
        <Route
          path="/admin/register-manager"
          element={
            <GuestOnlyRoute>
              {withSuspense(<ManagerRegisterPage />)}
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/admin/forgot-password"
          element={
            <GuestOnlyRoute>
              {withSuspense(<ForgotPasswordPage />)}
            </GuestOnlyRoute>
          }
        />
      </Route>

      {/* ── Protected admin area ────────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={withSuspense(<DashboardPage />)} />
        <Route path="listings" element={withSuspense(<ManageListingsPage />)} />
        <Route
          path="listings/create"
          element={withSuspense(<CreateListingPage />)}
        />
        <Route path="profile" element={withSuspense(<ProfilePage />)} />
        <Route
          path="managers"
          element={
            <SuperAdminOnlyRoute>
              {withSuspense(<ManagersPage />)}
            </SuperAdminOnlyRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </BrowserRouter>
);
