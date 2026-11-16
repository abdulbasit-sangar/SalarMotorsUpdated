import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../../../shared/components/icons.jsx";
import { getTheme, THEME_EVENT, THEMES } from "../../../shared/theme/theme.js";

const HERO_IMAGE = "/Images/Slide1.jpg";
const SLIDE_COUNT = 3;
const AUTOPLAY_MS = 6000;

const SLIDES = [
  {
    photo: "hero",
    variant: "dark",
    eyebrowKey: "hero.eyebrow",
    titleAKey: "hero.titleA",
    titleBKey: "hero.titleB",
    subtitleKey: "hero.subtitle",
  },
  {
    photo: "/Images/Slide2.jpg",
    variant: "light",
    eyebrowKey: "slider.slides.s2.eyebrow",
    titleKey: "slider.slides.s2.title",
    subtitleKey: "slider.slides.s2.subtitle",
    // Phones only: cover crops the sky/sand, not the car. Desktop keeps
    // object-center (see the md: override on the <img> below).
    positionClass: "object-[50%_58%] md:object-center",
  },
  {
    photo: "/Images/Slide3.jpg",
    variant: "dark",
    eyebrowKey: "slider.slides.s3.eyebrow",
    titleKey: "slider.slides.s3.title",
    subtitleKey: "slider.slides.s3.subtitle",
    positionClass: "object-center",
  },
];

const VARIANTS = {
  dark: {
    band: (isRtl) =>
      `linear-gradient(to ${isRtl ? "left" : "right"}, #080F1E 0%, #142747 55%, #1E40AF 100%)`,
    shape1: "bg-[#FFFFFF]/[0.07]",
    shape2: "bg-[#93C5FD]/35",
    ribbon: "bg-[#60A5FA]/20",
    heading: "text-white",
    accent: "text-[#93C5FD]",
    subtitle: "text-white/85",
    cta: "bg-graphite-950 text-brand-dark hover:bg-brand-pale",
    dotActive: "bg-white",
    dotIdle: "bg-white/40 hover:bg-white/70",
  },
  light: {
    band: (isRtl) =>
      `linear-gradient(to ${isRtl ? "left" : "right"}, #F8FAFC 0%, #EFF6FF 55%, #DBEAFE 100%)`,
    shape1: "bg-[#1E3A8A]/[0.07]",
    shape2: "bg-[#1E40AF]/35",
    ribbon: "bg-[#3B82F6]/20",
    heading: "text-brand-navy",
    accent: "text-brand-dark",
    subtitle: "text-ash",
    cta: "bg-brass text-graphite-950 hover:bg-brass-dark",
    dotActive: "bg-brand",
    dotIdle: "bg-brand/30 hover:bg-brand/60",
  },
};

// Site dark mode: the light slide's near-white band would glare against the
// dark site, so in dark mode it uses this deep-blue version instead — same
// design, dark background, light text. Dark slides keep their own band and
// text; only their button changes (see DARK_SITE_CTA). In light mode every
// slide renders exactly as before.
// In site dark mode every slide's button is this bright blue with white text,
// so it stays clearly readable on the dark bands.
const DARK_SITE_CTA = "bg-[#2563EB] text-white hover:bg-[#1D4ED8]";

const DARK_SITE_LIGHT = {
  band: (isRtl) =>
    `linear-gradient(to ${isRtl ? "left" : "right"}, #0B1220 0%, #152A4E 55%, #1E40AF 100%)`,
  shape1: "bg-[#FFFFFF]/[0.07]",
  shape2: "bg-[#93C5FD]/35",
  ribbon: "bg-[#60A5FA]/20",
  heading: "text-white",
  accent: "text-[#93C5FD]",
  subtitle: "text-white/85",
  cta: DARK_SITE_CTA,
  dotActive: "bg-white",
  dotIdle: "bg-white/40 hover:bg-white/70",
};

