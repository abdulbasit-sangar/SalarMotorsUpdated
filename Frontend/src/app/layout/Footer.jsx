import { Link } from "react-router-dom";
import {
  MailIcon,
  FacebookIcon,
  InstagramIcon,
  PhoneIcon,
  WhatsappIcon,
} from "../../shared/components/icons.jsx";
import {
  LOCATION_ON_THE_WAY,
  dubaiCarsPath,
  onTheWayPath,
} from "../../shared/constants/locations.js";
import logo from "../../assets/salarmotors.svg";

const QUICK_LINKS = [
  { to: "/", label: "Home" },
  { to: "/listings", label: "All Cars" },
  { to: dubaiCarsPath(), label: "Dubai Cars" },
  {
    to: onTheWayPath(LOCATION_ON_THE_WAY.AMERICA_TO_HERAT),
    label: "On the Way: America to Herat",
  },
  {
    to: onTheWayPath(LOCATION_ON_THE_WAY.DUBAI_TO_HERAT),
    label: "On the Way: Dubai to Herat",
  },
];

const SOCIAL_LINKS = [
  {
    href: "https://www.facebook.com/share/18yrLpJSkU/",
    label: "Facebook",
    icon: FacebookIcon,
    accent: "hover:bg-[#1877F2]/10 hover:border-[#1877F2]/40 hover:text-[#1877F2]",
  },
  {
    href: "https://wa.me/93770957493",
    label: "WhatsApp",
    icon: WhatsappIcon,
    accent: "hover:bg-[#25D366]/10 hover:border-[#25D366]/40 hover:text-[#25D366]",
  },
  {
    href: "https://instagram.com",
    label: "Instagram",
    icon: InstagramIcon,
    accent: "hover:bg-[#E4405F]/10 hover:border-[#E4405F]/40 hover:text-[#E4405F]",
  },
];

export const Footer = () => (
  <footer className="relative bg-[#F9FAFB] text-[#1F2937] border-t border-[#E5E7EB] overflow-hidden font-sans antialiased">
    {/* Subtle Clean Ambient Background Glows */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
    <div className="absolute -top-32 left-1/4 w-96 h-96 bg-amber-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

    {/* Main Content Container */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-10">
        
        {/* Brand & Corporate Overview (Col 1-5) */}
        <div className="lg:col-span-5 space-y-6">
          <Link 
            to="/" 
            className="inline-block group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 rounded-lg transition-transform duration-200"
          >
            <img src={logo} alt="Salar Motors" className="h-12 w-auto object-contain" />
          </Link>
          
          <p className="text-[#4B5563] text-sm leading-relaxed max-w-md font-normal">
            The benchmark in luxury and imported vehicle logistics. Delivering verified inventory, unmatched global sourcing transparency, and seamless direct transit from international hubs to your destination.
          </p>

          {/* Social Icons with Brand Hover States */}
          <div className="pt-2">
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">
              Official Channels
            </span>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map(({ href, label, icon: Icon, accent }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={`group relative w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-[#E5E7EB] text-[#4B5563] shadow-sm transition-all duration-300 hover:-translate-y-0.5 ${accent} focus:outline-none focus:ring-2 focus:ring-amber-500/50`}
                >
                  <Icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Navigation Links (Col 6-8) */}
        <div className="lg:col-span-3 lg:pl-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#111827] mb-5 flex items-center gap-2.5">
            <span className="w-1.5 h-3.5 bg-amber-500 rounded-sm shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
            Quick Navigation
          </h3>
          <ul className="space-y-3.5">
            {QUICK_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="group inline-flex items-center text-sm text-[#4B5563] hover:text-[#111827] transition-all duration-200"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] mr-3 group-hover:bg-amber-500 group-hover:scale-125 group-hover:shadow-[0_0_6px_rgba(245,158,11,0.6)] transition-all duration-200 shrink-0" />
                  <span className="group-hover:translate-x-1 transition-transform duration-200 font-medium">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Direct Contact Support Hub (Col 9-12) */}
        <div className="lg:col-span-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#111827] mb-5 flex items-center gap-2.5">
            <span className="w-1.5 h-3.5 bg-amber-600 rounded-sm shadow-[0_0_6px_rgba(217,119,6,0.4)]" />
            Direct Support Hub
          </h3>
          <div className="space-y-3.5">
            {/* Phone Card */}
            <a
              href="tel:+93770957493"
              className="group relative flex items-center gap-4 p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-amber-500/50 hover:bg-[#FFFCF8] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300"
            >
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shrink-0">
                <PhoneIcon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] uppercase tracking-wider text-[#9CA3AF] font-semibold">Call Hotline</span>
                <span className="text-[#111827] font-semibold tracking-wide text-sm group-hover:text-amber-600 transition-colors truncate block">+93 (0) 770957493</span>
              </div>
            </a>

            {/* Email Card */}
            <a
              href="mailto:salar.motors10@gmail.com"
              className="group relative flex items-center gap-4 p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-blue-500/50 hover:bg-[#F8FAFC] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300"
            >
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shrink-0">
                <MailIcon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] uppercase tracking-wider text-[#9CA3AF] font-semibold">Email Desk</span>
                <span className="text-[#111827] font-semibold tracking-wide text-xs sm:text-sm group-hover:text-blue-600 transition-colors truncate block">salar.motors10@gmail.com</span>
              </div>
            </a>
          </div>
        </div>

      </div>
    </div>

    {/* Bottom Copyright Bar */}
    <div className="relative border-t border-[#E5E7EB] bg-[#F3F4F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-[#6B7280]">
        <p className="flex items-center gap-2 font-medium">
          <span className="text-[#374151]">© {new Date().getFullYear()} Salar Motors.</span>
          <span className="w-1 h-1 rounded-full bg-[#9CA3AF] hidden sm:inline" />
          <span>All rights reserved.</span>
        </p>
        <div className="flex items-center">
          <span className="bg-white px-3.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#4B5563] font-normal tracking-wide shadow-xs">
            All listings subject to availability & professional verification.
          </span>
        </div>
      </div>
    </div>
  </footer>
);