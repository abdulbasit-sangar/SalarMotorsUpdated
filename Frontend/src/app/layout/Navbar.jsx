import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
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
import logo from "../../assets/salarmotors.svg";

const FAVORITES_PATH = "/favorites";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true, icon: HomeIcon },
  { to: "/listings", label: "All Cars", icon: CarSilhouetteIcon },
  { to: dubaiCarsPath(), label: "Dubai Cars", icon: GlobeIcon },
];

const ON_THE_WAY_LINKS = [
  {
    to: onTheWayPath(LOCATION_ON_THE_WAY.AMERICA_TO_HERAT),
    label: "From America to Herat",
    icon: PlaneIcon,
  },
  {
    to: onTheWayPath(LOCATION_ON_THE_WAY.DUBAI_TO_HERAT),
    label: "From Dubai to Herat",
    icon: ShipIcon,
  },
];

const navLinkClass = ({ isActive }) =>
  clsx(
    "relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors py-1",
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
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
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

const FavoritesIconLink = ({ count }) => (
  <NavLink
    to={FAVORITES_PATH}
    aria-label={count ? `Favorites (${count})` : "Favorites"}
    title="Favorites"
    className={({ isActive }) =>
      clsx(
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-graphite-100",
        isActive ? "text-brass-dark" : "text-bone",
      )
    }
  >
    <HeartIcon className="h-5 w-5" aria-hidden="true" />
    <FavoritesBadge count={count} className="absolute -right-0.5 -top-0.5" />
  </NavLink>
);

const OnTheWayDropdown = () => {
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
        <ShipIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>On the Way</span>
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
            ? "pointer-events-auto opacity-100 scale-100 translate-y-0"
            : "pointer-events-none opacity-0 scale-95 -translate-y-1",
        )}
        role="menu"
      >
        {ON_THE_WAY_LINKS.map((link) => (
          <CategoryNavLink
            key={link.to}
            to={link.to}
            label={link.label}
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
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="flex items-center gap-2.5">
          <ShipIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          On the Way
        </span>
        <ChevronDownIcon
          className={clsx(
            "ml-auto h-4 w-4 shrink-0 text-ash transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>

      <div
        className={clsx(
          "overflow-hidden transition-all duration-200",
          expanded ? "max-h-40 mt-1" : "max-h-0",
        )}
      >
        <div className="flex flex-col gap-1 pl-4">
          {ON_THE_WAY_LINKS.map((link) => (
            <CategoryNavLink
              key={link.to}
              to={link.to}
              label={link.label}
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
    <header className="fixed top-0 left-0 z-50 w-full">
      {/* Desktop Floating Pill Navbar Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="glass-nav lg:rounded-full lg:shadow-lg lg:border lg:border-white/10">
          <div className="h-[76px] px-4 sm:px-6 flex items-center justify-between gap-4">
            {/* Logo */}
            <NavLink
              to="/"
              className="flex items-center shrink-0"
              onClick={() => setOpen(false)}
            >
              <img
                src={logo}
                alt="Salar Motors logo"
                className="h-9 md:h-10 w-auto object-contain"
              />
            </NavLink>

            {/* Desktop Navigation Links (Centered) */}
            <nav className="hidden lg:flex items-center justify-center gap-6 lg:gap-8">
              {NAV_LINKS.map((link) =>
                link.to === "/" ? (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={navLinkClass}
                  >
                    <link.icon
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{link.label}</span>
                  </NavLink>
                ) : (
                  <CategoryNavLink
                    key={link.to}
                    to={link.to}
                    label={link.label}
                    icon={link.icon}
                    className={navLinkClass}
                  />
                ),
              )}
              <OnTheWayDropdown />
            </nav>

            {/* Right Action Group: Search and Favorites Icons */}
            <div className="flex items-center gap-1">
              {/* Search Trigger Button */}
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-bone transition-colors hover:bg-graphite-100"
                aria-label="Search vehicles"
                onClick={() => setSearchOpen(true)}
              >
                <SearchIcon className="h-5 w-5" />
              </button>

              {/* Favorites Icon */}
              <FavoritesIconLink count={favoritesCount} />

              {/* Mobile Hamburger Menu Toggle */}
              <button
                type="button"
                className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-bone transition-colors hover:bg-graphite-100"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
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
          "fixed inset-0 z-40 bg-graphite/45 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />

      {/* Mobile Slide-out Nav */}
      <nav
        className={clsx(
          "fixed right-0 top-0 z-50 flex h-[100dvh] w-[84%] max-w-[360px] flex-col glass-panel-strong transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          open ? "translate-x-0 shadow-2xl" : "translate-x-full",
        )}
        aria-label="Mobile navigation"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-card px-4 py-4">
          <NavLink
            to="/"
            className="flex items-center shrink-0"
            onClick={() => setOpen(false)}
          >
            <img
              src={logo}
              alt="Salar Motors logo"
              className="h-8 w-auto object-contain"
            />
          </NavLink>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-bone transition-colors hover:bg-graphite-100"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mt-2 flex flex-col gap-2">
            {NAV_LINKS.map((link) =>
              link.to === "/" ? (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={mobileNavLinkClass}
                  onClick={() => setOpen(false)}
                >
                  <span className="flex items-center gap-2.5">
                    <link.icon
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    {link.label}
                  </span>
                  <span className="ml-auto text-ash">↗</span>
                </NavLink>
              ) : (
                <CategoryNavLink
                  key={link.to}
                  to={link.to}
                  label={link.label}
                  icon={link.icon}
                  onClick={() => setOpen(false)}
                  className={mobileNavLinkClass}
                />
              ),
            )}

            <MobileOnTheWaySection onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </nav>

      {/* Search Modal Overlay */}
      <div
        className={clsx(
          "fixed inset-0 z-[60] flex items-center justify-center bg-graphite/55 px-4 backdrop-blur-sm transition-all duration-300",
          searchOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={() => setSearchOpen(false)}
      >
        <div
          className={clsx(
            "w-full max-w-md rounded-3xl glass-panel-strong p-4 shadow-2xl transition-all duration-300",
            searchOpen
              ? "translate-y-0 scale-100"
              : "translate-y-4 scale-[0.98]",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-ash">
              Search
            </span>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-bone transition-colors hover:bg-graphite-100"
              aria-label="Close search"
              onClick={() => setSearchOpen(false)}
            >
              <CloseIcon className="h-[18px] w-[18px]" />
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3">
            <label htmlFor="global-search-input" className="sr-only">
              Search cars
            </label>

            <input
              id="global-search-input"
              ref={searchInputRef}
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search brand, model, or location…"
              className="h-12 w-full rounded-2xl border border-card bg-white/80 px-4 text-sm text-bone outline-none transition focus:border-brass focus:ring-2 focus:ring-brass/20"
            />

            <button
              type="submit"
              className="h-12 w-full rounded-2xl bg-brass text-sm font-semibold text-graphite-950 transition hover:bg-brass-light"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    </header>
  );
};
