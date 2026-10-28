
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useFavorites } from "../../store/favorites/FavoritesContext.jsx";
import { useEscapeKey } from "../../shared/hooks/useEscapeKey.js";
import {
  SearchIcon,
  MenuIcon,
  CloseIcon,
  HeartIcon,
  HomeIcon,
  CarSilhouetteIcon,
  GlobeIcon,
  PlaneIcon,
  ShipIcon,
  ChevronDownIcon,
} from "../../shared/components/icons.jsx";
import {
  LOCATION_ON_THE_WAY,
  dubaiCarsPath,
  onTheWayPath,
} from "../../shared/constants/locations.js";
import { LanguageSwitcher } from "../../shared/components/LanguageSwitcher.jsx";
import logo from "../../assets/salarmotors.svg";

const FAVORITES_PATH = "/favorites";

const NAV_LINKS = [
  { to: "/", labelKey: "nav.home", end: true, icon: HomeIcon },
  { to: "/listings", labelKey: "nav.allCars", icon: CarSilhouetteIcon },
  { to: dubaiCarsPath(), labelKey: "nav.dubaiCars", icon: GlobeIcon },
];

const ON_THE_WAY_LINKS = [
  {
    to: onTheWayPath(LOCATION_ON_THE_WAY.AMERICA_TO_HERAT),
    labelKey: "nav.fromAmericaToHerat",
    icon: PlaneIcon,
  },
  {
    to: onTheWayPath(LOCATION_ON_THE_WAY.DUBAI_TO_HERAT),
    labelKey: "nav.fromDubaiToHerat",
    icon: ShipIcon,
  },
];

const navLinkClass = ({ isActive }) =>
  clsx(
    "relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm lg:text-[13px] font-medium transition-colors py-1",
    isActive
      ? "text-brass-dark after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-brass"
      : "text-ash hover:text-bone",
  );

const mobileNavLinkClass = ({ isActive }) =>
  clsx(
    "flex items-center justify-start gap-2.5 rounded-xl px-4 py-3 text-[15px] font-medium tracking-tight transition-all duration-200",
    isActive
      ? "bg-brass/10 text-brass-dark"
      : "text-bone hover:bg-graphite-100 active:scale-[0.98]",
  );

const splitPath = (to) => {
  const [pathname, search = ""] = to.split("?");
  return { pathname, params: new URLSearchParams(search) };
};

const isCategoryActive = (location, to) => {
  const { pathname, params } = splitPath(to);

  if (location.pathname !== pathname) return false;

  const currentParams = new URLSearchParams(location.search);

  if ([...params.keys()].length === 0) {
    return !currentParams.get("province");
  }

  return [...params.entries()].every(
    ([key, value]) => currentParams.get(key) === value,
  );
};

