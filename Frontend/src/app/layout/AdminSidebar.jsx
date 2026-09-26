import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../../store/auth/AuthContext.jsx";
import {
  DashboardIcon,
  CarSilhouetteIcon,
  PlusIcon,
  UserIcon,
  UsersIcon,
} from "../../shared/components/icons.jsx";

const LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", end: true, icon: DashboardIcon },
  { to: "/admin/listings", label: "Manage Listings", icon: CarSilhouetteIcon },
  { to: "/admin/listings/create", label: "Create Listing", icon: PlusIcon },
  { to: "/admin/profile", label: "Profile", icon: UserIcon },
];

// Manager/Sub-Admin RBAC — visible only to superadmin. This is purely a
// navigation convenience; the actual security boundary lives on the
// backend (requireRole("superadmin") on /api/managers routes) and on the
// SuperAdminOnlyRoute wrapper for this page.
const SUPERADMIN_LINKS = [{ to: "/admin/managers", label: "Managers", icon: UsersIcon }];

const linkClass = ({ isActive }) =>
  clsx(
    "flex items-center gap-3 h-11 px-4 text-sm font-medium rounded-xl transition-colors",
    isActive
      ? "bg-brass/12 text-brass-dark"
      : "text-ash hover:text-bone hover:bg-graphite-100",
  );

export const AdminSidebar = ({ onNavigate }) => {
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
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
};
