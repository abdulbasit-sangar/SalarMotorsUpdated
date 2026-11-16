import { useTranslation } from "react-i18next";
import {
  ShieldIcon,
  ClipboardCheckIcon,
  ShippingIcon,
  HeadsetIcon,
} from "../../../shared/components/icons.jsx";

// Copy lives in locales/*/home.json under why.items.<key> and whatIs.*.
//
// Card pictures: each card has its own picture — Pic4.jpg, Pic5.jpg,
// Pic6.jpg and Pic7.jpg in Frontend/public/Images/. If any of them is
// not saved there yet, that card's banner will be empty — save the
// files first, then paste this file.
const WHY_CHOOSE = [
  {
    key: "verified",
    icon: ShieldIcon,
    image: "/Images/Pic4.jpg",
    positionClass: "object-center",
  },
  {
    key: "inspection",
    icon: ClipboardCheckIcon,
    image: "/Images/Pic5.jpg",
    positionClass: "object-[50%_58%]",
  },
  {
    key: "import",
    icon: ShippingIcon,
    image: "/Images/Pic6.jpg",
    positionClass: "object-center",
  },
  {
    key: "support",
    icon: HeadsetIcon,
    image: "/Images/Pic7.jpg",
    positionClass: "object-center",
  },
];

// Copart-style banner fade in the site's own light blue (#60A5FA, the
// Primary Light Blue of the Safar palette). The fade is one smooth
// blend with no flat solid stretch: it is strongest on the
// reading-start side, where the badge and title sit, and starts mixing
// into the picture from the very edge, so no solid block of color sits
// behind the badge and title. It melts away to the far edge, so there
// is no line where the tint ends. It mirrors in RTL.
const BANNER_FADE = (isRtl) =>
  `linear-gradient(to ${isRtl ? "left" : "right"}, rgba(96, 165, 250, 0.75) 0%, rgba(96, 165, 250, 0.45) 30%, rgba(96, 165, 250, 0.15) 55%, rgba(96, 165, 250, 0) 100%)`;

// Words wrapped in **double asterisks** in the locale text render in the
// brand blue, semibold, so the important words stand out. Each language
// marks its own words, so the highlight always lands on the right phrase
// in English, Pashto and Dari. Text without markers renders plain.
const renderHighlighted = (text) =>
  String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <span key={index} className="font-semibold text-brass">
          {part.slice(2, -2)}
        </span>
      ) : (
        part
      ),
    );

// Copart format, with Safar's own content: a photo banner with the light
// blue fade and the smaller badge + title at the middle of the
// reading-start side. The card is the banner only — no text below it.
// The title is white, with a soft dark shadow behind the letters so it
// stays readable over the transparent fade and bright photos.
//
// The banner picture is NEVER cropped: it renders whole with
// object-contain, whatever shape the picture is. A blurred, enlarged copy
// of the same picture fills the banner behind it, so there are no empty
// bands — the browser downloads the file once, both layers share it.
// The sharp picture hugs the reading-end side (right in English, left
// in Pashto/Dari), so any leftover gap from a narrower picture falls on
// the reading-start side, hidden behind the strong end of the fade —
// the open side always shows the sharp picture edge to edge. A middle
// layer bridges the edge where the sharp picture meets the blurred
// fill: the same picture, same position, slightly enlarged and blurred,
// so the sharp edge melts into the soft fill with no visible line. There
// is deliberately no hover zoom on the picture, because zooming would
// crop its edges; the card itself still lifts on hover.
const PictureCard = ({ item }) => {
  const { t, i18n } = useTranslation("home");
  const Icon = item.icon;
  const isRtl = i18n.dir() === "rtl";
  return (
    <article className="card-light overflow-hidden rounded-premium-lg shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative h-28 overflow-hidden bg-[#60A5FA] sm:h-32">
        <img
          src={item.image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full scale-125 object-cover ${item.positionClass} blur-md`}
        />
        <img
          src={item.image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full scale-[1.08] object-contain ${isRtl ? "object-left origin-left" : "object-right origin-right"} blur-lg`}
        />
        <img
          src={item.image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-contain ${isRtl ? "object-left" : "object-right"}`}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: BANNER_FADE(isRtl) }}
          aria-hidden="true"
        />
        {/* Smaller badge + title, centred vertically on the
            reading-start side (left in English, right in Pashto/Dari),
            sitting on the strong end of the fade. */}
        <div className="relative z-10 flex h-full items-center gap-3 px-4 sm:px-5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1E40AF]">
            <Icon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          </span>
          <h4 className="font-display text-base font-bold leading-snug text-white [text-shadow:0_1px_3px_rgba(15,23,42,0.6)]">
            {t(`why.items.${item.key}.title`)}
          </h4>
        </div>
      </div>
    </article>
  );
};

export const AboutSafarSection = () => {
  const { t } = useTranslation("home");

  return (
    <section className="bg-graphite-900 py-16 sm:py-24">
      {/* Same left and right space as the Promoted Vehicles section:
          container-listing (1680px), not the narrower container-page. */}
      <div className="container-listing relative z-10">
        {/* Cards column wider than the text column, so the cards and
            their pictures get more room on desktop. */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.25fr] lg:items-center lg:gap-12">
          {/* What Safar is, in plain words, on the reading-start side. */}
          <div className="text-start">
            <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-bone sm:text-3xl lg:text-4xl">
              {t("whatIs.title")}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-bone sm:text-lg">
              {renderHighlighted(t("whatIs.p1"))}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ash sm:text-base">
              {renderHighlighted(t("whatIs.p2"))}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ash sm:text-base">
              {renderHighlighted(t("whatIs.p3"))}
            </p>
          </div>

          {/* What Safar provides: four picture cards. */}
          <div>
            <h3 className="font-display text-lg font-bold leading-tight text-bone">
              {t("why.title")}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-ash sm:text-sm">
              {t("why.subtitle")}
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {WHY_CHOOSE.map((item) => (
                <PictureCard key={item.key} item={item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
