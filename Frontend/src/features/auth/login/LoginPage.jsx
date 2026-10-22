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

export default function LoginPage() {
  const { t } = useTranslation("auth");
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

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
      await login(form);
      toast.success(t("login.success"));
      const redirectTo = location.state?.from?.pathname || "/admin/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const parsed = parseApiError(err);
      setFormError(parsed.errors.length ? parsed.errors : [parsed.message]);
      toast.error(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <AuthHeading eyebrow={t("login.eyebrow")} title={t("login.title")} />

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
              aria-label={
                showPassword ? t("common.hidePassword") : t("common.showPassword")
              }
            >
              {showPassword ? (
                <EyeOffIcon className="h-[18px] w-[18px]" />
              ) : (
                <EyeIcon className="h-[18px] w-[18px]" />
              )}
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

      <AuthFootnote>
        {t("login.firstTime")}{" "}
        <Link to="/admin/register" className="text-brass-dark font-medium hover:underline">
          {t("login.registerInitial")}
        </Link>
      </AuthFootnote>
      <AuthFootnote>
        {t("login.joining")}{" "}
        <Link to="/admin/register-manager" className="text-brass-dark font-medium hover:underline">
          {t("login.registerManager")}
        </Link>
      </AuthFootnote>
    </AuthShell>
  );
}
