import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HeroSection } from "./HeroSection.jsx";
import {
  ShieldIcon,
  ClipboardCheckIcon,
  ShippingIcon,
  HeadsetIcon,
} from "../../../shared/components/icons.jsx";
import { CarSection } from "../../../shared/components/CarSection.jsx";
import { useAsyncData } from "../../../shared/hooks/useAsyncData.js";
import {
  fetchFeaturedCars,
  fetchCars,
} from "../../../services/cars/carsApi.js";
import { dubaiCarsPath } from "../../../shared/constants/locations.js";

const CATEGORIES = [
  {
    title: "Japanese Cars",
    description: "Toyota, Honda, Nissan & more",
    to: "/filter?brand=Toyota",
    emoji: "🇯🇵",
    accent: "from-rose-500/20 via-red-500/10 to-transparent",
    borderHover: "hover:border-rose-500/40",
    textHover: "group-hover:text-rose-400",
  },
  {
    title: "American Cars",
    description: "Ford, Chevy, Jeep & more",
    to: "/filter?brand=Ford",
    emoji: "🇺🇸",
    accent: "from-blue-500/20 via-indigo-500/10 to-transparent",
    borderHover: "hover:border-blue-500/40",
    textHover: "group-hover:text-blue-400",
  },
  {
    title: "Dubai Imports",
    description: "Premium UAE-sourced vehicles",
    to: dubaiCarsPath(),
    emoji: "🇦🇪",
    accent: "from-amber-500/20 via-yellow-500/10 to-transparent",
    borderHover: "hover:border-amber-500/40",
    textHover: "group-hover:text-amber-400",
  },
  {
    title: "Luxury Cars",
    description: "High-end premium vehicles",
    to: "/filter?minPrice=25000",
    emoji: "✨",
    accent: "from-purple-500/20 via-fuchsia-500/10 to-transparent",
    borderHover: "hover:border-purple-500/40",
    textHover: "group-hover:text-purple-400",
  },
  {
    title: "SUVs",
    description: "Spacious family & adventure",
    to: "/filter?bodyType=SUV",
    emoji: "🚙",
    accent: "from-emerald-500/20 via-teal-500/10 to-transparent",
    borderHover: "hover:border-emerald-500/40",
    textHover: "group-hover:text-emerald-400",
  },
  {
    title: "Sedans",
    description: "Comfort, style & efficiency",
    to: "/filter?bodyType=Sedan",
    emoji: "🚗",
    accent: "from-cyan-500/20 via-sky-500/10 to-transparent",
    borderHover: "hover:border-cyan-500/40",
    textHover: "group-hover:text-cyan-400",
  },
];

const WHY_CHOOSE = [
  {
    title: "Verified Vehicles",
    description:
      "Every listing is screened and verified so you can browse with complete confidence.",
    icon: ShieldIcon,
    bgGradient: "from-emerald-500/10 to-teal-500/5",
    iconColor: "text-emerald-400",
    glowColor: "group-hover:bg-emerald-500/20",
  },
  {
    title: "Quality Inspection",
    description:
      "Detailed condition reports and transparent specs help you make informed decisions.",
    icon: ClipboardCheckIcon,
    bgGradient: "from-cyan-500/10 to-blue-500/5",
    iconColor: "text-cyan-400",
    glowColor: "group-hover:bg-cyan-500/20",
  },
  {
    title: "Trusted Import Process",
    description:
      "From sourcing to delivery, our import process is built on reliability and trust.",
    icon: ShippingIcon,
    bgGradient: "from-amber-500/10 to-orange-500/5",
    iconColor: "text-amber-400",
    glowColor: "group-hover:bg-amber-500/20",
  },
  {
    title: "Customer Support",
    description:
      "Our dedicated team guides you through every step of your car buying journey.",
    icon: HeadsetIcon,
    bgGradient: "from-purple-500/10 to-pink-500/5",
    iconColor: "text-purple-400",
    glowColor: "group-hover:bg-purple-500/20",
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Browse",
    description:
      "Explore our curated catalog and filter by brand, price, year, and steering type.",
  },
  {
    step: 2,
    title: "Contact",
    description:
      "Reach out to our team or the seller directly to ask questions and confirm details.",
  },
  {
    step: 3,
    title: "Inspect",
    description:
      "Arrange a viewing or inspection to verify the vehicle meets your expectations.",
  },
  {
    step: 4,
    title: "Purchase",
    description:
      "Complete your purchase with confidence through our guided, transparent process.",
  },
];

