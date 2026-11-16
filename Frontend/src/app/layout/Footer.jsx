import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  MailIcon,
  FacebookIcon,
  InstagramIcon,
  PhoneIcon,
} from "../../shared/components/icons.jsx";
import { LanguageSwitcher } from "../../shared/components/LanguageSwitcher.jsx";
import {
  LOCATION_ON_THE_WAY,
  dubaiCarsPath,
  onTheWayPath,
} from "../../shared/constants/locations.js";
import logoLight from "../../assets/safarLogo-Light.svg";
import logoDark from "../../assets/safarLogo-Dark.svg";

// Brand marks shared with the Follow Us section, kept here so this file
// stays self-contained: the same four marks, the same colors, the same
// links. If a mark or a link ever changes, change it in both files.

// WhatsApp — the real WhatsApp mark: the phone handset inside the speech
// bubble. The Simple Icons WhatsApp glyph (CC0, verified against the
// simple-icons repo), in the brand green. WhatsApp Business uses the
// same glyph; its app badge adds a green rounded square behind it,
// which this footer deliberately does not use — no boxes.
const WhatsappBrandIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      fill="#25D366"
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
    />
  </svg>
);

// YouTube — the platform's own badge: a red rounded rectangle with a
// white play triangle. A fixed brand mark, so it carries its own colors
// instead of following the site's icon color system.
const YoutubeBrandIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000" />
    <path d="M10 9.3v5.4L15.2 12Z" fill="#ffffff" />
  </svg>
);

// TikTok — the note mark, drawn as a stem with a flag and a round head.
// TikTok's own logo is black on light backgrounds and white on dark
// ones, so the note uses currentColor with the theme-flipping text-card
// color: near-black in light mode, near-white in dark mode.
const TikTokBrandIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M14.7 2.5h1.3c1.2 2.5 3 4 5.5 4.2v3.1c-1.5 0-2.9-.4-4.1-1.1v6.7c0 3.7-2.6 6.1-5.9 6.1-3.2 0-5.7-2.3-5.7-5.2 0-2.7 2.2-4.8 5.1-5.1 1.1-.1 2.5.2 3.8 1ZM11.8 13.8c1.5 0 2.6 1.2 2.6 2.6 0 1.5-1.1 2.6-2.6 2.6-1.4 0-2.6-1.1-2.6-2.6 0-1.4 1.2-2.6 2.6-2.6Z"
    />
  </svg>
);

// Telegram — the paper plane in the platform's blue, with a white fold
// line from the tip to the center, as in the official mark.
const TelegramBrandIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="m22 2-7 20-4-9-9-4Z" fill="#229ED9" />
    <path
      d="M22 2 11 13"
      stroke="#ffffff"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

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

// Same six channels, same links, same order as the Follow Us section.
// Facebook and WhatsApp keep the exact official links; Instagram keeps
// its existing link; YouTube, TikTok and Telegram link to each
// platform's home page until Safar handles exist for them — no profile
// URLs are invented here. Icon sizes step with the screen (28px on
// phones, 32px on tablets and desktops) so the single row always fits
// the brand column on every device.
const SOCIAL_LINKS = [
  {
    href: "https://www.facebook.com/share/18yrLpJSkU/",
    label: "Facebook",
    icon: FacebookIcon,
    iconClass: "h-7 w-7 text-[#1877F2] sm:h-8 sm:w-8",
  },
  {
    href: "https://wa.me/93770957493",
    label: "WhatsApp",
    icon: WhatsappBrandIcon,
    iconClass: "h-7 w-7 sm:h-8 sm:w-8",
  },
  {
    href: "https://instagram.com",
    label: "Instagram",
    icon: InstagramIcon,
    iconClass: "h-7 w-7 text-[#E1306C] sm:h-8 sm:w-8",
  },
  {
    href: "https://www.youtube.com/",
    label: "YouTube",
    icon: YoutubeBrandIcon,
    iconClass: "h-7 w-7 sm:h-8 sm:w-8",
  },
  {
    href: "https://www.tiktok.com/",
    label: "TikTok",
    icon: TikTokBrandIcon,
    iconClass: "h-7 w-7 text-card sm:h-8 sm:w-8",
  },
  {
    href: "https://telegram.org/",
    label: "Telegram",
    icon: TelegramBrandIcon,
    iconClass: "h-7 w-7 sm:h-8 sm:w-8",
  },
];

