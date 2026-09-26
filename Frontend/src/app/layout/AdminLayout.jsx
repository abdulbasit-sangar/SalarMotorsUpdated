import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/auth/AuthContext.jsx";
import { useToast } from "../../store/ui/ToastContext.jsx";
import { AdminSidebar } from "./AdminSidebar.jsx";
import { SkipToContent } from "../../shared/components/SkipToContent.jsx";
import { OfflineBanner } from "../../shared/components/OfflineBanner.jsx";
import logo from "../../assets/salarmotors.svg";
import { useEscapeKey } from "../../shared/hooks/useEscapeKey.js";
import { MenuIcon, CloseIcon } from "../../shared/components/icons.jsx";

export const AdminLayout = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEscapeKey(() => setDrawerOpen(false), drawerOpen);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen flex bg-graphite-950">
      <SkipToContent />
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-card shrink-0 bg-white/40">
        <Link
          to="/"
          className="h-[76px] flex items-center px-5 border-b border-card"
        >
          <img
            src={logo}
            alt="Salar Motors logo"
            className="h-11 w-auto object-contain"
          />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <AdminSidebar />
        </div>
        <div className="p-3 border-t border-card">
          <p className="text-xs text-ash px-3 mb-2 truncate">{admin?.email}</p>
          <button
            onClick={handleLogout}
            className="w-full h-10 text-sm font-semibold text-ash hover:text-brass-dark hover:bg-graphite-100 rounded-xl transition-colors text-left px-3"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${
          drawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
      >
        <div
          className="absolute inset-0 bg-graphite/45 backdrop-blur-[2px]"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`absolute inset-y-0 left-0 w-72 glass-panel-strong flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-[76px] flex items-center justify-between px-5 border-b border-card shrink-0">
            <Link to="/" className="flex items-center shrink-0">
              <img
                src={logo}
                alt="Salar Motors logo"
                className="h-9 w-auto object-contain"
              />
            </Link>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ash transition-colors hover:bg-graphite-100 hover:text-bone"
            >
              <CloseIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AdminSidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
          <div className="p-3 border-t border-card">
            <button
              onClick={handleLogout}
              className="w-full h-10 text-sm font-semibold text-ash hover:text-brass-dark hover:bg-graphite-100 rounded-xl transition-colors text-left px-3"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[76px] border-b border-card flex items-center justify-between px-4 md:px-6 shrink-0 bg-white/50 backdrop-blur-sm">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-full text-bone hover:bg-graphite-100 -ml-2"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <Link to="/" className="md:hidden flex items-center shrink-0">
            <img
              src={logo}
              alt="Salar Motors logo"
              className="h-8 w-auto object-contain"
            />
          </Link>
          <div className="hidden md:block" />
          <span className="text-sm text-ash">{admin?.username}</span>
        </header>
        <main id="main-content" className="flex-1 overflow-x-hidden">
          <OfflineBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
