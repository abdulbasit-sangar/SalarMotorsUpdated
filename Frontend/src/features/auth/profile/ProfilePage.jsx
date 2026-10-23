import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useOptionLabel } from "../../../i18n/optionLabels.js";
import { formatDateTime } from "../../../shared/utils/format.js";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../store/auth/AuthContext.jsx";
import { useToast } from "../../../store/ui/ToastContext.jsx";
import { Badge } from "../../../shared/components/Badge.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { Input } from "../../../shared/components/Input.jsx";
import { AuthFormError } from "../shared/AuthCard.jsx";
import { ChevronDownIcon } from "../../../shared/components/icons.jsx";
import clsx from "clsx";
import {
  validateChangePasswordForm,
  hasErrors,
} from "../../../shared/utils/validators.js";
import { parseApiError } from "../../../services/api/client.js";
import { changePassword as apiChangePassword } from "../../../services/auth/authApi.js";

const ProfileRow = ({ label, children }) => (
  <div className="flex items-center justify-between py-3.5 border-b border-card last:border-b-0">
    <span className="text-ash text-xs uppercase tracking-wider">{label}</span>
    <span className="text-bone text-sm font-mono">{children}</span>
  </div>
);

export default function ProfilePage() {
  const { t } = useTranslation("auth");
  const label = useOptionLabel();
  const stamp = (value) =>
    value
      ? formatDateTime(value, { dateStyle: "medium", timeStyle: "short" })
      : t("profile.never");
  const { admin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success(t("profile.loggedOut"));
    navigate("/admin/login");
  };

  // ── Change password ───────────────────────────────────────────────────────
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const updatePasswordField = (key) => (e) => {
    setPasswordForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errors = validateChangePasswordForm(passwordForm);
    setFieldErrors(errors);
    setFormError(null);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      await apiChangePassword(passwordForm);
      toast.success(t("profile.passwordChanged"));
      // Backend invalidates the existing session on password change —
      // clear local auth state and send the admin back to Sign In.
      await logout();
      navigate("/admin/login", { replace: true });
    } catch (err) {
      const parsed = parseApiError(err);
      setFormError(parsed.errors.length ? parsed.errors : [parsed.message]);
      toast.error(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!admin) return null;

  return (
    <div className="container-page py-10 sm:py-14 max-w-lg">
      <p className="font-mono text-xs text-brass uppercase tracking-widest mb-2">
        {t("profile.eyebrow")}
      </p>
      <h1 className="font-display text-4xl font-semibold text-bone mb-8">
        {t("profile.title")}
      </h1>

      <div className="glass-panel rounded-premium-lg p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/30 flex items-center justify-center shrink-0">
            <span className="font-display text-2xl font-semibold text-brass-dark">
              {admin.username?.[0]?.toUpperCase() || "A"}
            </span>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-bone">{admin.username}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge
                variant={admin.role === "superadmin" ? "brass" : "neutral"}
              >
                {label("role", admin.role)}
              </Badge>
              <Badge variant={admin.isActive ? "signal" : "danger"}>
                {admin.isActive ? t("profile.active") : t("profile.deactivated")}
              </Badge>
            </div>
          </div>
        </div>

        <ProfileRow label={t("profile.email")}>
          <span className="ltr-isolate">{admin.email}</span>
        </ProfileRow>
        <ProfileRow label={t("profile.lastLogin")}>
          {stamp(admin.lastLogin)}
        </ProfileRow>
        <ProfileRow label={t("profile.adminSince")}>
          {stamp(admin.createdAt)}
        </ProfileRow>
      </div>

      <div className="glass-panel rounded-premium-lg p-6 mt-6">
        <button
          type="button"
          onClick={() => setShowChangePassword((prev) => !prev)}
          className="flex min-h-11 items-center justify-between w-full text-start"
        >
          <h2 className="font-display text-xl font-semibold text-bone">
            {t("profile.changePassword")}
          </h2>
          <ChevronDownIcon
            className={clsx(
              "h-4 w-4 text-ash transition-transform duration-200",
              showChangePassword && "rotate-180",
            )}
          />
        </button>

        {showChangePassword && (
          <form
            onSubmit={handleChangePassword}
            className="mt-6 space-y-4"
            noValidate
          >
            <AuthFormError messages={formError} />

            <Input
              label={t("profile.currentPassword")}
              type="password"
              autoComplete="current-password"
              required
              value={passwordForm.currentPassword}
              onChange={updatePasswordField("currentPassword")}
              error={fieldErrors.currentPassword}
            />
            <Input
              label={t("common.newPassword")}
              type="password"
              autoComplete="new-password"
              hint={
                !fieldErrors.newPassword
                  ? t("register.passwordHint", { min: 8 })
                  : undefined
              }
              required
              value={passwordForm.newPassword}
              onChange={updatePasswordField("newPassword")}
              error={fieldErrors.newPassword}
            />
            <Input
              label={t("common.confirmNewPassword")}
              type="password"
              autoComplete="new-password"
              required
              value={passwordForm.confirmPassword}
              onChange={updatePasswordField("confirmPassword")}
              error={fieldErrors.confirmPassword}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={submitting}
            >
              {t("profile.changePassword")}
            </Button>
          </form>
        )}
      </div>

      <Button
        variant="secondary"
        className="mt-6 w-full sm:w-auto"
        onClick={handleLogout}
      >
        {t("profile.logout")}
      </Button>
    </div>
  );
}
