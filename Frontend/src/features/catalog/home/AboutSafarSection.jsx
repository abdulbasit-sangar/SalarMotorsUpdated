import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShieldIcon,
  ClipboardCheckIcon,
  ShippingIcon,
  HeadsetIcon,
} from "../../../shared/components/icons.jsx";

// Copy lives in locales/*/home.json under why.items.<key>.
const WHY_CHOOSE = [
  { key: "verified", icon: ShieldIcon },
  { key: "inspection", icon: ClipboardCheckIcon },
  { key: "import", icon: ShippingIcon },
  { key: "support", icon: HeadsetIcon },
];

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

export const AboutSafarSection = () => {
  const { t } = useTranslation("home");

  return (
    <section className="bg-graphite-900 py-16 sm:py-24">
      <div className="container-page relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-eyebrow">{t("whatIs.eyebrow")}</p>
          <h2 className="section-title text-section-light">
            {t("whatIs.title")}
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="card-light rounded-premium-lg shadow-card p-5 sm:p-8 mt-8 sm:mt-10 space-y-5">
            <p className="text-card text-base sm:text-lg leading-relaxed">
              {t("whatIs.p1")}
            </p>
            <p className="text-card-muted text-sm sm:text-base leading-relaxed">
              {t("whatIs.p2")}
            </p>
            <p className="text-card-muted text-sm sm:text-base leading-relaxed">
              {t("whatIs.p3")}
            </p>

            <div className="pt-4 flex flex-wrap gap-4">
              <Link
                to="/listings"
                className="h-11 px-6 flex items-center bg-brass text-graphite-950 font-semibold text-sm rounded-xl transition-colors hover:bg-brass-dark"
              >
                {t("whatIs.cta")}
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center max-w-2xl mx-auto mt-14 sm:mt-16">
          <h3 className="section-title text-section-light">
            {t("why.title")}
          </h3>
          <p className="section-subtitle text-section-light-muted mx-auto">
            {t("why.subtitle")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-8 sm:mt-10">
          {WHY_CHOOSE.map((item) => (
            <IconCard key={item.key} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
};
