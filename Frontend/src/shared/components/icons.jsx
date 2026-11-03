/**
 * icons.jsx — thin Lucide React wrappers.
 *
 * Every icon in the app is now a Lucide icon (installed as a real
 * dependency — see package.json). This file exists only so ~30 call sites
 * across the app didn't need to change their imports one by one: each
 * export below is the same name components already used, now backed by
 * lucide-react instead of hand-drawn SVGs. A shared `strokeWidth` applies one
 * consistent strokeWidth project-wide (spec requirement: "consistent
 * stroke width") while still letting any call site override it via props.
 *
 * Two deliberate exceptions, each with no reasonable Lucide equivalent:
 *   - EngineIcon — Lucide has no engine glyph; a generic substitute
 *     (e.g. a gear or a battery icon) would be a "random icon" standing in
 *     for something specific, so it stays as the original small bespoke SVG.
 *   - FacebookIcon / InstagramIcon — Lucide is an outline icon set and
 *     intentionally does not include brand logos (same reason it has no
 *     official WhatsApp mark, which the spec explicitly calls out and
 *     asks for the closest appropriate substitute instead). A brand
 *     logo's recognizability IS its function, so these keep minimal,
 *     accurate brand-mark SVGs rather than a generic Lucide stand-in.
 *
 * Every icon below carries a professional default color from the SAFAR icon
 * color system — one paste applies it everywhere (navbar, cards, car
 * details, admin dashboard) with no call-site changes. If a call site passes
 * its own `text-*` color class, that always wins (e.g. the favorite heart's
 * `text-danger` / `text-icon` states).
 *
 * Color roles (all theme-adaptive — see the `.text-icon*` utilities in
 * shared/styles/index.css; each flips to a readable counterpart in dark
 * mode so icons stay clearly visible in both themes):
 *   text-icon           — default: charcoal #2D2926
 *   text-icon-secondary — secondary: muted gray-brown #8A8178
 *   text-icon-accent    — active / selected / important: bronze #B8863A
 *   text-icon-success   — success states: green
 *   text-icon-danger    — errors / destructive actions: red
 * Brand marks (Facebook, Instagram) keep their brand colors — a logo's
 * recognizability IS its function.
 */
import clsx from "clsx";
import {
  Car,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Gauge,
  MapPin,
  Search,
  X,
  Menu,
  ArrowRight,
  Calendar,
  Fuel,
  Check,
  Eye,
  EyeOff,
  Plus,
  LayoutDashboard,
  Users,
  User,
  SlidersHorizontal,
  Cog,
  Heart,
  MessageCircle,
  Phone,
  Square,
  CheckSquare,
  Camera,
  Pencil,
  Trash2,
  Save,
  Settings,
  ImagePlus,
  GripVertical,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Headset,
  MessagesSquare,
  CheckCircle2,
  Mail,
  ClipboardCheck,
  Truck,
  Home,
  Globe,
  Plane,
  Ship,
  Languages,
  Layers,
  Filter,
  LayoutGrid,
  Compass,
  Anchor,
  Building2,
  Container,
  Warehouse,
  Award,
  Banknote,
  Palette,
  CarFront,
  Hash,
  Sun,
  Moon,
} from "lucide-react";

const STROKE = 1.75;

/** Shared props applied to every wrapped icon: default stroke width, and
 * `aria-hidden` since every call site in the app pairs icons with visible
 * text (a `className` prop passed at the call site still overrides this). */
const iconProps = { strokeWidth: STROKE, "aria-hidden": true };

// ── Professional icon color system ────────────────────────────────────────────
// Wraps a Lucide glyph with a fixed default color from the SAFAR palette.
// The icon keeps its own color everywhere (no longer inherits the parent
// text color), while call-site `className` sizing still merges normally.
// Caller-supplied `text-*` color always wins; otherwise the icon's own
// default color applies.
const withColor = (className = "", color) =>
  /text-/.test(className) ? className : clsx(color, className);

const colored = (Glyph, color) => {
  const ColoredIcon = ({ className = "", ...props }) => (
    <Glyph {...iconProps} {...props} className={withColor(className, color)} />
  );
  return ColoredIcon;
};

export const CarSilhouetteIcon = colored(Car, "text-icon");
// Directional glyphs mirror automatically in RTL (they point "back/forward",
// which swap sides). Non-directional icons (chevron-down, search, etc.) never
// flip. Call sites place the buttons themselves with logical start/end
// utilities so the icon and its position always agree.
const mirrorInRtl = (className) => clsx("rtl:-scale-x-100", className);

