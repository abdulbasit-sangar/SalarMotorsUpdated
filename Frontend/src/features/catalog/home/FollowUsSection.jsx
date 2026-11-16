import { useTranslation } from "react-i18next";
import {
  FacebookIcon,
  InstagramIcon,
} from "../../../shared/components/icons.jsx";

// WhatsApp — the real WhatsApp mark: the phone handset inside the speech
// bubble. This is the Simple Icons WhatsApp glyph (CC0, verified against
// the simple-icons repo), in the brand green. It replaces the generic
// chat-bubble substitute the site used before. WhatsApp Business uses
// the same glyph; its app badge adds a green rounded square behind it,
// which this section deliberately does not use — no boxes.
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

// Facebook and WhatsApp keep the exact official links already used in
// Footer.jsx. Instagram keeps its existing link. YouTube, TikTok and
// Telegram link to each platform's home page for now — no Safar handles
// for them were given, so no profile URLs are invented here. When the
// handles exist, replace the href below with the profile URL, one line
// each; nothing else needs to move.
const SOCIALS = [
  {
    key: "facebook",
    name: "Facebook",
    href: "https://www.facebook.com/share/18yrLpJSkU/",
    icon: FacebookIcon,
    iconClass: "h-7 w-7 text-[#1877F2] sm:h-9 sm:w-9 md:h-11 md:w-11",
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    href: "https://wa.me/93770957493",
    icon: WhatsappBrandIcon,
    iconClass: "h-7 w-7 sm:h-9 sm:w-9 md:h-11 md:w-11",
  },
  {
    key: "instagram",
    name: "Instagram",
    href: "https://instagram.com",
    icon: InstagramIcon,
    iconClass: "h-7 w-7 text-[#E1306C] sm:h-9 sm:w-9 md:h-11 md:w-11",
  },
  {
    key: "youtube",
    name: "YouTube",
    href: "https://www.youtube.com/",
    icon: YoutubeBrandIcon,
    iconClass: "h-7 w-7 sm:h-9 sm:w-9 md:h-11 md:w-11",
  },
  {
    key: "tiktok",
    name: "TikTok",
    href: "https://www.tiktok.com/",
    icon: TikTokBrandIcon,
    iconClass: "h-7 w-7 text-card sm:h-9 sm:w-9 md:h-11 md:w-11",
  },
  {
    key: "telegram",
    name: "Telegram",
    href: "https://telegram.org/",
    icon: TelegramBrandIcon,
    iconClass: "h-7 w-7 sm:h-9 sm:w-9 md:h-11 md:w-11",
  },
];

// Follow us, nothing else: the heading, then the six social icons in
// their original colors, in ONE row on every device — the row never
// wraps. The icons shrink as the screen gets smaller (44px on tablets
// and desktops, 36px on small tablets, 28px on phones) and the gaps
// shrink with them, so all six always fit the row with room to spare.
// No boxes, no arrows, no labels, no extra text. The platform names
// stay as screen-reader labels on the links, so the row stays clean
// visually and still reads correctly for assistive technology.
//
// The band is clear in both themes: bg-white is white in light mode and
// flips to the dark card surface in dark mode, the heading uses the
// flipping text-card color, and the hairline border separates the strip
// from the sections around it without adding a box.
export const FollowUsSection = () => {
  const { t } = useTranslation("home");

  return (
    <section className="border-y border-card bg-white py-12 sm:py-16">
      <div className="container-page">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-2xl font-bold leading-tight text-card sm:text-3xl">
            {t("followUs.title")}
          </h2>
          <div className="mt-8 flex flex-nowrap items-center justify-center gap-3 sm:gap-6 md:gap-10">
            {SOCIALS.map(({ key, name, href, icon: Icon, iconClass }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name}
                className="rounded-full transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                <Icon className={iconClass} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
