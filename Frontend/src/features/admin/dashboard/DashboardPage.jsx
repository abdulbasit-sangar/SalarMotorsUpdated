import { Link } from "react-router-dom";
import { useAuth } from "../../../store/auth/AuthContext.jsx";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import {
  fetchCars,
  filterCars,
  fetchFeaturedCars,
} from "../../../services/cars/carsApi.js";
import { StatCard } from "../../../shared/components/StatCard.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import { CarCard, CarCardGrid } from "../../../shared/components/CarCard.jsx";
import { CarCardSkeleton } from "../../../shared/components/Skeleton.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { CarSilhouetteIcon } from "../../../shared/components/icons.jsx";
import { LOCATION_DUBAI, LOCATION_ON_THE_WAY } from "../../../shared/constants/locations.js";

// FEATURED_CAP mirrors car.controller.js: getFeaturedCars clamps limit to 20
// and the service returns no total count, so beyond that we can only show
// "20+" rather than a true figure.
const FEATURED_CAP = 20;

const loadDashboardData = async () => {
  const [totalRes, dubaiRes, onTheWayAmericaRes, onTheWayDubaiRes, featuredRes] =
    await Promise.all([
      fetchCars({ page: 1, limit: 1 }),
      filterCars({ province: LOCATION_DUBAI, page: 1, limit: 1 }),
      filterCars({ province: LOCATION_ON_THE_WAY.AMERICA_TO_HERAT, page: 1, limit: 1 }),
      filterCars({ province: LOCATION_ON_THE_WAY.DUBAI_TO_HERAT, page: 1, limit: 1 }),
      fetchFeaturedCars(FEATURED_CAP),
    ]);

  return {
    total: totalRes.pagination.totalCars,
    dubaiCars: dubaiRes.pagination.totalCars,
    onTheWay:
      onTheWayAmericaRes.pagination.totalCars +
      onTheWayDubaiRes.pagination.totalCars,
    featuredCount: featuredRes.cars.length,
  };
};

export default function DashboardPage() {
  const { admin } = useAuth();
  const { data, loading, error, refetch } = useAsyncData(loadDashboardData, []);

  return (
    <div className="container-page py-8 sm:py-10">
      <p className="font-mono text-xs text-brass uppercase tracking-widest mb-2">
        Overview
      </p>
      <h1 className="font-display text-4xl font-semibold text-bone mb-1">
        Welcome back{admin?.username ? `, ${admin.username}` : ""}
      </h1>
      <p className="text-ash text-sm mb-8">
        Here's what's happening across the catalog.
      </p>

      {error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard
              label="Total Listings"
              value={data?.total ?? 0}
              loading={loading}
            />
            <StatCard
              label="Dubai Cars"
              value={data?.dubaiCars ?? 0}
              loading={loading}
              accent="signal"
            />
            <StatCard
              label="On The Way"
              value={data?.onTheWay ?? 0}
              loading={loading}
              accent="signal"
            />
            <StatCard
              label="Featured Now"
              value={
                data
                  ? `${data.featuredCount}${data.featuredCount === FEATURED_CAP ? "+" : ""}`
                  : 0
              }
              loading={loading}
            />
          </div>

          <div className="flex flex-wrap gap-3 mb-12">
            <Button as={Link} to="/admin/listings/create" variant="primary">
              + Create Listing
            </Button>
            <Button as={Link} to="/admin/listings" variant="secondary">
              Manage Listings
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
