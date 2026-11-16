import { useTranslation } from "react-i18next";
import {
  ArrowRightIcon,
  AwardIcon,
  BoltIcon,
  CheckIcon,
} from "../../../shared/components/icons.jsx";

// ── The only two things to change when prices or contact change ────────────
// WhatsApp number: the same official number already used in Footer.jsx.
// Prices: $50 for 1 month and $90 for 2 months are the prices the owner
// gave, with unlimited car listings. `was` is the regular price shown
// struck through — $80 a month, so $160 for two months. If `was` changes,
// change the "save" line for that plan in home.json to match.
const MEMBERSHIP_WHATSAPP_NUMBER = "93770957493";

const PLANS = [
  { key: "oneMonth", price: 50, was: 80, limitedOffer: true, popular: false },
  { key: "twoMonths", price: 90, was: 160, limitedOffer: false, popular: true },
];

const BENEFIT_KEYS = ["b1", "b2", "b3", "b4"];

// Theme-adaptive band artwork: the gradient is built from the site's own
// CSS variables, so it flips with the theme toggle — a clear pale-blue wash
// in light mode, fairly dark deep blue in dark mode — with no JavaScript
// theme listener. The gradient mirrors in RTL, like the slider. The only
// decoration on the band is the small halftone dots below.
const BAND = (isRtl) =>
  `linear-gradient(to ${isRtl ? "left" : "right"}, var(--color-graphite-900) 0%, var(--color-brand-soft) 50%, var(--color-graphite-900) 100%)`;

export const MembershipSection = () => {
  const { t, i18n } = useTranslation("home");
  const isRtl = i18n.dir() === "rtl";

  const planHref = (plan) =>
    `https://wa.me/${MEMBERSHIP_WHATSAPP_NUMBER}?text=${encodeURIComponent(
      t("membership.whatsappMessage", {
        plan: t(`membership.plans.${plan.key}.name`),
      }),
    )}`;

  return (
    <section
      aria-labelledby="membership-title"
      className="relative overflow-hidden border-y border-steel py-16 sm:py-24"
    >
      {/* Pale-blue band in light mode, deep-blue band in dark mode. */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: BAND(isRtl) }}
        aria-hidden="true"
      />

      {/* Fading halftone dots, tinted by the theme's brand blue. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-brass) 1.3px, transparent 1.5px)",
          backgroundSize: "22px 22px",
          opacity: 0.18,
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black 55%, transparent 92%)",
          maskImage:
            "linear-gradient(to bottom, black 0%, black 55%, transparent 92%)",
        }}
        aria-hidden="true"
      />

      <div className="container-page relative z-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="membership-title"
            className="font-display text-xl font-bold leading-tight text-bone sm:text-2xl lg:text-3xl"
          >
            {t("membership.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-xs leading-relaxed text-ash sm:text-sm">
            {t("membership.subtitle")}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl sm:mt-12">
          <h3 className="text-center text-xs font-semibold uppercase tracking-wider text-ash">
            {t("membership.benefitsTitle")}
          </h3>
          <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {BENEFIT_KEYS.map((benefitKey) => (
              <li key={benefitKey} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brass/10">
                  <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-xs leading-relaxed text-bone sm:text-sm">
                  {t(`membership.benefits.${benefitKey}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-5 sm:mt-12 md:grid-cols-2">
          {PLANS.map((plan) => {
            const popular = plan.popular;
            return (
              <div
                key={plan.key}
                className={
                  popular
                    ? "relative flex flex-col rounded-premium-lg bg-[#2563EB] p-5 shadow-premium ring-1 ring-white/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-6"
                    : "card-light relative flex flex-col rounded-premium-lg p-5 shadow-premium transition-all duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-6"
                }
              >
                {plan.limitedOffer && (
                  <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#DC2626] px-3 py-1 text-xs font-semibold text-white">
                    <BoltIcon
                      className="h-3.5 w-3.5 text-white"
                      aria-hidden="true"
                    />
                    {t("membership.limitedOffer")}
                  </span>
                )}

                {popular && (
                  <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                    <AwardIcon
                      className="h-3.5 w-3.5 text-white"
                      aria-hidden="true"
                    />
                    {t("membership.popular")}
                  </span>
                )}

                <h3
                  className={`font-display text-lg font-bold ${popular ? "text-white" : "text-card"}`}
                >
                  {t(`membership.plans.${plan.key}.name`)}
                </h3>

                <p className="mt-3 flex items-baseline gap-2">
                  <span
                    className={`ltr-isolate text-lg font-semibold line-through ${popular ? "text-white/60" : "text-card-muted"}`}
                  >
                    ${plan.was}
                  </span>
                  <span
                    className={`ltr-isolate font-display text-4xl font-bold ${popular ? "text-white" : "text-card"}`}
                  >
                    ${plan.price}
                  </span>
                  <span
                    className={`text-sm ${popular ? "text-white/85" : "text-card-muted"}`}
                  >
                    {t(`membership.plans.${plan.key}.period`)}
                  </span>
                </p>

                <p
                  className={`mt-3 w-fit rounded-full px-3 py-1.5 text-xs font-semibold leading-snug ${popular ? "bg-white/15 text-white" : "bg-brass/10 text-brass-dark"}`}
                >
                  {t(`membership.plans.${plan.key}.save`)}
                </p>

                <div className="mt-auto pt-6">
                  <a
                    href={planHref(plan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      "flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors " +
                      (popular
                        ? "bg-[#FFFFFF] text-[#1D4ED8] shadow-sm hover:bg-[#EFF6FF]"
                        : "border border-brass/40 text-brass-dark hover:bg-brass/10")
                    }
                  >
                    {t("membership.cta")}
                    <ArrowRightIcon
                      className={
                        popular
                          ? "h-4 w-4 text-[#1D4ED8]"
                          : "h-4 w-4 text-brass-dark"
                      }
                      aria-hidden="true"
                    />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