const CategoryNavLink = ({ to, label, icon: Icon, className, onClick }) => {
  const location = useLocation();
  const isActive = isCategoryActive(location, to);

  return (
    <Link to={to} className={className({ isActive })} onClick={onClick}>
      {Icon && (
        <Icon
          className="h-4 w-4 shrink-0 lg:h-[15px] lg:w-[15px]"
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </Link>
  );
};

const FavoritesBadge = ({ count, className }) => {
  if (!count) return null;

  return (
    <span
      className={clsx(
        "flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brass px-1 text-[10px] font-semibold leading-none text-graphite-950",
        className,
      )}
      aria-hidden="true"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
};

const FavoritesIconLink = ({ count }) => {
  const { t } = useTranslation("layout");

  return (
    <NavLink
      to={FAVORITES_PATH}
      aria-label={
        count ? t("nav.favoritesCount", { count }) : t("nav.favorites")
      }
      title={t("nav.favorites")}
      className={({ isActive }) =>
        clsx(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-graphite-100 sm:h-10 sm:w-10 lg:h-9 lg:w-9",
          isActive ? "text-brass-dark" : "text-bone",
        )
      }
    >
      <HeartIcon
        className="h-5 w-5 lg:h-[18px] lg:w-[18px]"
        aria-hidden="true"
      />
      <FavoritesBadge count={count} className="absolute -end-0.5 -top-0.5" />
    </NavLink>
  );
};

const OnTheWayDropdown = () => {
  const { t } = useTranslation("layout");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const location = useLocation();

  const isActive = ON_THE_WAY_LINKS.some((link) =>
    isCategoryActive(location, link.to),
  );

  useEscapeKey(() => setOpen(false), open);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={navLinkClass({ isActive })}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <ShipIcon
          className="h-4 w-4 shrink-0 lg:h-[15px] lg:w-[15px]"
          aria-hidden="true"
        />
        <span>{t("nav.onTheWay")}</span>
        <ChevronDownIcon
          className={clsx(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        className={clsx(
          "absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-2xl glass-panel-strong p-2 shadow-2xl transition-all duration-200 origin-top before:absolute before:inset-x-0 before:-top-2 before:h-2 before:content-['']",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0",
        )}
        role="menu"
      >
        {ON_THE_WAY_LINKS.map((link) => (
          <CategoryNavLink
            key={link.to}
            to={link.to}
            label={t(link.labelKey)}
            icon={link.icon}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brass/12 text-brass-dark"
                  : "text-bone hover:bg-graphite-100",
              )
            }
          />
        ))}
      </div>
    </div>
  );
};

const MobileOnTheWaySection = ({ onNavigate }) => {
  const { t } = useTranslation("layout");
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();

  const isActive = ON_THE_WAY_LINKS.some((link) =>
    isCategoryActive(location, link.to),
  );

  return (
    <div>
      <button
        type="button"
        className={clsx(mobileNavLinkClass({ isActive }), "w-full")}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="flex items-center gap-2.5">
          <ShipIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("nav.onTheWay")}
        </span>

        <ChevronDownIcon
          className={clsx(
            "ms-auto h-4 w-4 shrink-0 text-ash transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>

      <div
        className={clsx(
          "overflow-hidden transition-all duration-200",
          expanded ? "mt-1 max-h-40" : "max-h-0",
        )}
      >
        <div className="flex flex-col gap-1 ps-4">
          {ON_THE_WAY_LINKS.map((link) => (
            <CategoryNavLink
              key={link.to}
              to={link.to}
              label={t(link.labelKey)}
              icon={link.icon}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brass/10 text-brass-dark"
                    : "text-ash hover:bg-graphite-100 hover:text-bone",
                )
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const Navbar = () => {
  const { t } = useTranslation("layout");
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const { favoriteIds } = useFavorites();
  const favoritesCount = favoriteIds?.size ?? 0;

  useEscapeKey(() => setOpen(false), open);
  useEscapeKey(() => setSearchOpen(false), searchOpen);

  useEffect(() => {
    if (!open && !searchOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, searchOpen]);

  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [searchOpen]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const trimmed = keyword.trim();

    if (!trimmed) return;

    navigate(`/search?keyword=${encodeURIComponent(trimmed)}`);
    setSearchOpen(false);
    setOpen(false);
    setKeyword("");
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Compact Floating Navbar */}
      <div className="mx-auto max-w-7xl px-1 pt-1 sm:px-5 sm:pt-2.5 lg:px-8 lg:pt-2">
        <div className="glass-nav rounded-2xl lg:rounded-full lg:border lg:border-white/10 lg:shadow-lg">
          <div className="flex h-[62px] items-center justify-between gap-2 px-3 sm:h-[66px] sm:gap-3 sm:px-4 lg:h-[60px] lg:gap-3 lg:px-5">
            {/* Logo */}
            <NavLink
              to="/"
              className="flex shrink-0 items-center"
              onClick={() => setOpen(false)}
            >
              <img
                src={logo}
                alt={t("nav.logoAlt")}
                className="h-8 w-auto object-contain sm:h-9 lg:h-9"
              />
            </NavLink>

            {/* Desktop Navigation */}
            <nav className="hidden items-center justify-center gap-5 lg:flex xl:gap-6">
              {NAV_LINKS.map((link) =>
                link.to === "/" ? (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={navLinkClass}
                  >
                    <link.icon
                      className="h-4 w-4 shrink-0 lg:h-[15px] lg:w-[15px]"
                      aria-hidden="true"
                    />
                    <span>{t(link.labelKey)}</span>
                  </NavLink>
                ) : (
                  <CategoryNavLink
                    key={link.to}
                    to={link.to}
                    label={t(link.labelKey)}
                    icon={link.icon}
                    className={navLinkClass}
                  />
                ),
              )}

              <OnTheWayDropdown />
            </nav>

            {/* Search, Language, Favorites, and Mobile Menu */}
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <LanguageSwitcher />

              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-bone transition-colors hover:bg-graphite-100 sm:h-10 sm:w-10 lg:h-9 lg:w-9"
                aria-label={t("nav.searchVehicles")}
                onClick={() => setSearchOpen(true)}
              >
                <SearchIcon className="h-[18px] w-[18px] lg:h-[18px] lg:w-[18px]" />
              </button>

              <FavoritesIconLink count={favoritesCount} />

              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-bone transition-colors hover:bg-graphite-100 sm:h-10 sm:w-10 lg:hidden"
                aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
              >
                {open ? (
                  <CloseIcon className="h-5 w-5" />
                ) : (
                  <MenuIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-graphite/45 transition-opacity duration-200 lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Slide-out Navigation */}
      <nav
        className={clsx(
          "fixed inset-y-0 end-0 z-50 flex h-dvh w-[min(82%,320px)] flex-col overflow-hidden glass-panel-strong transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          open
            ? "translate-x-0 shadow-2xl"
            : "ltr:translate-x-full rtl:-translate-x-full",
        )}
        aria-label={t("nav.mobileNavigation")}
        aria-hidden={!open}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-card px-3 py-3 sm:px-4">
          <NavLink
            to="/"
            className="flex shrink-0 items-center"
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
          >
            <img
              src={logo}
              alt={t("nav.logoAlt")}
              className="h-8 w-auto object-contain"
            />
          </NavLink>

          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-bone transition-colors hover:bg-graphite-100"
            aria-label={t("nav.closeMenu")}
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Drawer Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
          <div className="mt-1 flex flex-col gap-2">
            {NAV_LINKS.map((link) =>
              link.to === "/" ? (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={mobileNavLinkClass}
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                >
                  <span className="flex items-center gap-2.5">
                    <link.icon
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    {t(link.labelKey)}
                  </span>

                  <span
                    className="ms-auto inline-block text-ash rtl:-scale-x-100"
                    aria-hidden="true"
                  >
                    ↗
                  </span>
                </NavLink>
              ) : (
                <CategoryNavLink
                  key={link.to}
                  to={link.to}
                  label={t(link.labelKey)}
                  icon={link.icon}
                  onClick={() => setOpen(false)}
                  className={mobileNavLinkClass}
                />
              ),
            )}

            <MobileOnTheWaySection
              onNavigate={() => setOpen(false)}
            />
          </div>


        </div>
      </nav>

      {/* Search Modal Overlay */}
      <div
        className={clsx(
          "fixed inset-0 z-[60] flex items-center justify-center bg-graphite/55 px-3 backdrop-blur-sm transition-opacity duration-200 sm:px-4",
          searchOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={() => setSearchOpen(false)}
        aria-hidden={!searchOpen}
      >
        <div
          className={clsx(
            "w-full max-w-md rounded-3xl glass-panel-strong p-3 shadow-2xl transition-transform duration-200 sm:p-4",
            searchOpen
              ? "translate-y-0 scale-100"
              : "translate-y-4 scale-[0.98]",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-ash">
              {t("nav.search")}
            </span>

            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-bone transition-colors hover:bg-graphite-100"
              aria-label={t("nav.closeSearch")}
              onClick={() => setSearchOpen(false)}
            >
              <CloseIcon className="h-[18px] w-[18px]" />
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3">
            <label htmlFor="global-search-input" className="sr-only">
              {t("nav.searchCars")}
            </label>

            <input
              id="global-search-input"
              ref={searchInputRef}
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t("nav.searchPlaceholder")}
              className="h-12 w-full rounded-2xl border border-card bg-white/80 px-4 text-sm text-bone outline-none transition focus:border-brass focus:ring-2 focus:ring-brass/20"
            />

            <button
              type="submit"
              className="h-12 w-full rounded-2xl bg-brass text-sm font-semibold text-graphite-950 transition hover:bg-brass-light"
            >
              {t("nav.search")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
};
