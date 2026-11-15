import { useTranslation } from "react-i18next";
import {
  ArrowRightIcon,
  FacebookIcon,
  InstagramIcon,
  WhatsappIcon,
} from "../../../shared/components/icons.jsx";

// The same official channels already linked in Footer.jsx — no new
// accounts, no placeholder links. Change a URL here and in Footer.jsx
// together if a handle ever changes.
const SOCIALS = [
  {
    key: "facebook",
    name: "Facebook",
    href: "https://www.facebook.com/share/18yrLpJSkU/",
    icon: FacebookIcon,
    chipClass: "bg-[#1877F2]",
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    href: "https://wa.me/93770957493",
    icon: WhatsappIcon,
    chipClass: "bg-[#25D366]",
  },
  {
    key: "instagram",
    name: "Instagram",
    href: "https://instagram.com",
    icon: InstagramIcon,
    chipClass: "bg-[#E4405F]",
  },
];

export const FollowUsSection = () => {
  const { t } = useTranslation("home");

  return (
    <section className="bg-brand-navy py-16 sm:py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-brand-light">
            {t("followUs.eyebrow")}
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
            {t("followUs.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            {t("followUs.subtitle")}
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          {SOCIALS.map(({ key, name, href, icon: Icon, chipClass }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t(`followUs.channels.${key}.action`)}
              className="group flex items-center gap-4 rounded-2xl border border-white/15 bg-white/5 p-4 transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:p-5"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white ${chipClass}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-base font-bold text-white">
                  {name}
                </span>
                <span className="block truncate text-sm text-white/60">
                  {t(`followUs.channels.${key}.action`)}
                </span>
              </span>
              <ArrowRightIcon
                className="ms-auto h-5 w-5 shrink-0 text-white/40 transition-colors group-hover:text-white rtl:-scale-x-100"
                aria-hidden="true"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
