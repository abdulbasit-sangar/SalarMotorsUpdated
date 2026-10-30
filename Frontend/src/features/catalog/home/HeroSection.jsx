import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { HeroSearchBar } from "./HeroSearchBar.jsx";

export const HeroSection = () => {
  const { t } = useTranslation("home");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className="relative isolate flex min-h-[760px] min-h-screen flex-col justify-between overflow-hidden bg-graphite-950">
      {/* Background Image */}
      <div
        className="absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <picture className="absolute inset-0 flex h-full w-full items-center justify-center">
          <source media="(max-width: 767px)" srcSet="/Images/Pic2-Mobile.jpg" />
          <source
            media="(max-width: 1023px)"
            srcSet="/Images/Pic2-Tablet.jpg"
          />
          <img
            src="/Images/Pic2.jpg"
            alt=""
            fetchPriority="high"
            className="h-full w-full object-cover object-center"
          />
        </picture>

        {/* Light overall shading keeps the background image visible. */}
        <div className="absolute inset-0 bg-black/10" />

        {/* Gentle side shading preserves contrast without hiding the car. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/10" />

        {/* Subtle top shading helps the hero content stand out. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-transparent" />
      </div>

      {/* Hero Content */}
      <div className="container-page relative z-10 flex min-h-screen flex-col justify-between px-4 pb-6 pt-28 sm:px-6 sm:pb-8 sm:pt-32 lg:px-8 lg:pb-10 lg:pt-36">
        {/* Headline */}

<div
  style={{ transitionDelay: mounted ? "120ms" : "0ms" }}
  className={[
    "mx-auto w-full max-w-4xl text-center",
    "rounded-2xl px-4 py-5 sm:px-6 sm:py-6",
    "[background:radial-gradient(ellipse_at_center,rgba(0,0,0,0.38)_0%,rgba(0,0,0,0.20)_48%,rgba(0,0,0,0.06)_68%,transparent_78%)]",
    "transition-[opacity,transform] duration-700 ease-out",
    mounted ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
  ].join(" ")}
>


  <h1 className="font-serif text-2xl font-medium uppercase leading-[1.15] tracking-[0.01em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] sm:text-3xl md:text-4xl lg:text-5xl">
    {t("hero.titleA")}
    <span className="mt-1 block text-[#E5C18B]">
      {t("hero.titleB")}
    </span>
  </h1>

  <p className="mx-auto mt-3 max-w-xl text-[11px] font-normal leading-5 text-white/90 drop-shadow-[0_1px_5px_rgba(0,0,0,0.75)] sm:mt-4 sm:text-xs md:text-sm">
    {t("hero.subtitle")}
  </p>

  {/* Decorative accent */}
  <div className="mx-auto mt-5 flex items-center justify-center gap-2.5 sm:mt-6">
    <span className="h-px w-7 bg-gradient-to-r from-transparent to-[#D9AD68]/80 sm:w-10" />
    <span className="h-1 w-1 rotate-45 bg-[#D9AD68]" />
    <span className="h-px w-7 bg-gradient-to-l from-transparent to-[#D9AD68]/80 sm:w-10" />
  </div>
</div>


        {/* Search */}
        <div
          style={{ transitionDelay: mounted ? "260ms" : "0ms" }}
          className={[
            "w-full",
            "transition-[opacity,transform] duration-700 ease-out",
            mounted ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
          ].join(" ")}
        >
          <HeroSearchBar />
        </div>
      </div>
    </section>
  );
};
