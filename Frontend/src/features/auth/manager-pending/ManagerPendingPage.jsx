import { Link, useLocation } from "react-router-dom";
import { AuthShell, AuthHeading, AuthCardPanel } from "../shared/AuthCard.jsx";
import { Button } from "../../../shared/components/Button.jsx";

// Route: /manager/pending — guest-accessible, no login required.
// This page is the ONLY thing a pending manager should see after
// registering and verifying their email, until a superadmin clicks
// Activate in /admin/managers. It creates no session and grants no
// access to listings, dashboard or any protected page.
//
// Reached from:
//  1. ManagerRegisterPage, after the email OTP is verified, and
//  2. ManagerLoginPage, when the backend returns ACCOUNT_PENDING.
// Email comes from location.state, or from sessionStorage as a fallback
// (e.g. after a refresh). If neither exists, the message stays generic.
export default function ManagerPendingPage() {
  const location = useLocation();
  const email =
    location.state?.email ||
    sessionStorage.getItem("managerPendingEmail") ||
    "";

  return (
    <AuthShell>
      <AuthHeading
        eyebrow="Manager account"
        title="Your account is pending approval"
        subtitle={
          email
            ? `Thanks for verifying ${email}. Your request has been received and is waiting for the main admin to activate it.`
            : "Your request has been received and is waiting for the main admin to activate it."
        }
      />

      <AuthCardPanel>
        <div className="space-y-4 text-sm leading-relaxed text-ash">
          <p>
            <span className="font-semibold text-bone">What happens next?</span>
            <br />
            Once the main admin clicks <span className="font-semibold text-bone">Activate</span> on
            your account, you will be able to log in and see your manager
            dashboard. Until then, you cannot log in or access any manager pages.
          </p>
          <p>
            If you try to log in before activation, you will be sent back to
            this page. You do not need to register again, and you do not need
            to verify your email again.
          </p>
          <p>
            If your account stays pending for a long time, please contact the
            main admin directly.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <Link to="/manager/login">
            <Button variant="primary" className="w-full">
              Try manager login
            </Button>
          </Link>
          <Link to="/">
            <Button variant="secondary" className="w-full">
              Back to home
            </Button>
          </Link>
        </div>
      </AuthCardPanel>

      <p className="text-center text-ash text-xs mt-6 leading-relaxed">
        Already activated?{" "}
        <Link to="/manager/login" className="text-brass-dark font-medium hover:underline">
          Go to manager login
        </Link>
      </p>
    </AuthShell>
  );
}