export const Footer = () => {
  const { t } = useTranslation("layout");
  return (
  <footer className="border-t border-card bg-white text-bone">
    {/* Main Content Container — same left and right space as the
        Promoted Vehicles section: container-listing, not the narrower
        container-page. */}
    <div className="container-listing py-12 sm:py-14">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        {/* Brand & Corporate Overview (Col 1-5) */}
        <div className="space-y-5 lg:col-span-5">
          <Link
            to="/"
            className="inline-block rounded-lg focus-visible:ring-2 focus-visible:ring-brass/70"
          >
            <img
              src={logoLight}
              alt="Safar"
              className="logo-light h-12 w-auto object-contain"
            />
            <img
              src={logoDark}
              alt="Safar"
              className="logo-dark h-12 w-auto object-contain"
            />
          </Link>

          <p className="max-w-md text-sm leading-relaxed text-ash">
            {t("footer.about")}
          </p>

          {/* Social Icons — the same bare brand marks as the Follow Us
              section, in one row. Hover only grows the icon slightly. */}
          <div>
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-wider text-ash">
              {t("footer.channels")}
            </span>
            <div className="flex flex-nowrap items-center gap-3 lg:gap-5">
              {SOCIAL_LINKS.map(({ href, label, icon: Icon, iconClass }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="rounded-full transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <Icon className={iconClass} />
                </a>
              ))}
            </div>
          </div>

          {/* Language — placed here in the main footer, with the same
              fair spacing as the rest of the column, instead of down
              in the bottom bar. No tone prop: the default styling uses
              the theme-flipping text tokens, so it stays readable in
              both light and dark mode (tone="light" uses fixed dark
              text and would vanish on the dark-mode footer). w-fit
              keeps the pill sized to its content instead of stretching
              across the column. */}
          <LanguageSwitcher className="w-fit" />
        </div>

        {/* Quick Navigation Links (Col 6-8) — plain text rows: no
            bullet dots, no accent bar on the heading. Hover only
            changes the text color. */}
        <div className="lg:col-span-3">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-bone">
            {t("footer.quickNavigation")}
          </h3>
          <ul className="space-y-3">
            {QUICK_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="inline-flex items-center text-sm text-ash transition-colors hover:text-brass-dark"
                >
                  <span className="font-medium">{t(link.labelKey)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Direct Contact Support Hub (Col 9-12) — plain rows, no
            boxes or borders around the phone and email. Hover only
            changes the number/address color. */}
        <div className="lg:col-span-4">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-bone">
            {t("footer.supportHub")}
          </h3>
          <div className="space-y-3">
            {/* Phone */}
            <a
              href="tel:+93770957493"
              className="group flex min-w-0 items-center gap-3"
            >
              <PhoneIcon className="h-5 w-5 shrink-0 text-brass" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-ash">
                  {t("footer.callHotline")}
                </span>
                <span className="ltr-isolate block truncate text-sm font-semibold text-bone transition-colors group-hover:text-brass-dark rtl:text-end">
                  +93 (0) 770957493
                </span>
              </span>
            </a>

            {/* Email */}
            <a
              href="mailto:salar.motors10@gmail.com"
              className="group flex min-w-0 items-center gap-3"
            >
              <MailIcon className="h-5 w-5 shrink-0 text-brass" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-ash">
                  {t("footer.emailDesk")}
                </span>
                <span className="ltr-isolate block truncate text-xs font-semibold text-bone transition-colors group-hover:text-brass-dark sm:text-sm rtl:text-end">
                  salar.motors10@gmail.com
                </span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom Copyright Bar */}
    <div className="border-t border-card bg-white">
      <div className="container-listing flex flex-col gap-3 py-4 text-xs text-ash sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 font-medium">
          <span className="text-bone">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </span>
          <span>{t("footer.rights")}</span>
        </p>
        <span className="text-ash">
          {t("footer.disclaimer")}
        </span>
      </div>
    </div>
  </footer>
  );
};
