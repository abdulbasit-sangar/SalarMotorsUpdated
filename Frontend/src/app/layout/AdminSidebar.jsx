
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
  {
    to: "/admin/dashboard",
    labelKey: "admin.dashboard",
    end: true,
    icon: DashboardIcon,
  },
  {
    to: "/admin/listings",
    labelKey: "admin.manageListings",
    end: true,
    icon: CarSilhouetteIcon,
  },
  {
    to: "/admin/listings/create",
    labelKey: "admin.createListing",
    end: true,
    icon: PlusIcon,
  },
  {
    to: "/admin/profile",
    labelKey: "admin.profile",
    end: true,
    icon: UserIcon,
  },
];

// Visible only to superadmins.
// Actual authorization is enforced by the backend and protected routes.
const SUPERADMIN_LINKS = [
  {
    to: "/admin/managers",
    labelKey: "admin.managers",
    end: true,
    icon: UsersIcon,
  },
];

const linkClass = ({ isActive }) =>
  clsx(
    [
      "group relative flex h-11 w-full items-center gap-3",
      "rounded-xl px-3.5 text-sm font-medium",
      "transition-colors duration-150",
      "focus-visible:outline-none focus-visible:ring-2",
      "focus-visible:ring-brass/60 focus-visible:ring-offset-2",
    ],
    isActive
      ? [
          "bg-[#F7F0E4] text-[#80551F]",
          "before:absolute before:inset-y-2.5 before:left-0",
          "before:w-[3px] before:rounded-r-full before:bg-[#B8863A]",
        ]
      : [
          "text-[#68645D]",
          "hover:bg-[#F7F5F0] hover:text-[#292722]",
        ],
  );

export const AdminSidebar = ({ onNavigate }) => {
  const { t } = useTranslation("layout");
  const { admin } = useAuth();

  const links =
    admin?.role === "superadmin"
      ? [...LINKS, ...SUPERADMIN_LINKS]
      : LINKS;

  return (
    <nav
      aria-label={t("admin.navigation", {
        defaultValue: "Admin navigation",
      })}
      className="flex flex-col gap-1.5 p-3"
    >
      {links.map(({ to, labelKey, end = true, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={linkClass}
          onClick={onNavigate}
        >
          <Icon
            aria-hidden="true"
            className="h-[18px] w-[18px] shrink-0 transition-colors duration-150 group-hover:text-current"
          />

          <span className="min-w-0 flex-1 truncate">
            {t(labelKey)}
          </span>
        </NavLink>
      ))}
    </nav>
  );
};
