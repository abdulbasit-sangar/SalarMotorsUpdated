import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../store/auth/AuthContext.jsx";
import {
  DashboardIcon,
  CarSilhouetteIcon,
  PlusIcon,
  UserIcon,
  UsersIcon,
} from "../../shared/components/icons.jsx";

const LINKS = [
  { to: "/admin/dashboard", labelKey: "admin.dashboard", end: true, icon: DashboardIcon },
  { to: "/admin/listings", labelKey: "admin.manageListings", icon: CarSilhouetteIcon },
  { to: "/admin/listings/create", labelKey: "admin.createListing", icon: PlusIcon },
  { to: "/admin/profile", labelKey: "admin.profile", icon: UserIcon },
];

// Manager/Sub-Admin RBAC — visible only to superadmin. This is purely a
// navigation convenience; the actual security boundary lives on the
// backend (requireRole("superadmin") on /api/managers routes) and on the
// SuperAdminOnlyRoute wrapper for this page.
const SUPERADMIN_LINKS = [{ to: "/admin/managers", labelKey: "admin.managers", icon: UsersIcon }];

const linkClass = ({ isActive }) =>
  clsx(
    "flex items-center gap-3 h-11 px-4 text-sm font-medium rounded-xl transition-colors",
    isActive
      ? "bg-brass/12 text-brass-dark"
      : "text-ash hover:text-bone hover:bg-graphite-100",
  );

export const AdminSidebar = ({ onNavigate }) => {
  const { t } = useTranslation("layout");
  const { admin } = useAuth();
  const links =
    admin?.role === "superadmin" ? [...LINKS, ...SUPERADMIN_LINKS] : LINKS;

  return (
    <nav className="flex flex-col gap-1 p-3">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={linkClass}
          onClick={onNavigate}
        >
          <link.icon className="w-[18px] h-[18px] shrink-0" />
          {t(link.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
};
