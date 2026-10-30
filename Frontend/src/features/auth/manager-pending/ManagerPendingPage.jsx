import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("auth");
  const location = useLocation();
  const email =
    location.state?.email ||
    sessionStorage.getItem("managerPendingEmail") ||
    "";

  return (
    <AuthShell>
      <AuthHeading
        eyebrow={t("pending.eyebrow")}
        title={t("pending.title")}
        subtitle={
          email
            ? t("pending.subtitleWithEmail", { email })
            : t("pending.subtitleGeneric")
        }
      />

      <AuthCardPanel>
        <div className="space-y-4 text-sm leading-relaxed text-ash">
          <p>
            <span className="font-semibold text-bone">{t("pending.whatNext")}</span>
            <br />
            {t("pending.body1a")}{" "}
            <span className="font-semibold text-bone">{t("pending.activateWord")}</span>{" "}
            {t("pending.body1b")}
          </p>
          <p>{t("pending.body2")}</p>
          <p>{t("pending.body3")}</p>
        </div>

        <div className="mt-6 space-y-3">
          <Link to="/manager/login">
            <Button variant="primary" className="w-full">
              {t("pending.tryLogin")}
            </Button>
          </Link>
          <Link to="/">
            <Button variant="secondary" className="w-full">
              {t("pending.backHome")}
            </Button>
          </Link>
        </div>
      </AuthCardPanel>

      <p className="text-center text-ash text-xs mt-6 leading-relaxed">
        {t("pending.alreadyActivated")}{" "}
        <Link to="/manager/login" className="text-brass-dark font-medium hover:underline">
          {t("pending.goToLogin")}
        </Link>
      </p>
    </AuthShell>
  );
}
