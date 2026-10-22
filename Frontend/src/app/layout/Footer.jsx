import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  MailIcon,
  FacebookIcon,
  InstagramIcon,
  PhoneIcon,
  WhatsappIcon,
} from "../../shared/components/icons.jsx";
import {
  LOCATION_ON_THE_WAY,
  dubaiCarsPath,
  onTheWayPath,
} from "../../shared/constants/locations.js";
import logo from "../../assets/salarmotors.svg";

const QUICK_LINKS = [
  { to: "/", labelKey: "nav.home" },
  { to: "/listings", labelKey: "nav.allCars" },
  { to: dubaiCarsPath(), labelKey: "nav.dubaiCars" },
  {
    to: onTheWayPath(LOCATION_ON_THE_WAY.AMERICA_TO_HERAT),
    labelKey: "footer.onTheWayAmerica",
  },
  {
    to: onTheWayPath(LOCATION_ON_THE_WAY.DUBAI_TO_HERAT),
    labelKey: "footer.onTheWayDubai",
  },
];

const SOCIAL_LINKS = [
  {
    href: "https://www.facebook.com/share/18yrLpJSkU/",
    label: "Facebook",
    icon: FacebookIcon,
    accent:
      "hover:bg-[#1877F2]/10 hover:border-[#1877F2]/40 hover:text-[#1877F2]",
  },
  {
    href: "https://wa.me/93770957493",
    label: "WhatsApp",
    icon: WhatsappIcon,
    accent:
      "hover:bg-[#25D366]/10 hover:border-[#25D366]/40 hover:text-[#25D366]",
  },
  {
    href: "https://instagram.com",
    label: "Instagram",
    icon: InstagramIcon,
    accent:
      "hover:bg-[#E4405F]/10 hover:border-[#E4405F]/40 hover:text-[#E4405F]",
  },
];

export const Footer = () => {
  const { t } = useTranslation("layout");
  return (
  <footer className="border-t border-card bg-graphite-900 text-bone">
    {/* Main Content Container */}
    <div className="container-page py-12 sm:py-14">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        {/* Brand & Corporate Overview (Col 1-5) */}
        <div className="space-y-5 lg:col-span-5">
          <Link
            to="/"
            className="inline-block rounded-lg focus-visible:ring-2 focus-visible:ring-brass/70"
          >
            <img
              src={logo}
              alt="Salar Motors"
              className="h-12 w-auto object-contain"
            />
          </Link>

          <p className="max-w-md text-sm leading-relaxed text-ash">
            {t("footer.about")}
          </p>

          {/* Social Icons with Brand Hover States */}
          <div>
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-wider text-ash">
              {t("footer.channels")}
            </span>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map(({ href, label, icon: Icon, accent }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={`group relative flex h-10 w-10 items-center justify-center rounded-xl border border-card bg-white text-ash transition-colors ${accent} focus-visible:ring-2 focus-visible:ring-brass/50`}
                >
                  <Icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Navigation Links (Col 6-8) */}
        <div className="lg:col-span-3">
          <h3 className="mb-4 flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-bone">
            <span className="h-3.5 w-1 rounded-sm bg-brass" />
            {t("footer.quickNavigation")}
          </h3>
          <ul className="space-y-3">
            {QUICK_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="group inline-flex items-center text-sm text-ash transition-colors hover:text-brass-dark"
                >
                  <span className="me-3 h-1.5 w-1.5 shrink-0 rounded-full bg-steel transition-colors group-hover:bg-brass" />
                  <span className="font-medium">{t(link.labelKey)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Direct Contact Support Hub (Col 9-12) */}
        <div className="lg:col-span-4">
          <h3 className="mb-4 flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-bone">
            <span className="h-3.5 w-1 rounded-sm bg-brass" />
            {t("footer.supportHub")}
          </h3>
          <div className="space-y-3">
            {/* Phone Card */}
            <a
              href="tel:+93770957493"
              className="group relative flex min-w-0 items-center gap-3 rounded-xl border border-card bg-white p-3.5 transition-colors hover:border-brass/50 hover:bg-graphite-50"
            >
              <div className="shrink-0 rounded-lg border border-brass/20 bg-brass/10 p-2.5 text-brass-dark transition-colors group-hover:bg-brass group-hover:text-white">
                <PhoneIcon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-ash">
                  {t("footer.callHotline")}
                </span>
                <span className="ltr-isolate block truncate text-sm font-semibold text-bone transition-colors group-hover:text-brass-dark rtl:text-end">
                  +93 (0) 770957493
                </span>
              </div>
            </a>

            {/* Email Card */}
            <a
              href="mailto:salar.motors10@gmail.com"
              className="group relative flex min-w-0 items-center gap-3 rounded-xl border border-card bg-white p-3.5 transition-colors hover:border-brass/50 hover:bg-graphite-50"
            >
              <div className="shrink-0 rounded-lg border border-brass/20 bg-brass/10 p-2.5 text-brass-dark transition-colors group-hover:bg-brass group-hover:text-white">
                <MailIcon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-ash">
                  {t("footer.emailDesk")}
                </span>
                <span className="ltr-isolate block truncate text-xs font-semibold text-bone transition-colors group-hover:text-brass-dark sm:text-sm rtl:text-end">
                  salar.motors10@gmail.com
                </span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom Copyright Bar */}
    <div className="border-t border-card bg-graphite-100">
      <div className="container-page flex flex-col gap-3 py-4 text-xs text-ash sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 font-medium">
          <span className="text-bone">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-ash sm:inline" />
          <span>{t("footer.rights")}</span>
        </p>
        <div className="flex items-center">
          <span className="text-ash">
            {t("footer.disclaimer")}
          </span>
        </div>
      </div>
    </div>
  </footer>
  );
};