const loadHomeData = async () => {
  const [featured, recent] = await Promise.all([
    fetchFeaturedCars(8),
    fetchCars({ page: 1, limit: 8, sort: "newest" }),
  ]);

  return {
    featuredCars: featured.cars,
    recentCars: recent.cars,
    stats: {
      total: recent.pagination.totalCars,
      featured: featured.cars.length,
    },
  };
};

// Lightweight scroll-reveal hook — observes an element and flips `visible`
// to true the first time it enters the viewport, then disconnects.
const useReveal = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold, rootMargin: "0px 0px -60px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
};

const CategoryCard = ({ category, visible, delay }) => (
  <Link
    to={category.to}
    style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    className={
      "group relative overflow-hidden card-light rounded-premium-lg p-6 sm:p-8 hover-lift shadow-card " +
      `border border-white/5 bg-gradient-to-br ${category.accent} ${category.borderHover} ` +
      "transition-all duration-700 ease-out will-change-transform " +
      "hover:-translate-y-1.5 hover:shadow-card-hover active:scale-[0.98] " +
      (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")
    }
  >
    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
    <span
      className="text-3xl mb-4 block transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3"
      aria-hidden="true"
    >
      {category.emoji}
    </span>
    <h3
      className={`font-display text-xl font-bold text-card ${category.textHover} transition-colors duration-300`}
    >
      {category.title}
    </h3>
    <p className="text-card-muted text-sm mt-2 leading-relaxed">
      {category.description}
    </p>
  </Link>
);

const IconCard = ({ item, visible, delay }) => {
  const Icon = item.icon;
  return (
    <div
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={
        "group relative overflow-hidden card-light rounded-premium-lg p-6 sm:p-8 hover-lift shadow-card text-center " +
        `border border-white/5 bg-gradient-to-b ${item.bgGradient} ` +
        "transition-all duration-700 ease-out will-change-transform hover:-translate-y-1.5 " +
        (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")
      }
    >
      <div
        className={`w-14 h-14 mx-auto flex items-center justify-center rounded-2xl bg-white/5 ${item.iconColor} mb-5 transition-all duration-300 ease-out ${item.glowColor} group-hover:scale-110 group-hover:rotate-6 shadow-lg shadow-black/20`}
      >
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-bold text-card">{item.title}</h3>
      <p className="text-card-muted text-sm mt-3 leading-relaxed">
        {item.description}
      </p>
    </div>
  );
};

const StepCard = ({ step, title, description, isLast, visible, delay }) => (
  <div
    style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    className={
      "relative flex flex-col items-center text-center transition-all duration-700 ease-out " +
      (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")
    }
  >
    <div
      style={{ transitionDelay: visible ? `${delay + 150}ms` : "0ms" }}
      className={
        "w-12 h-12 flex items-center justify-center rounded-full bg-brass text-graphite-950 font-display font-bold text-lg mb-4 " +
        "transition-all duration-500 ease-out hover:scale-110 " +
        (visible ? "scale-100" : "scale-50")
      }
    >
      {step}
    </div>
    <h3 className="font-display text-lg font-bold text-bone">{title}</h3>
    <p className="text-ash text-sm mt-2 leading-relaxed max-w-[200px]">
      {description}
    </p>
    {!isLast && (
      <div
        className="hidden lg:block absolute top-6 left-[calc(50%+2rem)] h-px bg-steel overflow-hidden"
        style={{ width: "calc(100% - 4rem)" }}
        aria-hidden="true"
      >
        <div
          style={{ transitionDelay: visible ? `${delay + 250}ms` : "0ms" }}
          className={
            "h-full bg-brass/60 transition-all duration-700 ease-out " +
            (visible ? "w-full" : "w-0")
          }
        />
      </div>
    )}
  </div>
);

export default function HomePage() {
  const { data, loading } = useAsyncData(loadHomeData, []);

  const [whyRef, whyVisible] = useReveal();
  const [howRef, howVisible] = useReveal();
  const [aboutRef, aboutVisible] = useReveal();

  return (
    <div>
      <HeroSection heroCar={data?.featuredCars?.[0]} />

      {/* Why Choose Salar Motors */}
      {/* pt trimmed to pt-10/14 (was py-16/24, i.e. the same value on both
          top and bottom): the hero above already ends with its own small
          bottom padding plus a negative-margin overlap into its image, so
          reusing the full py-16/24 for THIS section's top as well stacked
          two paddings together and showed as extra empty space beneath
          the hero on mobile. Bottom padding is unchanged. */}
      <section
        ref={whyRef}
        className="bg-section-light pt-10 pb-16 sm:pt-14 sm:pb-24 relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="container-page relative z-10">
          <div
            className={
              "text-center max-w-2xl mx-auto mb-12 sm:mb-16 transition-all duration-700 ease-out " +
              (whyVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6")
            }
          >
            <p className="section-eyebrow text-emerald-400 font-semibold tracking-wider uppercase">
              Why Salar Motors
            </p>
            <h2 className="section-title text-section-light">
              Why Choose Salar Motors
            </h2>
            <p className="section-subtitle text-section-light-muted mx-auto">
              We combine verified inventory, transparent pricing, and dedicated
              support to make importing your next car effortless.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {WHY_CHOOSE.map((item, index) => (
              <IconCard
                key={item.title}
                item={item}
                visible={whyVisible}
                delay={index * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section ref={howRef} className="bg-graphite-950 py-16 sm:py-24">
        <div className="container-page">
          <div
            className={
              "text-center max-w-2xl mx-auto mb-12 sm:mb-16 transition-all duration-700 ease-out " +
              (howVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6")
            }
          >
            <p className="section-eyebrow">Simple Process</p>
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle mx-auto">
              Four straightforward steps from browsing to ownership — no
              complexity, no surprises.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            {HOW_IT_WORKS.map((item, index) => (
              <StepCard
                key={item.title}
                step={item.step}
                title={item.title}
                description={item.description}
                isLast={index === HOW_IT_WORKS.length - 1}
                visible={howVisible}
                delay={index * 120}
              />
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        ref={aboutRef}
        className="bg-section-light py-16 sm:py-24 relative overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-rose-500/5 via-purple-500/5 to-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="container-page relative z-10">
          <div className="max-w-3xl mx-auto">
            <p
              className={
                "section-eyebrow text-purple-400 font-semibold tracking-wider uppercase text-center transition-all duration-700 ease-out " +
                (aboutVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6")
              }
            >
              About Us
            </p>
            <h2
              style={{ transitionDelay: aboutVisible ? "80ms" : "0ms" }}
              className={
                "section-title text-section-light text-center transition-all duration-700 ease-out " +
                (aboutVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6")
              }
            >
              Your Trusted Automotive Marketplace
            </h2>

            <div
              style={{ transitionDelay: aboutVisible ? "180ms" : "0ms" }}
              className={
                "card-light rounded-premium-lg shadow-card p-8 sm:p-12 mt-10 sm:mt-12 space-y-6 border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent " +
                "transition-all duration-700 ease-out " +
                (aboutVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8")
              }
            >
              <p className="text-card text-base sm:text-lg leading-relaxed">
                Salar Motors is a premium vehicle marketplace specializing in
                imported cars. We connect buyers with verified, quality vehicles
                sourced from Japan, America, Dubai, and beyond.
              </p>
              <p className="text-card-muted text-sm sm:text-base leading-relaxed">
                Our platform is designed with transparency at its core. Every
                listing includes detailed specifications, clear pricing, and
                location information so you can compare options and make
                confident decisions without leaving the catalog.
              </p>
              <p className="text-card-muted text-sm sm:text-base leading-relaxed">
                Whether you are looking for a reliable daily driver, a luxury
                import, or a family SUV, Salar Motors provides the tools and
                support to help you find exactly what you need.
              </p>

              <div className="pt-4 flex flex-wrap gap-4">
                <Link
                  to="/listings"
                  className="h-11 px-6 flex items-center bg-amber-500 text-white font-semibold text-sm rounded-xl transition-all duration-300 ease-out hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(245,158,11,0.3)] active:translate-y-0 active:scale-[0.98]"
                >
                  View All Listings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
