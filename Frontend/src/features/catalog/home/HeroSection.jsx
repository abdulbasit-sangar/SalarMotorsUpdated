import { useEffect, useState } from "react";
import { HeroSearchBar } from "./HeroSearchBar.jsx";

export const HeroSection = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden bg-graphite-950 flex flex-col justify-between">
      <div className="absolute inset-0 overflow-hidden">
        <picture className="absolute inset-0 block w-full h-full">
          <source media="(max-width: 767px)" srcSet="/Images/Pic2-Mobile.jpg" />
          <source
            media="(max-width: 1023px)"
            srcSet="/Images/Pic2-Tablet.jpg"
          />
          <img
            src="/Images/Pic2.jpg"
            alt=""
            className={
              "absolute inset-0 w-full h-full object-contain object-top sm:object-fill " +
              "transition-transform duration-[16000ms] ease-out will-change-transform " +
              (mounted ? "scale-100" : "scale-100")
            }
          />
        </picture>

        <div className="absolute z-10 inset-x-0 top-[18%] sm:top-[20%] md:top-[22%] lg:top-[24%]">
          <div className="container-page">
            <h1
              className={
                "font-display text-[25px] sm:text-5xl md:text-6xl lg:text-7xl " +
                "font-semibold leading-[1.05] tracking-tight text-black " +
                "max-w-[90%] sm:max-w-xl md:max-w-2xl " +
                "transition-all duration-700 ease-out " +
                (mounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6")
              }
            >
              <span
                className="text-black"
                style={{ fontFamily: '"Rockwell", serif' }}
              >
                S A F A R
              </span>
              <br />
              <span className="text-brass-dark">Find &amp; Buy.</span>
            </h1>
          </div>
        </div>

        <div
          className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-graphite-950/55 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      <div className="container-page relative z-10 min-h-screen flex flex-col justify-end pb-6 sm:pb-8 md:pb-10 lg:pb-12">
        <div
          style={{ transitionDelay: mounted ? "280ms" : "0ms" }}
          className={
            "mt-5 sm:mt-6 md:mt-8 w-full transition-all duration-700 ease-out " +
            (mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6")
          }
        >
          <HeroSearchBar />
        </div>
      </div>
    </section>
  );
};
