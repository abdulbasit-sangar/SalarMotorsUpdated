import { Outlet } from "react-router-dom";
import { Footer } from "./Footer.jsx";
import { SkipToContent } from "../../shared/components/SkipToContent.jsx";
import { OfflineBanner } from "../../shared/components/OfflineBanner.jsx";

// Auth screens layout: the same page shell as PublicLayout but WITHOUT
// the Navbar, so the admin/manager login, register, pending-approval and
// forgot-password screens are distraction-free. Everything else
// (skip link, offline banner, footer) is unchanged.
export const AuthLayout = () => (
  <div className="min-h-screen flex flex-col">
    <SkipToContent />
    <OfflineBanner />
    <main id="main-content" className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);
