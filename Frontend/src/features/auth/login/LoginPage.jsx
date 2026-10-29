import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../store/auth/AuthContext.jsx";
import { useToast } from "../../../store/ui/ToastContext.jsx";
import { Input } from "../../../shared/components/Input.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import {
  AuthShell,
  AuthHeading,
  AuthCardPanel,
  AuthFormError,
  AuthFootnote,
} from "../shared/AuthCard.jsx";
import {
  validateLoginForm,
  hasErrors,
} from "../../../shared/utils/validators.js";
import { parseApiError } from "../../../services/api/client.js";
import { EyeIcon, EyeOffIcon } from "../../../shared/components/icons.jsx";

// Shared login form, used by both areas through thin wrappers:
//   AdminLoginPage   -> expectedRole="superadmin", dashboard "/admin/dashboard"
//   ManagerLoginPage -> expectedRole="manager",   dashboard "/manager/dashboard"
// The role is enforced by the BACKEND (loginSuperadmin / loginManager).
// This page only routes the user to the right place after the backend
// answers. Backend codes handled here:
//   ACCOUNT_PENDING     -> /manager/pending (never logged in, inactive)
//   ACCOUNT_DEACTIVATED -> inline error, no session is created
//   EMAIL_NOT_VERIFIED  -> inline error, no session is created
//   ROLE_MISMATCH       -> inline error + link to the other login page
export const getAuthErrorCode = (err) => err?.response?.data?.code || null;

export default function LoginPage({
  expectedRole = "superadmin",
  heading,
  dashboardPath,
  otherLoginPath,
  otherLoginLabel,
}) {
  const { t } = useTranslation("auth");
  const { loginAs } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const dashboard = dashboardPath || (expectedRole === "manager" ? "/manager/dashboard" : "/admin/dashboard");
  const otherLogin = otherLoginPath || (expectedRole === "manager" ? "/admin/login" : "/manager/login");
  const isManager = expectedRole === "manager";

  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateLoginForm(form);
    setFieldErrors(errors);
    setFormError(null);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      const me = await loginAs(expectedRole, form);
      toast.success(t("login.success"));
      // Never trust a stored `from` path from the other area: a manager
      // who was bounced from /admin/... must not land back in /admin.
      const fromPath = location.state?.from?.pathname;
      const fromArea = fromPath?.startsWith("/manager/") ? "manager" : fromPath?.startsWith("/admin/") ? "superadmin" : null;
      const redirectTo = fromArea === expectedRole ? fromPath : (me?.role === "manager" ? "/manager/dashboard" : "/admin/dashboard");
      navigate(redirectTo || dashboard, { replace: true });
    } catch (err) {
      const code = getAuthErrorCode(err);
      if (code === "ACCOUNT_PENDING") {
        // No session was created. Send them to the pending page with
        // their email so it can show a personal message.
        sessionStorage.setItem("managerPendingEmail", form.email.trim().toLowerCase());
        navigate("/manager/pending", {
          replace: true,
          state: { email: form.email.trim().toLowerCase() },
        });
        return;
      }
      const parsed = parseApiError(err);
      setFormError(parsed.errors.length ? parsed.errors : [parsed.message]);
      toast.error(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <AuthHeading
        eyebrow={heading?.eyebrow || t("login.eyebrow")}
        title={heading?.title || t("login.title")}
        subtitle={heading?.subtitle}
      />

      <AuthCardPanel>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthFormError messages={formError} />

          <Input
            label={t("common.email")}
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={updateField("email")}
            error={fieldErrors.email}
          />
          <div className="relative">
            <Input
              label={t("common.password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={form.password}
              onChange={updateField("password")}
              error={fieldErrors.password}
              className="pe-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute end-3.5 top-[22px] h-11 flex items-center justify-center text-ash hover:text-bone transition-colors focus:outline-none"
              aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
            >
              {showPassword ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
            </button>
          </div>

          <div className="flex justify-end">
            <Link to="/admin/forgot-password" className="text-xs text-brass-dark hover:underline">
              {t("login.forgot")}
            </Link>
          </div>

          <Button type="submit" variant="primary" className="w-full" loading={submitting}>
            {t("common.signIn")}
          </Button>
        </form>
      </AuthCardPanel>

      {isManager ? (
        <AuthFootnote>
          Don&apos;t have a manager account?{" "}
          <Link to="/manager/register" className="text-brass-dark font-medium hover:underline">
            Create a manager account
          </Link>
        </AuthFootnote>
      ) : (
        <AuthFootnote>
          {t("login.firstTime")}{" "}
          <Link to="/admin/register" className="text-brass-dark font-medium hover:underline">
            {t("login.registerInitial")}
          </Link>
        </AuthFootnote>
      )}
      <AuthFootnote>
        {otherLoginLabel || (isManager ? "Are you the main admin?" : "Are you a manager?")}{" "}
        <Link to={otherLogin} className="text-brass-dark font-medium hover:underline">
          {isManager ? "Main admin login" : "Manager login"}
        </Link>
      </AuthFootnote>
    </AuthShell>
  );
}
