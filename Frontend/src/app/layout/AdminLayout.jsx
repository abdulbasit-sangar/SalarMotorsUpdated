import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth, loginPathForRole } from "../../store/auth/AuthContext.jsx";
import { useToast } from "../../store/ui/ToastContext.jsx";
import { AdminSidebar } from "./AdminSidebar.jsx";
import { SkipToContent } from "../../shared/components/SkipToContent.jsx";
import { OfflineBanner } from "../../shared/components/OfflineBanner.jsx";
import logoLight from "../../assets/safarLogo-Light.svg";
import logoDark from "../../assets/safarLogo-Dark.svg";
import { useEscapeKey } from "../../shared/hooks/useEscapeKey.js";
import { MenuIcon, CloseIcon } from "../../shared/components/icons.jsx";
import { LanguageSwitcher } from "../../shared/components/LanguageSwitcher.jsx";
import { ThemeToggle } from "../../shared/components/ThemeToggle.jsx";

export const AdminLayout = () => {
  const { t } = useTranslation("layout");
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEscapeKey(() => setDrawerOpen(false), drawerOpen);

  const handleLogout = async () => {
    // Capture the role BEFORE logout() clears the session: each role
    // returns to its own login page, so a manager is never sent to
    // /admin/login (where their credentials would be rejected).
    const role = admin?.role;
    await logout();
    toast.success(t("admin.loggedOut"));
    navigate(loginPathForRole(role), { replace: true });
  };

  const closeDrawer = () => setDrawerOpen(false);

  const logoutButtonClass =
    "flex w-full min-h-11 items-center gap-3 rounded-xl px-3.5 " +
    "text-sm font-semibold text-ash transition-colors duration-200 " +
    "hover:bg-red-50 hover:text-red-700 focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2";

  return (
    <div className="flex min-h-screen min-h-dvh bg-[#F7F6F3] text-[#252722]">
      <SkipToContent />

      {/* Desktop sidebar — sticky so it stays fixed while the content scrolls */}
      <aside
        className="sticky top-0 z-20 hidden h-screen h-dvh w-64 shrink-0 flex-col border-e border-[#E9E6DF] bg-white md:flex lg:w-[272px]"
        aria-label={t("admin.navigation")}
      >
        <Link
          to="/"
          className="flex h-[76px] shrink-0 items-center border-b border-[#EEECE6] px-6 transition-colors hover:bg-graphite-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass"
        >
          <img
            src={logoLight}
            alt={t("nav.logoAlt")}
            className="logo-light h-10 w-auto max-w-full object-contain object-left"
          />
          <img
            src={logoDark}
            alt={t("nav.logoAlt")}
            className="logo-dark h-10 w-auto max-w-full object-contain object-left"
          />
        </Link>

        <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-5">
          <AdminSidebar />
        </div>

        <div className="shrink-0 border-t border-[#E9E6DF] bg-white p-3">
          <div className="mb-2 flex min-w-0 items-center gap-3 rounded-xl bg-[#F8F7F4] p-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E8D9BC] bg-[#F3EBDD] text-sm font-bold text-[#87632C]"
              aria-hidden="true"
            >
              {(admin?.username || admin?.email || "A")
                .trim()
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#302F2A]">
                {admin?.username || "Admin"}
              </p>
              <p className="mt-0.5 truncate text-xs text-[#858176]">
                {admin?.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className={logoutButtonClass}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px] shrink-0"
            >
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
              <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
            </svg>
            <span>{t("admin.logout")}</span>
          </button>
        </div>
      </aside>

      {/* Mobile navigation drawer */}
      <div
        className={`fixed inset-0 z-[60] md:hidden ${
          drawerOpen
            ? "pointer-events-auto"
            : "pointer-events-none"
        }`}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          tabIndex={drawerOpen ? 0 : -1}
          onClick={closeDrawer}
          className={`absolute inset-0 h-full w-full bg-[#171915]/45 backdrop-blur-[3px] transition-opacity duration-200 ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label={t("nav.closeMenu")}
        />

        <aside
          id="admin-mobile-navigation"
          role="dialog"
          aria-modal={drawerOpen ? "true" : undefined}
          aria-label={t("admin.navigation")}
          className={`absolute inset-y-0 start-0 flex w-[min(19rem,88vw)] flex-col border-e border-[#E9E3D7] bg-[#FDFCFA] shadow-[20px_0_60px_rgba(28,27,22,0.13)] transition-transform duration-200 ease-out motion-reduce:transition-none ${
            drawerOpen
              ? "translate-x-0"
              : "ltr:-translate-x-full rtl:translate-x-full"
          }`}
        >
          <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#E9E6DF] px-5">
            <Link
              to="/"
              onClick={closeDrawer}
              tabIndex={drawerOpen ? 0 : -1}
              className="flex min-w-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            >
              <img
                src={logoLight}
                alt={t("nav.logoAlt")}
                className="logo-light h-9 w-auto max-w-[190px] object-contain object-left"
              />
              <img
                src={logoDark}
                alt={t("nav.logoAlt")}
                className="logo-dark h-9 w-auto max-w-[190px] object-contain object-left"
              />
            </Link>

            <button
              type="button"
              onClick={closeDrawer}
              tabIndex={drawerOpen ? 0 : -1}
              aria-label={t("nav.closeMenu")}
              className="ms-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EAE7E0] bg-white text-[#625F56] transition-colors hover:bg-[#F3F0E9] hover:text-[#252722] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            >
              <CloseIcon className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-5">
            <AdminSidebar onNavigate={closeDrawer} />
          </div>

          <div className="shrink-0 border-t border-[#E9E6DF] bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mb-2 flex min-w-0 items-center gap-3 rounded-xl bg-[#F8F7F4] p-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E8D9BC] bg-[#F3EBDD] text-sm font-bold text-[#87632C]"
                aria-hidden="true"
              >
                {(admin?.username || admin?.email || "A")
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#302F2A]">
                  {admin?.username || "Admin"}
                </p>
                <p className="mt-0.5 truncate text-xs text-[#858176]">
                  {admin?.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className={logoutButtonClass}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[18px] w-[18px] shrink-0"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
              </svg>
              <span>{t("admin.logout")}</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Main content column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center justify-between border-b border-[#E9E6DF] bg-white/90 px-4 backdrop-blur-xl sm:px-6 md:h-[76px] md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t("nav.openMenu")}
              aria-controls="admin-mobile-navigation"
              aria-expanded={drawerOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EAE7E0] bg-white text-[#45443D] transition-colors hover:bg-[#F5F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass md:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>

            <Link
              to="/"
              className="flex min-w-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass md:hidden"
            >
              <img
                src={logoLight}
                alt={t("nav.logoAlt")}
                className="logo-light h-8 w-auto max-w-[150px] object-contain object-left"
              />
              <img
                src={logoDark}
                alt={t("nav.logoAlt")}
                className="logo-dark h-8 w-auto max-w-[150px] object-contain object-left"
              />
            </Link>

            <div className="hidden min-w-0 md:block">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-[#A18A60]">
                {admin?.username || "Admin"}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#33332D]">
                {t("admin.navigation")}
              </p>
            </div>
          </div>

          <div className="ms-3 flex min-w-0 items-center">
            <ThemeToggle />
            <LanguageSwitcher tone="light" />
          </div>
        </header>

        <main
          id="main-content"
          className="min-w-0 flex-1 overflow-x-hidden"
        >
          <OfflineBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
