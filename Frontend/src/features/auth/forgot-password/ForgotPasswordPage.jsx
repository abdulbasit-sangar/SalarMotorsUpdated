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
  validateForgotPasswordForm,
  validateOtpForm,
  validateResetPasswordForm,
  hasErrors,
} from "../../../shared/utils/validators.js";
import { parseApiError } from "../../../services/api/client.js";
import {
  forgotPassword as apiForgotPassword,
  resendOtp as apiResendOtp,
  verifyResetOtp as apiVerifyResetOtp,
  resetPassword as apiResetPassword,
} from "../../../services/auth/authApi.js";

const OTP_SECONDS = 60;
const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const toast = useToast();
  const navigate = useNavigate();

  // step: "email" -> "otp" -> "reset" -> "done"
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState(null);

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(OTP_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef(null);

  // Countdown for OTP expiry display — purely cosmetic, backend is the
  // real source of truth for expiration.
  useEffect(() => {
    if (step !== "otp") return undefined;
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

  const resetFieldError = (key) => {
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  // ── Step 1: request OTP ───────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    const errors = validateForgotPasswordForm({ email });
    setFieldErrors(errors);
    setFormError(null);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      await apiForgotPassword({ email: email.trim().toLowerCase() });
      toast.success(t("forgot.codeSent"));
      setStep("otp");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const parsed = parseApiError(err);
      setFormError(parsed.errors.length ? parsed.errors : [parsed.message]);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const errors = validateOtpForm({ otp });
    setFieldErrors(errors);
    setFormError(null);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      const token = await apiVerifyResetOtp({ email: email.trim().toLowerCase(), otp: otp.trim() });
      setResetToken(token);
      setStep("reset");
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
      await apiResendOtp({ email: email.trim().toLowerCase() });
      toast.success(t("forgot.resent"));
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

  // ── Step 3: reset password ────────────────────────────────────────────────
  const [resetForm, setResetForm] = useState({ newPassword: "", confirmPassword: "" });

  const updateResetField = (key) => (e) => {
    setResetForm((prev) => ({ ...prev, [key]: e.target.value }));
    resetFieldError(key);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const errors = validateResetPasswordForm(resetForm);
    setFieldErrors(errors);
    setFormError(null);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      await apiResetPassword({
        email: email.trim().toLowerCase(),
        resetToken,
        newPassword: resetForm.newPassword,
        confirmPassword: resetForm.confirmPassword,
      });
      setStep("done");
      toast.success(t("forgot.resetDone"));
    } catch (err) {
      const parsed = parseApiError(err);
      setFormError(parsed.errors.length ? parsed.errors : [parsed.message]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      {step === "email" && (
        <>
          <AuthHeading
            eyebrow={t("forgot.eyebrow")}
            title={t("forgot.title")}
            subtitle={t("forgot.subtitle")}
          />
          <AuthCardPanel>
            <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
              <AuthFormError messages={formError} />
              <Input
                label={t("common.email")}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  resetFieldError("email");
                }}
                error={fieldErrors.email}
              />
              <Button type="submit" variant="primary" className="w-full" loading={submitting}>
                {t("forgot.sendOtp")}
              </Button>
            </form>
          </AuthCardPanel>
          <AuthFootnote>
            {t("forgot.remembered")}{" "}
            <Link to="/admin/login" className="text-brass-dark font-medium hover:underline">
              {t("forgot.backToSignIn")}
            </Link>
          </AuthFootnote>
        </>
      )}

      {step === "otp" && (
        <>
          <AuthHeading
            eyebrow={t("forgot.eyebrow")}
            title={t("forgot.otpTitle")}
            subtitle={t("forgot.otpSubtitle", { email: isolateLtr(email) })}
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
                  resetFieldError("otp");
                }}
                error={fieldErrors.otp}
                className="text-center tracking-[0.5em] text-lg font-mono"
              />
              <p className="text-xs text-ash text-center">
                {t("forgot.expiresIn")}{" "}
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
                {t("forgot.verifyOtp")}
              </Button>

              <p className="text-center text-ash text-xs">
                {t("forgot.noCode")}{" "}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || submitting}
                  className="text-brass-dark font-medium hover:underline disabled:text-ash disabled:no-underline disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? t("forgot.resendIn", { seconds: resendCooldown })
                    : t("forgot.resend")}
                </button>
              </p>
            </form>
          </AuthCardPanel>
          <AuthFootnote>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setFormError(null);
                setOtp("");
              }}
              className="text-brass-dark font-medium hover:underline"
            >
              <span aria-hidden="true" className="inline-block rtl:-scale-x-100">
                ←
              </span>{" "}
              {t("forgot.differentEmail")}
            </button>
          </AuthFootnote>
        </>
      )}

      {step === "reset" && (
        <>
          <AuthHeading
            eyebrow={t("forgot.eyebrow")}
            title={t("forgot.resetTitle")}
          />
          <AuthCardPanel>
            <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
              <AuthFormError messages={formError} />
              <Input
                label={t("common.newPassword")}
                type="password"
                autoComplete="new-password"
                hint={
                  !fieldErrors.newPassword
                    ? t("forgot.passwordHint", { min: 8 })
                    : undefined
                }
                required
                value={resetForm.newPassword}
                onChange={updateResetField("newPassword")}
                error={fieldErrors.newPassword}
              />
              <Input
                label={t("common.confirmNewPassword")}
                type="password"
                autoComplete="new-password"
                required
                value={resetForm.confirmPassword}
                onChange={updateResetField("confirmPassword")}
                error={fieldErrors.confirmPassword}
              />
              <Button type="submit" variant="primary" className="w-full" loading={submitting}>
                {t("forgot.resetSubmit")}
              </Button>
            </form>
          </AuthCardPanel>
        </>
      )}

      {step === "done" && (
        <>
          <AuthHeading
            eyebrow={t("forgot.eyebrow")}
            title={t("forgot.doneTitle")}
            subtitle={t("forgot.doneSubtitle")}
          />
          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate("/admin/login", { replace: true })}
          >
            {t("forgot.goToSignIn")}
          </Button>
        </>
      )}
    </AuthShell>
  );
}
