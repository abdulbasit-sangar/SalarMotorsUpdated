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
 * Every icon below carries its own bright default color via the `colored`
 * helper — one paste makes icons colorful everywhere (navbar, cards, car
 * details, admin dashboard) with no call-site changes. If a call site passes
 * its own `text-*` color class, that always wins (e.g. the favorite heart's
 * `text-danger` / `text-graphite` states).
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

// ── Colorful icons ──────────────────────────────────────────────────────────────────
// Wraps a Lucide glyph with a fixed bright default color. The icon keeps its
// own color everywhere (no longer inherits the parent text color), while
// call-site `className` sizing still merges normally.
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

export const CarSilhouetteIcon = colored(Car, "text-sky-600");
// Directional glyphs mirror automatically in RTL (they point "back/forward",
// which swap sides). Non-directional icons (chevron-down, search, etc.) never
// flip. Call sites place the buttons themselves with logical start/end
// utilities so the icon and its position always agree.
const mirrorInRtl = (className) => clsx("rtl:-scale-x-100", className);

export const ChevronLeftIcon = ({ className = "", ...props }) => (
  <ChevronLeft {...iconProps} {...props} className={mirrorInRtl(withColor(className, "text-indigo-500"))} />
);
export const ChevronRightIcon = ({ className = "", ...props }) => (
  <ChevronRight {...iconProps} {...props} className={mirrorInRtl(withColor(className, "text-indigo-500"))} />
);
export const ChevronDownIcon = colored(ChevronDown, "text-indigo-500");
export const GaugeIcon = colored(Gauge, "text-cyan-600");
export const MapPinIcon = colored(MapPin, "text-rose-500");
export const SearchIcon = colored(Search, "text-sky-500");
export const CloseIcon = colored(X, "text-slate-500");
export const MenuIcon = colored(Menu, "text-slate-500");
export const ArrowRightIcon = ({ className = "", ...props }) => (
  <ArrowRight {...iconProps} {...props} className={mirrorInRtl(withColor(className, "text-indigo-500"))} />
);
export const LanguagesIcon = colored(Languages, "text-violet-500");
export const LayersIcon = colored(Layers, "text-purple-500");
export const FilterIcon = colored(Filter, "text-teal-500");
export const CompassIcon = colored(Compass, "text-sky-500"); // On the way
export const ContainerIcon = colored(Container, "text-orange-500"); // America → Herat
export const AnchorIcon = colored(Anchor, "text-blue-600"); // Dubai → Herat
export const WarehouseIcon = colored(Warehouse, "text-amber-500"); // Dubai Cars
export const LayoutGridIcon = colored(LayoutGrid, "text-emerald-500"); // All cars
export const HomeIcon = colored(Home, "text-teal-600"); // Home
// Interim aliases — kept colored in case a call site still uses them:
export const ShipIcon = colored(Ship, "text-orange-500");
export const BuildingIcon = colored(Building2, "text-amber-500");
export const CalendarIcon = colored(Calendar, "text-blue-500");
export const FuelIcon = colored(Fuel, "text-amber-600");
export const CheckIcon = colored(Check, "text-emerald-500");
export const EyeIcon = colored(Eye, "text-sky-500");
export const EyeOffIcon = colored(EyeOff, "text-slate-400");
export const PlusIcon = colored(Plus, "text-emerald-500");
export const DashboardIcon = colored(LayoutDashboard, "text-indigo-500");
export const UsersIcon = colored(Users, "text-violet-500");
export const UserIcon = colored(User, "text-violet-400");
export const SlidersIcon = colored(SlidersHorizontal, "text-teal-500");
// transmission spec icon — closest Lucide equivalent to a mechanical gear
export const GearIcon = colored(Cog, "text-slate-500");
export const PhoneIcon = colored(Phone, "text-green-500");
export const SquareIcon = colored(Square, "text-slate-400");
export const CheckSquareIcon = colored(CheckSquare, "text-emerald-500");
export const CameraIcon = colored(Camera, "text-sky-500");
export const EditIcon = colored(Pencil, "text-blue-500");
export const DeleteIcon = colored(Trash2, "text-red-500");
export const SaveIcon = colored(Save, "text-emerald-600");
export const SettingsIcon = colored(Settings, "text-slate-500");
export const AddImageIcon = colored(ImagePlus, "text-sky-500");
export const DragHandleIcon = colored(GripVertical, "text-slate-400");
export const SpinnerIcon = colored(Loader2, "text-indigo-500");
export const AlertIcon = colored(AlertCircle, "text-red-500");
export const ShieldIcon = colored(ShieldCheck, "text-emerald-600");
export const BoltIcon = colored(Zap, "text-amber-500");
export const HeadsetIcon = colored(Headset, "text-violet-500");
export const CommentIcon = colored(MessagesSquare, "text-sky-500");
export const CheckCircleIcon = colored(CheckCircle2, "text-emerald-500");
export const MailIcon = colored(Mail, "text-blue-500");
export const ClipboardCheckIcon = colored(ClipboardCheck, "text-teal-600");
export const ShippingIcon = colored(Truck, "text-orange-500");
export const GlobeIcon = colored(Globe, "text-sky-500");
export const PlaneIcon = colored(Plane, "text-indigo-400");
// Specification icons (car details page)
export const AwardIcon = colored(Award, "text-amber-500"); // brand
export const BanknoteIcon = colored(Banknote, "text-emerald-600"); // price
export const PaletteIcon = colored(Palette, "text-pink-500"); // color
export const CarFrontIcon = colored(CarFront, "text-sky-600"); // body type
export const HashIcon = colored(Hash, "text-slate-500"); // VIN
// Theme toggle
export const SunIcon = colored(Sun, "text-amber-400");
export const MoonIcon = colored(Moon, "text-indigo-300");

// WhatsApp — no official brand icon in Lucide (an outline icon set); the
// closest appropriate substitute is a chat-bubble icon, per the spec's own
// guidance for this exact case.
export const WhatsappIcon = colored(MessageCircle, "text-green-500");

// Heart keeps its `filled` prop API (used by FavoriteButton/SoldRibbon
// call sites) — Lucide's Heart accepts `fill` directly, so this just
// translates one prop name to the other.
export const HeartIcon = ({ className = "", filled = false, ...props }) => (
  <Heart
    className={withColor(className, "text-rose-500")}
    strokeWidth={STROKE}
    fill={filled ? "currentColor" : "none"}
    aria-hidden="true"
    {...props}
  />
);

// ── Bespoke exceptions (see file header) ───────────────────────────────────────

export const EngineIcon = ({ className = "" }) => (
  <svg viewBox="0 0 20 20" fill="none" className={withColor(className, "text-slate-500")} aria-hidden="true">
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