const resolveVariant = (slideVariant, isDarkSite) => {
  if (!isDarkSite) return VARIANTS[slideVariant];
  if (slideVariant === "light") return DARK_SITE_LIGHT;
  // Dark slides in dark mode: same band and text, but the bright blue button
  // — their usual button (bg-graphite-950) turns near-black on the dark band.
  return { ...VARIANTS[slideVariant], cta: DARK_SITE_CTA };
};

// Bare arrows sit over photos too, so each glyph carries its own separation:
// a white halo (separates a dark arrow from a dark photo) plus a dark shadow
// (separates a white arrow from a bright photo). Same drop-shadow technique
// as the slide 1 picture below.
const ARROW_SHADOW =
  "drop-shadow(0 0 3px rgba(255, 255, 255, 0.85)) drop-shadow(0 2px 5px rgba(2, 6, 23, 0.55))";

// Slant only on tablet/desktop (md+): on phones the photo panel is unclipped.
// Same 18% slant as before on md+.
const photoClipClass = (isRtl) =>
  isRtl
    ? "md:[clip-path:polygon(0_0,82%_0,100%_100%,0_100%)]"
    : "md:[clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]";

const shapeClip = (isRtl) =>
  isRtl
    ? "polygon(0 0, 82% 0, 100% 100%, 0 100%)"
    : "polygon(18% 0, 100% 0, 100% 100%, 0 100%)";

const stripeClip = (isRtl) =>
  isRtl
    ? "polygon(0 0, 55% 0, 100% 100%, 45% 100%)"
    : "polygon(45% 0, 100% 0, 55% 100%, 0 100%)";

const ribbonClip = (isRtl) =>
  isRtl
    ? "polygon(0 0, 55% 0, 100% 100%, 0 100%)"
    : "polygon(45% 0, 100% 0, 100% 100%, 0 100%)";

const slideImage = (slide) =>
  slide.photo === "hero" ? HERO_IMAGE : slide.photo;

