import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isolateLtr } from "../../../shared/utils/format.js";
import { Link, useNavigate } from "react-router-dom";
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
  validateManagerRegisterForm,
  validateOtpForm,
  hasErrors,
} from "../../../shared/utils/validators.js";
import { parseApiError } from "../../../services/api/client.js";
import {
  registerManager as apiRegisterManager,
  verifyManagerEmail as apiVerifyManagerEmail,
  resendManagerVerificationOtp as apiResendManagerVerificationOtp,
} from "../../../services/auth/authApi.js";

const OTP_SECONDS = 60;
const RESEND_COOLDOWN_SECONDS = 60;

// Manager/Sub-Admin RBAC — self-registration is a two-step flow: submit
// account details, then confirm ownership of the email via OTP before the
// account can log in. This mirrors ForgotPasswordPage.jsx's step pattern
// and OTP UI so it feels like a natural extension of the existing app.
export default function ManagerRegisterPage() {
  const { t } = useTranslation("auth");
  const toast = useToast();
  const navigate = useNavigate();

  // step: "register" -> "verify" -> "done"
  const [step, setStep] = useState("register");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(OTP_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (step !== "verify") return undefined;
    setSecondsLeft(OTP_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const id = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const formatTime = (totalSeconds) => {
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const updateField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  // ── Step 1: register ──────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    const errors = validateManagerRegisterForm(form);
    setFieldErrors(errors);
    setFormError(null);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      await apiRegisterManager(form);
      toast.success(t("manager.created"));
      setStep("verify");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const parsed = parseApiError(err);
      setFormError(parsed.errors.length ? parsed.errors : [parsed.message]);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 2: verify email OTP ──────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const errors = validateOtpForm({ otp });
    setFieldErrors(errors);
    setFormError(null);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      await apiVerifyManagerEmail({ email: form.email.trim().toLowerCase(), otp: otp.trim() });
      setStep("done");
      toast.success(t("manager.verified"));
    } catch (err) {
      const parsed = parseApiError(err);
      setFormError(parsed.errors.length ? parsed.errors : [parsed.message]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await apiResendManagerVerificationOtp({ email: form.email.trim().toLowerCase() });
      toast.success(t("manager.resent"));
      setOtp("");
      setSecondsLeft(OTP_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const parsed = parseApiError(err);
      setFormError(parsed.errors.length ? parsed.errors : [parsed.message]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      {step === "register" && (
        <>
          <AuthHeading
            eyebrow={t("manager.eyebrow")}
            title={t("manager.title")}
            subtitle={t("manager.subtitle")}
          />
          <AuthCardPanel>
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <AuthFormError messages={formError} />
              <Input
                label={t("common.username")}
                autoComplete="username"
                required
                value={form.username}
                onChange={updateField("username")}
                error={fieldErrors.username}
              />
              <Input
                label={t("common.email")}
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={updateField("email")}
                error={fieldErrors.email}
              />
              <Input
                label={t("common.password")}
                type="password"
                autoComplete="new-password"
                hint={
                  !fieldErrors.password
                    ? t("manager.passwordHint", { min: 8 })
                    : undefined
                }
                required
                value={form.password}
                onChange={updateField("password")}
                error={fieldErrors.password}
              />
              <Input
                label={t("common.confirmPassword")}
                type="password"
                autoComplete="new-password"
                required
                value={form.confirmPassword}
                onChange={updateField("confirmPassword")}
                error={fieldErrors.confirmPassword}
              />

              <Button type="submit" variant="primary" className="w-full" loading={submitting}>
                {t("manager.submit")}
              </Button>
            </form>
          </AuthCardPanel>
          <AuthFootnote>
            {t("manager.alreadyVerified")}{" "}
            <Link to="/admin/login" className="text-brass-dark font-medium hover:underline">
              {t("manager.signIn")}
            </Link>
          </AuthFootnote>
        </>
      )}

      {step === "verify" && (
        <>
          <AuthHeading
            eyebrow={t("manager.eyebrow")}
            title={t("manager.verifyTitle")}
            subtitle={t("manager.verifySubtitle", {
              email: isolateLtr(form.email),
            })}
          />
          <AuthCardPanel>
            <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
              <AuthFormError messages={formError} />
              <Input
                label={t("common.verificationCode")}
                dir="ltr"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                required
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setFieldErrors((prev) => ({ ...prev, otp: undefined }));
                }}
                error={fieldErrors.otp}
                className="text-center tracking-[0.5em] text-lg font-mono"
              />
              <p className="text-xs text-ash text-center">
                {t("manager.expiresIn")}{" "}
                <span
                  className={
                    secondsLeft === 0
                      ? "ltr-isolate text-danger font-mono"
                      : "ltr-isolate text-bone font-mono"
                  }
                >
                  {formatTime(secondsLeft)}
                </span>
              </p>

              <Button type="submit" variant="primary" className="w-full" loading={submitting}>
                {t("common.verifyEmail")}
              </Button>

              <p className="text-center text-ash text-xs">
                {t("manager.noCode")}{" "}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || submitting}
                  className="text-brass-dark font-medium hover:underline disabled:text-ash disabled:no-underline disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? t("manager.resendIn", { seconds: resendCooldown })
                    : t("manager.resend")}
                </button>
              </p>
            </form>
          </AuthCardPanel>
        </>
      )}

      {step === "done" && (
        <>
          <AuthHeading
            eyebrow={t("manager.eyebrow")}
            title={t("manager.doneTitle")}
            subtitle={t("manager.doneSubtitle")}
          />
          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate("/admin/login", { replace: true })}
          >
            {t("manager.goToSignIn")}
          </Button>
        </>
      )}
    </AuthShell>
  );
}
