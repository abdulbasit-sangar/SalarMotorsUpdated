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
import { GuestOnlyRoute } from "./GuestOnlyRoute.jsx";
import { SuperAdminOnlyRoute } from "./SuperAdminOnlyRoute.jsx";
import { RoleRoute } from "./RoleRoute.jsx";
import { RouteLoadingFallback } from "./RouteLoadingFallback.jsx";
import NotFoundPage from "./NotFoundPage.jsx";
import {
  LOCATION_DUBAI,
  LOCATION_ON_THE_WAY,
} from "../../shared/constants/locations.js";

import HomePage from "../../features/catalog/home/HomePage.jsx";
import FilterResultsPage from "../../features/catalog/filters/FilterResultsPage.jsx";

const SearchResultsPage = lazy(
  () => import("../../features/catalog/search/SearchResultsPage.jsx"),
);
const CarDetailsPage = lazy(
  () => import("../../features/catalog/details/CarDetailsPage.jsx"),
);
const FavoritesPage = lazy(
  () => import("../../features/catalog/favorites/FavoritesPage.jsx"),
);

const AdminLoginPage = lazy(
  () => import("../../features/auth/login/AdminLoginPage.jsx"),
);
const ManagerLoginPage = lazy(
  () => import("../../features/auth/login/ManagerLoginPage.jsx"),
);
const RegisterPage = lazy(
  () => import("../../features/auth/register/RegisterPage.jsx"),
);
const ManagerRegisterPage = lazy(
  () => import("../../features/auth/manager-register/ManagerRegisterPage.jsx"),
);
const ManagerPendingPage = lazy(
  () => import("../../features/auth/manager-pending/ManagerPendingPage.jsx"),
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
const EditListingPage = lazy(
  () => import("../../features/admin/edit-listing/EditListingPage.jsx"),
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

const RedirectToListings = () => {
  const location = useLocation();
  return <Navigate to={`/listings${location.search}`} replace />;
};

// The protected pages (dashboard, listings, profile) are shared by both
// roles, but under DIFFERENT URL prefixes, guarded by RoleRoute:
//   /admin/*   -> superadmin only, login at /admin/login
//   /manager/* -> manager only,    login at /manager/login
// Managers never get the /admin/managers page. The backend still
// enforces this with requireRole("superadmin") — RoleRoute is UX only.
// NOTE: the routes are written out twice on purpose, as direct <Route>
// children. React Router does not reliably flatten a <Route> list passed
// through a fragment variable, so sharing them via a variable risks the
// nested routes not matching.

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
        <Route path="/filter" element={<RedirectToListings />} />
        <Route path="/cars/:id" element={withSuspense(<CarDetailsPage />)} />
        <Route path="/favorites" element={withSuspense(<FavoritesPage />)} />

        {/* ── Separate logins ─────────────────────────────────────── */}
        {/* Main admin only */}
        <Route
          path="/admin/login"
          element={
            <GuestOnlyRoute>{withSuspense(<AdminLoginPage />)}</GuestOnlyRoute>
          }
        />
        <Route
          path="/admin/register"
          element={
            <GuestOnlyRoute>{withSuspense(<RegisterPage />)}</GuestOnlyRoute>
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
        {/* Manager only */}
        <Route
          path="/manager/login"
          element={
            <GuestOnlyRoute>
              {withSuspense(<ManagerLoginPage />)}
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/manager/register"
          element={
            <GuestOnlyRoute>
              {withSuspense(<ManagerRegisterPage />)}
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/manager/pending"
          element={
            <GuestOnlyRoute>
              {withSuspense(<ManagerPendingPage />)}
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/manager/forgot-password"
          element={
            <GuestOnlyRoute>
              {withSuspense(<ForgotPasswordPage isManager />)}
            </GuestOnlyRoute>
          }
        />
        {/* Old manager-register URL — redirect, do not break bookmarks */}
        <Route
          path="/admin/register-manager"
          element={<Navigate to="/manager/register" replace />}
        />
      </Route>

      {/* ── Protected: main admin area ──────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <RoleRoute allowedRoles={["superadmin"]} loginPath="/admin/login">
            <AdminLayout />
          </RoleRoute>
        }
      >
        <Route path="dashboard" element={withSuspense(<DashboardPage />)} />
        <Route path="listings" element={withSuspense(<ManageListingsPage />)} />
        <Route
          path="listings/create"
          element={withSuspense(<CreateListingPage />)}
        />
        <Route
          path="listings/:id/edit"
          element={withSuspense(<EditListingPage />)}
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

      {/* ── Protected: manager area (no managers page) ───────────────── */}
      <Route
        path="/manager"
        element={
          <RoleRoute allowedRoles={["manager"]} loginPath="/manager/login">
            <AdminLayout />
          </RoleRoute>
        }
      >
        <Route path="dashboard" element={withSuspense(<DashboardPage />)} />
        <Route path="listings" element={withSuspense(<ManageListingsPage />)} />
        <Route
          path="listings/create"
          element={withSuspense(<CreateListingPage />)}
        />
        <Route
          path="listings/:id/edit"
          element={withSuspense(<EditListingPage />)}
        />
        <Route path="profile" element={withSuspense(<ProfilePage />)} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </BrowserRouter>
);
