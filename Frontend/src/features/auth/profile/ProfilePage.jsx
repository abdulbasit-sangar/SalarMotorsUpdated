import { useState } from "react";
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

const formatDateTime = (value) => {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const ProfileRow = ({ label, children }) => (
  <div className="flex items-center justify-between py-3.5 border-b border-card last:border-b-0">
    <span className="text-ash text-xs uppercase tracking-wider">{label}</span>
    <span className="text-bone text-sm font-mono">{children}</span>
  </div>
);

export default function ProfilePage() {
  const { admin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
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
      toast.success("Password changed successfully. Please log in again.");
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
        Account
      </p>
      <h1 className="font-display text-4xl font-semibold text-bone mb-8">Admin Profile</h1>

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
                {admin.role}
              </Badge>
              <Badge variant={admin.isActive ? "signal" : "danger"}>
                {admin.isActive ? "Active" : "Deactivated"}
              </Badge>
            </div>
          </div>
        </div>

        <ProfileRow label="Email">{admin.email}</ProfileRow>
        <ProfileRow label="Last Login">
          {formatDateTime(admin.lastLogin)}
        </ProfileRow>
        <ProfileRow label="Admin Since">
          {formatDateTime(admin.createdAt)}
        </ProfileRow>
      </div>

      <div className="glass-panel rounded-premium-lg p-6 mt-6">
        <button
          type="button"
          onClick={() => setShowChangePassword((prev) => !prev)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="font-display text-xl font-semibold text-bone">Change Password</h2>
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
              label="Current Password"
              type="password"
              autoComplete="current-password"
              required
              value={passwordForm.currentPassword}
              onChange={updatePasswordField("currentPassword")}
              error={fieldErrors.currentPassword}
            />
            <Input
              label="New Password"
              type="password"
              autoComplete="new-password"
              hint={
                !fieldErrors.newPassword ? "At least 8 characters." : undefined
              }
              required
              value={passwordForm.newPassword}
              onChange={updatePasswordField("newPassword")}
              error={fieldErrors.newPassword}
            />
            <Input
              label="Confirm New Password"
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
              Change Password
            </Button>
          </form>
        )}
      </div>

      <Button variant="secondary" className="mt-6" onClick={handleLogout}>
        Log Out
      </Button>
    </div>
  );
}
