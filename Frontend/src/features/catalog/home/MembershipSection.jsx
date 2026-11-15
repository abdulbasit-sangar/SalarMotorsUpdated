import { useTranslation } from "react-i18next";
import {
  AwardIcon,
  CheckIcon,
} from "../../../shared/components/icons.jsx";

// ── The only two things to change when prices or contact change ────────────
// WhatsApp number: the same official number already used in Footer.jsx.
// Prices: $50 for 6 months is the price the owner gave. $90 for 12 months
// is a placeholder — confirm the yearly price before publishing, then
// change the number below and the "save" line in home.json.
const MEMBERSHIP_WHATSAPP_NUMBER = "93770957493";

const PLANS = [
  { key: "sixMonths", price: 50, popular: false },
  { key: "twelveMonths", price: 90, popular: true },
];

const BENEFIT_KEYS = ["b1", "b2", "b3", "b4"];

export const MembershipSection = () => {
  const { t } = useTranslation("home");

  const planHref = (plan) =>
    `https://wa.me/${MEMBERSHIP_WHATSAPP_NUMBER}?text=${encodeURIComponent(
      t("membership.whatsappMessage", {
        plan: t(`membership.plans.${plan.key}.name`),
      }),
    )}`;

  return (
    <section className="bg-graphite-950 py-16 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-eyebrow">{t("membership.eyebrow")}</p>
          <h2 className="section-title">{t("membership.title")}</h2>
          <p className="section-subtitle mx-auto">
            {t("membership.subtitle")}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl sm:mt-12">
          <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-ash">
            {t("membership.benefitsTitle")}
          </h3>
          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {BENEFIT_KEYS.map((benefitKey) => (
              <li key={benefitKey} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brass/10 text-brass-dark">
                  <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-sm leading-relaxed text-bone">
                  {t(`membership.benefits.${benefitKey}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={
                "card-light relative flex flex-col rounded-premium-lg p-6 shadow-card sm:p-8 " +
                (plan.popular ? "ring-2 ring-brass" : "")
              }
            >
              {plan.popular && (
                <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-brass px-3 py-1 text-xs font-semibold text-graphite-950">
                  <AwardIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("membership.popular")}
                </span>
              )}

              <h3 className="font-display text-xl font-bold text-card">
                {t(`membership.plans.${plan.key}.name`)}
              </h3>

              <p className="mt-4 flex items-baseline gap-2">
                <span className="ltr-isolate font-display text-5xl font-bold text-card">
                  ${plan.price}
                </span>
                <span className="text-sm text-card-muted">
                  {t(`membership.plans.${plan.key}.period`)}
                </span>
              </p>

              <p className="mt-3 text-sm font-medium text-card-muted">
                {t(`membership.plans.${plan.key}.save`)}
              </p>

              <a
                href={planHref(plan)}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  "mt-6 flex h-12 items-center justify-center rounded-xl text-sm font-semibold transition-colors " +
                  (plan.popular
                    ? "bg-brass text-graphite-950 hover:bg-brass-dark"
                    : "border border-brass/40 text-brass-dark hover:bg-brass/10")
                }
              >
                {t("membership.cta")}
              </a>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-sm leading-relaxed text-ash">
          {t("membership.note")}
        </p>
      </div>
    </section>
  );
};
