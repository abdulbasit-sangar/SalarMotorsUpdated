import { useEffect, useRef, useState } from "react";
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
      toast.success("If an account exists for this email, a verification code has been sent.");
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
      toast.success("A new verification code has been sent.");
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
      toast.success("Password reset successfully.");
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
            eyebrow="Admin Access"
            title="Forgot Password"
            subtitle="Enter your registered email and we'll send you a verification code."
          />
          <AuthCardPanel>
            <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
              <AuthFormError messages={formError} />
              <Input
                label="Email"
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
                Send OTP
              </Button>
            </form>
          </AuthCardPanel>
          <AuthFootnote>
            Remembered your password?{" "}
            <Link to="/admin/login" className="text-brass-dark font-medium hover:underline">
              Back to Sign In
            </Link>
          </AuthFootnote>
        </>
      )}

      {step === "otp" && (
        <>
          <AuthHeading
            eyebrow="Admin Access"
            title="Enter Verification Code"
            subtitle={`We sent a verification code to ${email}.`}
          />
          <AuthCardPanel>
            <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
              <AuthFormError messages={formError} />
              <Input
                label="Verification Code"
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
                Code expires in:{" "}
                <span className={secondsLeft === 0 ? "text-danger font-mono" : "text-bone font-mono"}>
                  {formatTime(secondsLeft)}
                </span>
              </p>

              <Button type="submit" variant="primary" className="w-full" loading={submitting}>
                Verify OTP
              </Button>

              <p className="text-center text-ash text-xs">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || submitting}
                  className="text-brass-dark font-medium hover:underline disabled:text-ash disabled:no-underline disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : "Resend OTP"}
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
              ← Use a different email
            </button>
          </AuthFootnote>
        </>
      )}

      {step === "reset" && (
        <>
          <AuthHeading eyebrow="Admin Access" title="Reset Password" />
          <AuthCardPanel>
            <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
              <AuthFormError messages={formError} />
              <Input
                label="New Password"
                type="password"
                autoComplete="new-password"
                hint={!fieldErrors.newPassword ? "At least 8 characters." : undefined}
                required
                value={resetForm.newPassword}
                onChange={updateResetField("newPassword")}
                error={fieldErrors.newPassword}
              />
              <Input
                label="Confirm New Password"
                type="password"
                autoComplete="new-password"
                required
                value={resetForm.confirmPassword}
                onChange={updateResetField("confirmPassword")}
                error={fieldErrors.confirmPassword}
              />
              <Button type="submit" variant="primary" className="w-full" loading={submitting}>
                Reset Password
              </Button>
            </form>
          </AuthCardPanel>
        </>
      )}

      {step === "done" && (
        <>
          <AuthHeading
            eyebrow="Admin Access"
            title="Password Reset"
            subtitle="Your password has been reset successfully. Please log in with your new password."
          />
          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate("/admin/login", { replace: true })}
          >
            Go to Sign In
          </Button>
        </>
      )}
    </AuthShell>
  );
}
