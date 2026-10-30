import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../store/auth/AuthContext.jsx";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import { fetchAdminCars } from "../../../services/cars/carsApi.js";
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

const fetchAllAdminCars = async () => {
  const firstPage = await fetchAdminCars({ page: 1, limit: PAGE_SIZE });
  const totalPages = firstPage.pagination?.totalPages ?? 1;

  if (totalPages <= 1) return firstPage.cars ?? [];

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchAdminCars({ page: index + 2, limit: PAGE_SIZE }),
    ),
  );

  return [
    ...(firstPage.cars ?? []),
    ...remainingPages.flatMap((result) => result.cars ?? []),
  ];
};

const loadDashboardData = async () => {
  // The admin endpoint scopes listings to the logged-in manager.
  const allCars = await fetchAllAdminCars();
  const hidden = allCars.filter((car) => car.isHidden === true).length;
  const sold = allCars.filter((car) => car.isSold === true).length;
  const active = allCars.filter(
    (car) => car.isHidden !== true && car.isSold !== true,
  ).length;
  const visibleCars = allCars.filter(
    (car) => car.isHidden !== true && car.featured !== true,
  );
  const dubaiCars = visibleCars.filter(
    (car) => car.province === LOCATION_DUBAI,
  ).length;
  const onTheWay = visibleCars.filter(
    (car) =>
      car.province === LOCATION_ON_THE_WAY.AMERICA_TO_HERAT ||
      car.province === LOCATION_ON_THE_WAY.DUBAI_TO_HERAT,
  ).length;
  const featuredCount = allCars.filter((car) => car.featured === true).length;

  return {
    total: allCars.length,
    active,
    sold,
    hidden,
    dubaiCars,
    onTheWay,
    featuredCount,
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

function StatusRow({ label, count, total, color, icon: Icon, tooltip }) {
  const percentage = total > 0 ? Math.min(100, (count / total) * 100) : 0;

  return (
    <div
      title={tooltip}
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
  const { t } = useTranslation("admin");
  const { admin } = useAuth();
  const { data, loading, error, refetch } = useAsyncData(loadDashboardData, []);

  const insights = useMemo(() => {
    if (!data) return [];

    return [
      {
        key: "activeInventory",
        value: data.total > 0
          ? `${Math.round((data.active / data.total) * 100)}%`
          : "0%",
        icon: TrendingUp,
      },
      {
        key: "soldInventory",
        value: data.total > 0
          ? `${Math.round((data.sold / data.total) * 100)}%`
          : "0%",
        icon: CircleDollarSign,
      },
      {
        key: "featuredListings",
        value: formatNumber(data.featuredCount),
        icon: Star,
      },
    ];
  }, [data]);

  const statusTooltip = (label, count, percentage) =>
    t("dashboard.statusTooltip", {
      status: label,
      count: formatNumber(count),
      percentage: Math.round(percentage),
    });

  const total = data?.total ?? 0;
  const active = data?.active ?? 0;
  const sold = data?.sold ?? 0;
  const hidden = data?.hidden ?? 0;

  return (
    <div className="container-page min-h-full py-7 sm:py-10">
      <header className="mb-8 flex flex-col gap-5 border-b border-white/[0.08] pb-7 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2F8F7A]" />
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brass sm:text-xs">
              SAFAR MOTORS / {t("dashboard.adminLabel")}
            </p>
          </div>
          <h1 className="break-words font-display text-3xl font-semibold tracking-tight text-bone sm:text-4xl lg:text-[42px]">
            {t("dashboard.title")}
          </h1>
          <p className="mt-2 text-sm text-ash sm:text-base">
            {admin?.username
              ? t("dashboard.welcomeName", { name: admin.username })
              : t("dashboard.welcome")}
          </p>
        </div>

        <div
          title={t("dashboard.statusTooltipTitle")}
          className="flex w-fit items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 transition-colors hover:border-brass/30 hover:bg-white/[0.045]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brass/10 text-brass">
            <Warehouse size={19} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs text-ash">{t("dashboard.catalogStatus")}</p>
            <p className="mt-0.5 text-sm font-medium text-bone">
              {loading
                ? t("dashboard.updating")
                : error
                  ? t("dashboard.needsAttention")
                  : t("dashboard.overviewReady")}
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
              eyebrow={`01 / ${t("dashboard.keyMetrics")}`}
              title={t("dashboard.inventoryOverview")}
            />
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <StatCard label={t("dashboard.totalListings")} value={total} loading={loading} />
              <StatCard label={t("dashboard.activeCars")} value={active} loading={loading} accent="signal" />
              <StatCard label={t("dashboard.soldCars")} value={sold} loading={loading} />
              <StatCard label={t("dashboard.hiddenCars")} value={hidden} loading={loading} />
            </div>
          </section>

          <section className="mb-10">
            <SectionHeading
              eyebrow={`02 / ${t("dashboard.categories")}`}
              title={t("dashboard.vehicleDistribution")}
            />
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
              <OverviewCard
                icon={MapPin}
                label={t("dashboard.dubaiCars")}
                value={data?.dubaiCars ?? 0}
                tooltip={t("dashboard.dubaiTooltip")}
              />
              <OverviewCard
                icon={Route}
                label={t("dashboard.onTheWay")}
                value={data?.onTheWay ?? 0}
                iconClass="text-[#2F8F7A]"
                iconBackground="bg-[#2F8F7A]/10"
                tooltip={t("dashboard.onTheWayTooltip")}
              />
              <OverviewCard
                icon={Star}
                label={t("dashboard.featuredNow")}
                value={data?.featuredCount ?? 0}
                iconClass="text-[#D9AD68]"
                iconBackground="bg-[#D9AD68]/10"
                tooltip={t("dashboard.featuredTooltip")}
              />
            </div>
          </section>

          <section className="mb-10">
            <SectionHeading
              eyebrow={`03 / ${t("dashboard.performance")}`}
              title={t("dashboard.listingStatus")}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-colors hover:border-white/[0.13] sm:p-6 lg:col-span-3">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-bone">{t("dashboard.statusDistribution")}</h3>
                    <p className="mt-1 text-xs text-ash">{t("dashboard.allListings")}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brass/10 text-brass">
                    <CarFront size={20} strokeWidth={1.8} />
                  </div>
                </div>
                <div className="space-y-3">
                  <StatusRow
                    label={t("dashboard.active")}
                    count={active}
                    total={total}
                    color="text-[#2F8F7A]"
                    icon={CheckCircle2}
                    tooltip={statusTooltip(t("dashboard.active"), active, total ? (active / total) * 100 : 0)}
                  />
                  <StatusRow
                    label={t("dashboard.sold")}
                    count={sold}
                    total={total}
                    color="text-brass"
                    icon={CircleDollarSign}
                    tooltip={statusTooltip(t("dashboard.sold"), sold, total ? (sold / total) * 100 : 0)}
                  />
                  <StatusRow
                    label={t("dashboard.hidden")}
                    count={hidden}
                    total={total}
                    color="text-[#C1493D]"
                    icon={EyeOff}
                    tooltip={statusTooltip(t("dashboard.hidden"), hidden, total ? (hidden / total) * 100 : 0)}
                  />
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
                  <span className="text-sm text-ash">{t("dashboard.totalInventory")}</span>
                  <span className="text-lg font-semibold tabular-nums text-bone">{formatNumber(total)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-colors hover:border-white/[0.13] sm:p-6 lg:col-span-2">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brass/10 text-brass">
                    <TrendingUp size={20} strokeWidth={1.8} />
                  </div>
                  <h3 className="font-semibold text-bone">{t("dashboard.inventoryInsights")}</h3>
                </div>
                <div>
                  {insights.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.key}
                        title={t(`dashboard.insights.${item.key}Tooltip`)}
                        className={`group flex cursor-help items-center gap-3 rounded-lg px-2 py-4 transition-colors hover:bg-white/[0.04] ${index > 0 ? "border-t border-white/[0.07]" : ""}`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-brass transition-colors group-hover:bg-brass/10">
                          <Icon size={17} strokeWidth={1.8} />
                        </div>
                        <span className="min-w-0 flex-1 text-sm text-ash transition-colors group-hover:text-bone">
                          {t(`dashboard.insights.${item.key}`)}
                        </span>
                        <span className="text-lg font-semibold tabular-nums text-bone">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <footer className="flex items-center justify-between gap-3 border-t border-white/[0.08] pt-5">
            <span className="text-xs text-ash">SAFAR Motors</span>
            <span className="flex items-center gap-2 text-xs text-ash/70">
              <Package size={14} />
              {t("dashboard.adminOverview")}
            </span>
          </footer>
        </>
      )}
    </div>
  );
}