export const ChevronLeftIcon = ({ className = "", ...props }) => (
  <ChevronLeft {...iconProps} {...props} className={mirrorInRtl(withColor(className, "text-icon"))} />
);
export const ChevronRightIcon = ({ className = "", ...props }) => (
  <ChevronRight {...iconProps} {...props} className={mirrorInRtl(withColor(className, "text-icon"))} />
);
export const ChevronDownIcon = colored(ChevronDown, "text-icon");
export const GaugeIcon = colored(Gauge, "text-icon");
export const MapPinIcon = colored(MapPin, "text-icon");
export const SearchIcon = colored(Search, "text-icon");
export const CloseIcon = colored(X, "text-icon");
export const MenuIcon = colored(Menu, "text-icon");
export const ArrowRightIcon = ({ className = "", ...props }) => (
  <ArrowRight {...iconProps} {...props} className={mirrorInRtl(withColor(className, "text-icon"))} />
);
export const LanguagesIcon = colored(Languages, "text-icon");
export const LayersIcon = colored(Layers, "text-icon");
export const FilterIcon = colored(Filter, "text-icon-accent");
export const CompassIcon = colored(Compass, "text-icon"); // On the way
export const ContainerIcon = colored(Container, "text-icon"); // America → Herat
export const AnchorIcon = colored(Anchor, "text-icon"); // Dubai → Herat
export const WarehouseIcon = colored(Warehouse, "text-icon"); // Dubai Cars
export const LayoutGridIcon = colored(LayoutGrid, "text-icon"); // All cars
export const HomeIcon = colored(Home, "text-icon"); // Home
// Interim aliases — kept in case a call site still uses them:
export const ShipIcon = colored(Ship, "text-icon");
export const BuildingIcon = colored(Building2, "text-icon");
export const CalendarIcon = colored(Calendar, "text-icon");
export const FuelIcon = colored(Fuel, "text-icon");
export const CheckIcon = colored(Check, "text-icon-success");
export const EyeIcon = colored(Eye, "text-icon");
export const EyeOffIcon = colored(EyeOff, "text-icon-secondary");
export const PlusIcon = colored(Plus, "text-icon");
export const DashboardIcon = colored(LayoutDashboard, "text-icon");
export const UsersIcon = colored(Users, "text-icon");
export const UserIcon = colored(User, "text-icon");
export const SlidersIcon = colored(SlidersHorizontal, "text-icon-secondary");
// transmission spec icon — closest Lucide equivalent to a mechanical gear
export const GearIcon = colored(Cog, "text-icon");
export const PhoneIcon = colored(Phone, "text-icon");
export const SquareIcon = colored(Square, "text-icon-secondary");
export const CheckSquareIcon = colored(CheckSquare, "text-icon-success");
export const CameraIcon = colored(Camera, "text-icon");
export const EditIcon = colored(Pencil, "text-icon");
export const DeleteIcon = colored(Trash2, "text-icon-danger");
export const SaveIcon = colored(Save, "text-icon");
export const SettingsIcon = colored(Settings, "text-icon");
export const AddImageIcon = colored(ImagePlus, "text-icon");
export const DragHandleIcon = colored(GripVertical, "text-icon-secondary");
export const SpinnerIcon = colored(Loader2, "text-icon-secondary");
export const AlertIcon = colored(AlertCircle, "text-icon-danger");
export const ShieldIcon = colored(ShieldCheck, "text-icon-success");
export const BoltIcon = colored(Zap, "text-icon-accent");
export const HeadsetIcon = colored(Headset, "text-icon");
export const CommentIcon = colored(MessagesSquare, "text-icon");
export const CheckCircleIcon = colored(CheckCircle2, "text-icon-success");
export const MailIcon = colored(Mail, "text-icon");
export const ClipboardCheckIcon = colored(ClipboardCheck, "text-icon");
export const ShippingIcon = colored(Truck, "text-icon");
export const GlobeIcon = colored(Globe, "text-icon");
export const PlaneIcon = colored(Plane, "text-icon");
// Specification icons (car details page)
export const AwardIcon = colored(Award, "text-icon-accent"); // brand
export const BanknoteIcon = colored(Banknote, "text-icon"); // price
export const PaletteIcon = colored(Palette, "text-icon"); // color
export const CarFrontIcon = colored(CarFront, "text-icon"); // body type
export const HashIcon = colored(Hash, "text-icon-secondary"); // VIN
// Theme toggle
export const SunIcon = colored(Sun, "text-icon-accent");
export const MoonIcon = colored(Moon, "text-icon-accent");

// WhatsApp — no official brand icon in Lucide (an outline icon set); the
// closest appropriate substitute is a chat-bubble icon, per the spec's own
// guidance for this exact case.
export const WhatsappIcon = colored(MessageCircle, "text-icon-success");

// Heart keeps its `filled` prop API (used by FavoriteButton/SoldRibbon
// call sites) — Lucide's Heart accepts `fill` directly, so this just
// translates one prop name to the other.
export const HeartIcon = ({ className = "", filled = false, ...props }) => (
  <Heart
    className={withColor(className, "text-icon-accent")}
    strokeWidth={STROKE}
    fill={filled ? "currentColor" : "none"}
    aria-hidden="true"
    {...props}
  />
);

// ── Bespoke exceptions (see file header) ───────────────────────────────────────

export const EngineIcon = ({ className = "" }) => (
  <svg viewBox="0 0 20 20" fill="none" className={withColor(className, "text-icon")} aria-hidden="true">
    <rect
      x="3"
      y="8"
      width="8"
      height="6"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <path
      d="M5.5 8V6.2h3.4V8M11 10h2.2c.5 0 .8.35.8.8v1c0 .45-.3.8-.8.8H11M15.5 10.5v3"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 14v1.3M8.5 14v1.3"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

export const FacebookIcon = ({ className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={withColor(className, "text-blue-600")}
    aria-hidden="true"
  >
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34V22c4.78-.8 8.44-4.95 8.44-9.94Z" />
  </svg>
);

export const InstagramIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={withColor(className, "text-pink-600")} aria-hidden="true">
    <rect
      x="2.5"
      y="2.5"
      width="19"
      height="19"
      rx="5.5"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" />
  </svg>
);
