
import { useMemo } from "react";
import { useAuth } from "../../../store/auth/AuthContext.jsx";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import {
  fetchAdminCars,
  filterCars,
  fetchFeaturedCars,
} from "../../../services/cars/carsApi.js";
import { StatCard } from "../../../shared/components/StatCard.jsx";
import { ErrorState } from "../../../shared/components/ErrorState.jsx";
import {
  LOCATION_DUBAI,
  LOCATION_ON_THE_WAY,
} from "../../../shared/constants/locations.js";
import {
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  EyeOff,
  MapPin,
  Package,
  Route,
  Star,
  TrendingUp,
  Warehouse,
} from "lucide-react";

const PAGE_SIZE = 50;
const FEATURED_CAP = 20;

const fetchAllAdminCars = async () => {
  const firstPage = await fetchAdminCars({
    page: 1,
    limit: PAGE_SIZE,
  });

  const totalPages = firstPage.pagination?.totalPages ?? 1;

  if (totalPages <= 1) {
    return firstPage.cars ?? [];
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchAdminCars({
        page: index + 2,
        limit: PAGE_SIZE,
      }),
    ),
  );

  return [
    ...(firstPage.cars ?? []),
    ...remainingPages.flatMap((result) => result.cars ?? []),
  ];
};

const loadDashboardData = async () => {
  const [
    allCars,
    dubaiRes,
    onTheWayAmericaRes,
    onTheWayDubaiRes,
    featuredRes,
  ] = await Promise.all([
    fetchAllAdminCars(),
    filterCars({
      province: LOCATION_DUBAI,
      page: 1,
      limit: 1,
    }),
    filterCars({
      province: LOCATION_ON_THE_WAY.AMERICA_TO_HERAT,
      page: 1,
      limit: 1,
    }),
    filterCars({
      province: LOCATION_ON_THE_WAY.DUBAI_TO_HERAT,
      page: 1,
      limit: 1,
    }),
    fetchFeaturedCars(FEATURED_CAP),
  ]);

  const hidden = allCars.filter((car) => car.isHidden === true).length;
  const sold = allCars.filter((car) => car.isSold === true).length;
  const active = allCars.filter(
    (car) => car.isHidden !== true && car.isSold !== true,
  ).length;

  return {
    total: allCars.length,
    active,
    sold,
    hidden,
    dubaiCars: dubaiRes.pagination.totalCars,
    onTheWay:
      onTheWayAmericaRes.pagination.totalCars +
      onTheWayDubaiRes.pagination.totalCars,
    featuredCount: featuredRes.cars.length,
  };
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US").format(value ?? 0);

function SectionHeading({ eyebrow, title }) {
  return (
    <div className="mb-5">
      <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
        {eyebrow}
      </p>
      <h2 className="text-lg font-semibold tracking-tight text-bone sm:text-xl">
        {title}
      </h2>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  iconClass = "text-brass",
  iconBackground = "bg-brass/10",
  tooltip,
}) {
  return (
    <div
      title={tooltip || label}
      className="group min-w-0 cursor-default rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brass/40 hover:bg-white/[0.055] hover:shadow-lg hover:shadow-black/10 sm:p-5"
    >
      <div className="mb-5 flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200 group-hover:bg-brass/15 ${iconBackground} ${iconClass}`}
        >
          <Icon size={19} strokeWidth={1.8} />
        </div>
        <span className="text-xs text-ash/60 transition-colors group-hover:text-brass">
          <TrendingUp size={15} />
        </span>
      </div>

      <p className="text-sm text-ash transition-colors group-hover:text-bone">
        {label}
      </p>

      <p className="mt-1 break-words text-2xl font-semibold tracking-tight text-bone sm:text-3xl">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function StatusRow({ label, count, total, color, icon: Icon }) {
  const percentage =
    total > 0 ? Math.min(100, (count / total) * 100) : 0;

  return (
    <div
      title={`${label}: ${formatNumber(count)} listings (${Math.round(percentage)}%)`}
      className="group rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.035]"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`shrink-0 ${color}`}>
            <Icon size={16} strokeWidth={1.8} />
          </span>
          <span className="truncate text-sm text-ash transition-colors group-hover:text-bone">
            {label}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-semibold tabular-nums text-bone">
            {formatNumber(count)}
          </span>
          <span className="w-10 text-right text-xs tabular-nums text-ash/70">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color.replace("text-", "bg-")}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { admin } = useAuth();

  const { data, loading, error, refetch } = useAsyncData(
    loadDashboardData,
    [],
  );

  const insights = useMemo(() => {
    if (!data) return [];

    return [
      {
        label: "Active inventory",
        value:
          data.total > 0
            ? `${Math.round((data.active / data.total) * 100)}%`
            : "0%",
        icon: TrendingUp,
        tooltip: "Percentage of all listings that are currently active.",
      },
      {
        label: "Sold inventory",
        value:
          data.total > 0
            ? `${Math.round((data.sold / data.total) * 100)}%`
            : "0%",
        icon: CircleDollarSign,
        tooltip: "Percentage of all listings marked as sold.",
      },
      {
        label: "Featured listings",
        value: formatNumber(data.featuredCount),
        icon: Star,
        tooltip: `Number of featured listings returned by the API, capped at ${FEATURED_CAP}.`,
      },
    ];
  }, [data]);

  return (
    <div className="container-page min-h-full py-7 sm:py-10">
      <header className="mb-8 flex flex-col gap-5 border-b border-white/[0.08] pb-7 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2F8F7A]" />
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brass sm:text-xs">
              SAFAR MOTORS / ADMIN
            </p>
          </div>

          <h1 className="break-words font-display text-3xl font-semibold tracking-tight text-bone sm:text-4xl lg:text-[42px]">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-ash sm:text-base">
            Welcome back{admin?.username ? `, ${admin.username}` : ""}.
          </p>
        </div>

        <div
          title="Current dashboard data loading status"
          className="flex w-fit items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 transition-colors hover:border-brass/30 hover:bg-white/[0.045]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brass/10 text-brass">
            <Warehouse size={19} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs text-ash">Catalog status</p>
            <p className="mt-0.5 text-sm font-medium text-bone">
              {loading
                ? "Updating..."
                : error
                  ? "Needs attention"
                  : "Overview ready"}
            </p>
          </div>
        </div>
      </header>

      {error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          <section className="mb-10">
            <SectionHeading
              eyebrow="01 / Key metrics"
              title="Inventory overview"
            />

            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <StatCard
                label="Total Listings"
                value={data?.total ?? 0}
                loading={loading}
              />
              <StatCard
                label="Active Cars"
                value={data?.active ?? 0}
                loading={loading}
                accent="signal"
              />
              <StatCard
                label="Sold Cars"
                value={data?.sold ?? 0}
                loading={loading}
              />
              <StatCard
                label="Hidden Cars"
                value={data?.hidden ?? 0}
                loading={loading}
              />
            </div>
          </section>

          <section className="mb-10">
            <SectionHeading
              eyebrow="02 / Categories"
              title="Vehicle distribution"
            />

            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
              <OverviewCard
                icon={MapPin}
                label="Dubai Cars"
                value={data?.dubaiCars ?? 0}
                tooltip="Total vehicles in the Dubai category."
              />

              <OverviewCard
                icon={Route}
                label="On The Way"
                value={data?.onTheWay ?? 0}
                iconClass="text-[#2F8F7A]"
                iconBackground="bg-[#2F8F7A]/10"
                tooltip="Combined vehicles on the America-to-Herat and Dubai-to-Herat routes."
              />

              <OverviewCard
                icon={Star}
                label="Featured Now"
                value={data?.featuredCount ?? 0}
                iconClass="text-[#D9AD68]"
                iconBackground="bg-[#D9AD68]/10"
                tooltip={`Featured listings returned by the API, up to ${FEATURED_CAP}.`}
              />
            </div>
          </section>

          <section className="mb-10">
            <SectionHeading
              eyebrow="03 / Performance"
              title="Listing status"
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-colors hover:border-white/[0.13] sm:p-6 lg:col-span-3">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-bone">
                      Status distribution
                    </h3>
                    <p className="mt-1 text-xs text-ash">
                      All listings
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brass/10 text-brass">
                    <CarFront size={20} strokeWidth={1.8} />
                  </div>
                </div>

                <div className="space-y-3">
                  <StatusRow
                    label="Active"
                    count={data?.active ?? 0}
                    total={data?.total ?? 0}
                    color="text-[#2F8F7A]"
                    icon={CheckCircle2}
                  />
                  <StatusRow
                    label="Sold"
                    count={data?.sold ?? 0}
                    total={data?.total ?? 0}
                    color="text-brass"
                    icon={CircleDollarSign}
                  />
                  <StatusRow
                    label="Hidden"
                    count={data?.hidden ?? 0}
                    total={data?.total ?? 0}
                    color="text-[#C1493D]"
                    icon={EyeOff}
                  />
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
                  <span className="text-sm text-ash">Total inventory</span>
                  <span className="text-lg font-semibold tabular-nums text-bone">
                    {formatNumber(data?.total ?? 0)}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-colors hover:border-white/[0.13] sm:p-6 lg:col-span-2">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brass/10 text-brass">
                    <TrendingUp size={20} strokeWidth={1.8} />
                  </div>
                  <h3 className="font-semibold text-bone">
                    Inventory insights
                  </h3>
                </div>

                <div>
                  {insights.map((item, index) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        title={item.tooltip}
                        className={`group flex cursor-help items-center gap-3 rounded-lg px-2 py-4 transition-colors hover:bg-white/[0.04] ${
                          index > 0 ? "border-t border-white/[0.07]" : ""
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-brass transition-colors group-hover:bg-brass/10">
                          <Icon size={17} strokeWidth={1.8} />
                        </div>

                        <span className="min-w-0 flex-1 text-sm text-ash transition-colors group-hover:text-bone">
                          {item.label}
                        </span>

                        <span className="text-lg font-semibold tabular-nums text-bone">
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <footer className="flex items-center justify-between gap-3 border-t border-white/[0.08] pt-5">
            <span className="text-xs text-ash">
              SAFAR Motors
            </span>
            <span className="flex items-center gap-2 text-xs text-ash/70">
              <Package size={14} />
              Admin overview
            </span>
          </footer>
        </>
      )}
    </div>
  );
}
