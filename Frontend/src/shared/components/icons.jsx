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
 */
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
} from "lucide-react";

const STROKE = 1.75;

/** Shared props applied to every wrapped icon: default stroke width, and
 * `aria-hidden` since every call site in the app pairs icons with visible
 * text (a `className` prop passed at the call site still overrides this). */
const iconProps = { strokeWidth: STROKE, "aria-hidden": true };

export const CarSilhouetteIcon = (props) => <Car {...iconProps} {...props} />;
export const ChevronLeftIcon = (props) => (
  <ChevronLeft {...iconProps} {...props} />
);
export const ChevronRightIcon = (props) => (
  <ChevronRight {...iconProps} {...props} />
);
export const ChevronDownIcon = (props) => (
  <ChevronDown {...iconProps} {...props} />
);
export const GaugeIcon = (props) => <Gauge {...iconProps} {...props} />;
export const MapPinIcon = (props) => <MapPin {...iconProps} {...props} />;
export const SearchIcon = (props) => <Search {...iconProps} {...props} />;
export const CloseIcon = (props) => <X {...iconProps} {...props} />;
export const MenuIcon = (props) => <Menu {...iconProps} {...props} />;
export const ArrowRightIcon = (props) => (
  <ArrowRight {...iconProps} {...props} />
);
export const CalendarIcon = (props) => <Calendar {...iconProps} {...props} />;
export const FuelIcon = (props) => <Fuel {...iconProps} {...props} />;
export const CheckIcon = (props) => <Check {...iconProps} {...props} />;
export const EyeIcon = (props) => <Eye {...iconProps} {...props} />;
export const EyeOffIcon = (props) => <EyeOff {...iconProps} {...props} />;
export const PlusIcon = (props) => <Plus {...iconProps} {...props} />;
export const DashboardIcon = (props) => (
  <LayoutDashboard {...iconProps} {...props} />
);
export const UsersIcon = (props) => <Users {...iconProps} {...props} />;
export const UserIcon = (props) => <User {...iconProps} {...props} />;
export const SlidersIcon = (props) => (
  <SlidersHorizontal {...iconProps} {...props} />
);
// transmission spec icon — closest Lucide equivalent to a mechanical gear
export const GearIcon = (props) => <Cog {...iconProps} {...props} />;
export const PhoneIcon = (props) => <Phone {...iconProps} {...props} />;
export const SquareIcon = (props) => <Square {...iconProps} {...props} />;
export const CheckSquareIcon = (props) => (
  <CheckSquare {...iconProps} {...props} />
);
export const CameraIcon = (props) => <Camera {...iconProps} {...props} />;
export const EditIcon = (props) => <Pencil {...iconProps} {...props} />;
export const DeleteIcon = (props) => <Trash2 {...iconProps} {...props} />;
export const SaveIcon = (props) => <Save {...iconProps} {...props} />;
export const SettingsIcon = (props) => <Settings {...iconProps} {...props} />;
export const AddImageIcon = (props) => <ImagePlus {...iconProps} {...props} />;
export const DragHandleIcon = (props) => (
  <GripVertical {...iconProps} {...props} />
);
export const SpinnerIcon = (props) => <Loader2 {...iconProps} {...props} />;
export const AlertIcon = (props) => <AlertCircle {...iconProps} {...props} />;
export const ShieldIcon = (props) => <ShieldCheck {...iconProps} {...props} />;
export const BoltIcon = (props) => <Zap {...iconProps} {...props} />;
export const HeadsetIcon = (props) => <Headset {...iconProps} {...props} />;
export const CommentIcon = (props) => (
  <MessagesSquare {...iconProps} {...props} />
);
export const CheckCircleIcon = (props) => (
  <CheckCircle2 {...iconProps} {...props} />
);
export const MailIcon = (props) => <Mail {...iconProps} {...props} />;
export const ClipboardCheckIcon = (props) => (
  <ClipboardCheck {...iconProps} {...props} />
);
export const ShippingIcon = (props) => <Truck {...iconProps} {...props} />;
export const HomeIcon = (props) => <Home {...iconProps} {...props} />;
export const GlobeIcon = (props) => <Globe {...iconProps} {...props} />;
export const PlaneIcon = (props) => <Plane {...iconProps} {...props} />;
export const ShipIcon = (props) => <Ship {...iconProps} {...props} />;

// WhatsApp — no official brand icon in Lucide (an outline icon set); the
// closest appropriate substitute is a chat-bubble icon, per the spec's own
// guidance for this exact case.
export const WhatsappIcon = (props) => (
  <MessageCircle {...iconProps} {...props} />
);

// Heart keeps its `filled` prop API (used by FavoriteButton/SoldRibbon
// call sites) — Lucide's Heart accepts `fill` directly, so this just
// translates one prop name to the other.
export const HeartIcon = ({ className = "", filled = false, ...props }) => (
  <Heart
    className={className}
    strokeWidth={STROKE}
    fill={filled ? "currentColor" : "none"}
    aria-hidden="true"
    {...props}
  />
);

// ── Bespoke exceptions (see file header) ───────────────────────────────────────

export const EngineIcon = ({ className = "" }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
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
    className={className}
    aria-hidden="true"
  >
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34V22c4.78-.8 8.44-4.95 8.44-9.94Z" />
  </svg>
);

export const InstagramIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
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
