import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HeroSection } from "./HeroSection.jsx";
import {
  ShieldIcon,
  ClipboardCheckIcon,
  ShippingIcon,
  HeadsetIcon,
} from "../../../shared/components/icons.jsx";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import {
  fetchFeaturedCars,
  fetchCars,
} from "../../../services/cars/carsApi.js";

// Copy lives in locales/*/home.json under why.items.<key> / how.steps.<key>.
const WHY_CHOOSE = [
  { key: "verified", icon: ShieldIcon },
  { key: "inspection", icon: ClipboardCheckIcon },
  { key: "import", icon: ShippingIcon },
  { key: "support", icon: HeadsetIcon },
];

const HOW_IT_WORKS = [
  { step: 1, key: "browse" },
  { step: 2, key: "contact" },
  { step: 3, key: "inspect" },
  { step: 4, key: "purchase" },
];

const loadHomeData = async () => {
  const [featured, recent] = await Promise.all([
    fetchFeaturedCars(8),
    fetchCars({ page: 1, limit: 8, sort: "newest" }),
  ]);

  return {
    featuredCars: featured.cars,
    recentCars: recent.cars,
    stats: {
      total: recent.pagination.totalCars,
      featured: featured.cars.length,
    },
  };
};

const IconCard = ({ item }) => {
  const { t } = useTranslation("home");
  const Icon = item.icon;
  return (
    <div
      className={
        "group card-light rounded-premium-lg p-5 sm:p-7 shadow-card text-center " +
        "transition-all duration-500 ease-out hover:-translate-y-0.5 hover:border-brass/30"
      }
    >
      <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-xl bg-graphite-100 text-brass-dark mb-4">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-bold text-card">
        {t(`why.items.${item.key}.title`)}
      </h3>
      <p className="text-card-muted text-sm mt-3 leading-relaxed">
        {t(`why.items.${item.key}.description`)}
      </p>
    </div>
  );
};

const StepCard = ({ step, title, description, isLast }) => (
  <div className="relative flex flex-col items-center text-center">
    <div
      className={
        "w-12 h-12 flex items-center justify-center rounded-full bg-brass text-graphite-950 font-display font-bold text-lg mb-4 " +
        "transition-all duration-500 ease-out hover:scale-110"
      }
    >
      {step}
    </div>
    <h3 className="font-display text-lg font-bold text-bone">{title}</h3>
    <p className="text-ash text-sm mt-2 leading-relaxed max-w-[200px]">
      {description}
    </p>
    {!isLast && (
      <div
        className="hidden lg:block absolute top-6 start-[calc(50%+2rem)] h-px bg-steel overflow-hidden"
        style={{ width: "calc(100% - 4rem)" }}
        aria-hidden="true"
      >
        <div className="h-full bg-brass/60 w-full" />
      </div>
    )}
  </div>
);

export default function HomePage() {
  const { t } = useTranslation("home");
  const { data } = useAsyncData(loadHomeData, []);

  return (
    <div>
      <HeroSection heroCar={data?.featuredCars?.[0]} />

      {/* Why Choose Salar Motors */}
      {/* pt trimmed to pt-10/14 (was py-16/24, i.e. the same value on both
          top and bottom): the hero above already ends with its own small
          bottom padding plus a negative-margin overlap into its image, so
          reusing the full py-16/24 for THIS section's top as well stacked
          two paddings together and showed as extra empty space beneath
          the hero on mobile. Bottom padding is unchanged. */}
      <section className="bg-section-light pt-10 pb-16 sm:pt-14 sm:pb-24 relative overflow-hidden">
        <div className="container-page relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <h2 className="section-title text-section-light">
              {t("why.title")}
            </h2>
            <p className="section-subtitle text-section-light-muted mx-auto">
              {t("why.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {WHY_CHOOSE.map((item) => (
              <IconCard key={item.key} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-graphite-950 py-16 sm:py-24">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="section-title">{t("how.title")}</h2>
            <p className="section-subtitle mx-auto">{t("how.subtitle")}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            {HOW_IT_WORKS.map((item, index) => (
              <StepCard
                key={item.key}
                step={item.step}
                title={t(`how.steps.${item.key}.title`)}
                description={t(`how.steps.${item.key}.description`)}
                isLast={index === HOW_IT_WORKS.length - 1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-graphite-900 py-14 sm:py-20">
        <div className="container-page relative z-10">
          <div className="max-w-3xl mx-auto">
            <h2 className="section-title text-section-light text-center">
              {t("about.title")}
            </h2>

            <div className="card-light rounded-premium-lg shadow-card p-5 sm:p-8 mt-8 sm:mt-10 space-y-5">
              <p className="text-card text-base sm:text-lg leading-relaxed">
                {t("about.p1")}
              </p>
              <p className="text-card-muted text-sm sm:text-base leading-relaxed">
                {t("about.p2")}
              </p>
              <p className="text-card-muted text-sm sm:text-base leading-relaxed">
                {t("about.p3")}
              </p>

              <div className="pt-4 flex flex-wrap gap-4">
                <Link
                  to="/listings"
                  className="h-11 px-6 flex items-center bg-brass text-graphite-950 font-semibold text-sm rounded-xl transition-colors hover:bg-brass-light"
                >
                  {t("about.cta")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