export const HomeHeroSlider = () => {
  const { t, i18n } = useTranslation("home");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [theme, setThemeState] = useState(getTheme);
  const touchStartX = useRef(null);

  const isRtl = i18n.dir() === "rtl";
  const isDarkSite = theme === THEMES.DARK;
  const activeVariant = resolveVariant(SLIDES[active].variant, isDarkSite);
  // Bare arrows need a color that reads on the slide behind them: white on
  // dark backgrounds, navy on the light slide (light mode only — in dark
  // mode every background is dark, so the arrows stay white).
  const arrowsOnDark = SLIDES[active].variant === "dark" || isDarkSite;
  const arrowColorClass = arrowsOnDark ? "text-white" : "text-brand-navy";

  const goTo = (index) =>
    setActive(((index % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT);

  // Same pattern as ThemeToggle: re-read the site theme whenever the toggle
  // flips it, so the backgrounds follow the switch instantly.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncTheme = () => setThemeState(getTheme());
    syncTheme();
    window.addEventListener(THEME_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_EVENT, syncTheme);
  }, []);

  useEffect(() => {
    if (paused) return undefined;

    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }

    const id = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setActive((value) => (value + 1) % SLIDE_COUNT);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(id);
  }, [paused]);

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    const startX = touchStartX.current;
    touchStartX.current = null;

    if (startX === null) return;

    const endX = event.changedTouches[0]?.clientX;
    if (endX === undefined) return;

    const delta = endX - startX;
    if (Math.abs(delta) < 40) return;

    const step = delta < 0 ? 1 : -1;
    goTo(active + (isRtl ? -step : step));
  };

  return (
    <section
      className="relative isolate h-[78svh] max-h-[620px] min-h-[560px] overflow-hidden bg-white md:h-[56svh] md:max-h-[520px] md:min-h-[440px]"
      style={{ backgroundColor: isDarkSite ? "#080F1E" : "#FFFFFF" }}
      aria-label={t("hero.eyebrow")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none"
        style={{
          transform: `translateX(${isRtl ? active * 100 : -active * 100}%)`,
        }}
      >
        {SLIDES.map((slide, index) => {
          const isActive = index === active;
          const variant = resolveVariant(slide.variant, isDarkSite);
          const isDarkBackground = slide.variant === "dark" || isDarkSite;
          const isHeroSlide = slide.photo === "hero";

          return (
            <div
              key={slide.eyebrowKey}
              className="relative flex h-full w-full shrink-0 flex-col md:flex-row"
              aria-hidden={!isActive}
            >
              <div
                className="absolute inset-0"
                style={{ backgroundImage: variant.band(isRtl) }}
                aria-hidden="true"
              />

              {isDarkBackground && (
                <div
                  className="absolute inset-y-0 start-0 hidden w-[62%] md:block"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, rgba(255,255,255,0.16) 1.3px, transparent 1.5px)",
                    backgroundSize: "20px 20px",
                    WebkitMaskImage: `linear-gradient(to ${isRtl ? "left" : "right"}, black 55%, transparent 95%)`,
                    maskImage: `linear-gradient(to ${isRtl ? "left" : "right"}, black 55%, transparent 95%)`,
                  }}
                  aria-hidden="true"
                />
              )}

              {/* Soft layered diagonal background */}
              <div
                className={`absolute inset-y-0 end-0 hidden w-[52%] md:block ${variant.shape1} drop-shadow-2xl`}
                style={{
                  clipPath: shapeClip(isRtl),
                  boxShadow: "inset 0 0 50px rgba(15, 23, 42, 0.08)",
                }}
                aria-hidden="true"
              />

              {/* Translucent diagonal glass accent */}
              <div
                className={`absolute inset-y-0 end-[28%] hidden w-[16%] md:block ${variant.ribbon} shadow-[-8px_0_24px_rgba(15,23,42,0.12)]`}
                style={{
                  clipPath: ribbonClip(isRtl),
                  backdropFilter: "blur(2px)",
                }}
                aria-hidden="true"
              />

              {/* Slim diagonal highlight */}
              <div
                className={`absolute inset-y-0 end-[32%] hidden w-3 md:block ${variant.shape2} shadow-[0_0_14px_rgba(30,64,175,0.18)]`}
                style={{ clipPath: stripeClip(isRtl) }}
                aria-hidden="true"
              />

              {/* Fine secondary accent */}
              <div
                className="absolute inset-y-0 end-[42%] hidden w-[2px] bg-white/65 shadow-[0_0_12px_rgba(255,255,255,0.35)] md:block"
                style={{ clipPath: stripeClip(isRtl) }}
                aria-hidden="true"
              />

              {/* Text content */}
              <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center px-6 pb-6 pt-6 text-start sm:px-10 md:px-14 md:py-8 lg:px-16">
                <h1
                  className={`max-w-xl font-display text-2xl font-bold leading-[1.12] sm:text-3xl lg:text-4xl ${variant.heading}`}
                >
                  {slide.titleBKey ? (
                    <>
                      {t(slide.titleAKey)}
                      <span className={`mt-1 block ${variant.accent}`}>
                        {t(slide.titleBKey)}
                      </span>
                    </>
                  ) : (
                    t(slide.titleKey)
                  )}
                </h1>

                <p
                  className={`mt-4 max-w-lg text-xs leading-relaxed sm:text-sm ${variant.subtitle}`}
                >
                  {t(slide.subtitleKey)}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    to="/listings"
                    tabIndex={isActive ? undefined : -1}
                    className={`flex h-11 items-center rounded-xl px-6 text-[13px] font-semibold shadow-lg transition-colors sm:h-12 sm:px-7 ${variant.cta}`}
                  >
                    {t("slider.browseCta")}
                  </Link>
                </div>
              </div>

              {/* Photo panel — slide 1 only: whole picture, best fit, floating 3D shadow. Slides 2-3: the picture covers the whole panel on every device, so no dark-blue panel background shows at the edges; on phones the crop is biased per slide (see positionClass) so the subject stays in frame; on tablet/desktop they keep the slanted cover panel + vignette exactly as before. */}
              <div
                className={
                  isHeroSlide
                    ? "relative z-10 h-[220px] w-full shrink-0 overflow-hidden p-4 sm:h-[240px] md:h-full md:w-[48%] md:flex-none md:p-6"
                    : `relative z-10 h-[220px] w-full shrink-0 overflow-hidden bg-[#071128] shadow-[-18px_0_38px_rgba(15,23,42,0.35)] sm:h-[240px] md:h-full md:w-[48%] md:flex-none ${photoClipClass(isRtl)}`
                }
              >
                {/* Sophisticated atmospheric depth overlay matching reference image — slides 2-3 only; skipped on slide 1 so the whole 3D picture stays fully visible. */}
                {!isHeroSlide && (
                  <div
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                      background: `
                      linear-gradient(${isRtl ? "90deg" : "270deg"}, rgba(7, 19, 48, 0.82) 0%, rgba(10, 30, 75, 0.3) 38%, rgba(6, 15, 38, 0.1) 70%, rgba(5, 12, 32, 0.5) 100%),
                      radial-gradient(circle at 75% 40%, transparent 35%, rgba(3, 9, 24, 0.6) 100%)
                    `,
                    }}
                    aria-hidden="true"
                  />
                )}

                {isHeroSlide ? (
                  <img
                    src={HERO_IMAGE}
                    alt=""
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-contain"
                    style={{
                      filter:
                        "drop-shadow(0 24px 28px rgba(2, 6, 23, 0.45)) drop-shadow(0 6px 12px rgba(2, 6, 23, 0.25))",
                    }}
                  />
                ) : (
                  <img
                    src={slideImage(slide)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = HERO_IMAGE;
                    }}
                    className={`h-full w-full object-cover ${slide.positionClass} transition-transform duration-700 ease-out md:scale-[1.02]`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Previous / next arrows — bare glyphs only: no background, border, or blur. */}
      <button
        type="button"
        aria-label={t("slider.prev")}
        onClick={() => goTo(active - 1)}
        className="absolute start-3 top-1/2 z-25 hidden h-12 w-12 -translate-y-1/2 items-center justify-center bg-transparent transition-transform hover:scale-110 focus-visible:scale-110 active:scale-95 md:flex lg:start-4"
      >
        <ChevronLeftIcon
          className={`h-8 w-8 ${arrowColorClass} rtl:-scale-x-100`}
          strokeWidth={3}
          style={{ filter: ARROW_SHADOW }}
          aria-hidden="true"
        />
      </button>

      <button
        type="button"
        aria-label={t("slider.next")}
        onClick={() => goTo(active + 1)}
        className="absolute end-3 top-1/2 z-25 hidden h-12 w-12 -translate-y-1/2 items-center justify-center bg-transparent transition-transform hover:scale-110 focus-visible:scale-110 active:scale-95 md:flex lg:end-4"
      >
        <ChevronRightIcon
          className={`h-8 w-8 ${arrowColorClass} rtl:-scale-x-100`}
          strokeWidth={3}
          style={{ filter: ARROW_SHADOW }}
          aria-hidden="true"
        />
      </button>

      {/* Dots */}
      <div className="absolute inset-x-0 bottom-5 z-25 flex justify-center sm:bottom-6 md:justify-start md:px-14 lg:px-16">
        <div className="flex items-center gap-2">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.eyebrowKey}
              type="button"
              aria-label={t("slider.goToSlide", { number: index + 1 })}
              aria-current={index === active}
              onClick={() => goTo(index)}
              className={
                "h-2.5 rounded-full transition-all duration-300 " +
                (index === active
                  ? `w-8 ${activeVariant.dotActive}`
                  : `w-2.5 ${activeVariant.dotIdle}`)
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
};
