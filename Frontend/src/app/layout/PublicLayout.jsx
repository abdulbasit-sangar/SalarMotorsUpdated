import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar.jsx";
import { Footer } from "./Footer.jsx";
import { SkipToContent } from "../../shared/components/SkipToContent.jsx";
import { OfflineBanner } from "../../shared/components/OfflineBanner.jsx";

export const PublicLayout = () => (
  <div className="min-h-screen flex flex-col">
    <SkipToContent />
    <OfflineBanner />
    <Navbar />
    <main id="main-content" className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);
