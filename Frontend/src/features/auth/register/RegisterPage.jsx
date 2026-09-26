import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { validateRegisterForm, hasErrors } from "../../../shared/utils/validators.js";
import { parseApiError } from "../../../services/api/client.js";

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [alreadySetUp, setAlreadySetUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateRegisterForm(form);
    setFieldErrors(errors);
    setFormError(null);
    setAlreadySetUp(false);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      await register(form);
      toast.success("Admin account created.");
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      const parsed = parseApiError(err);
      // Backend enforces one-time registration — status 403 with this message
      // means an admin already exists, so point the person to Login instead
      // of just showing a generic error.
      if (parsed.status === 403) {
        setAlreadySetUp(true);
      }
      setFormError(parsed.errors.length ? parsed.errors : [parsed.message]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <AuthHeading
        eyebrow="First-Time Setup"
        title="Create Admin"
        subtitle="This one-time form creates the initial admin account for this AutoMarket instance."
      />

      <AuthCardPanel>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthFormError messages={formError}>
            {alreadySetUp && (
              <p className="text-danger text-sm mt-1">
                <Link to="/admin/login" className="underline font-medium">
                  Go to the login page instead →
                </Link>
              </p>
            )}
          </AuthFormError>

          <Input
            label="Username"
            autoComplete="username"
            required
            value={form.username}
            onChange={updateField("username")}
            error={fieldErrors.username}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={updateField("email")}
            error={fieldErrors.email}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            hint={!fieldErrors.password ? "At least 8 characters." : undefined}
            required
            value={form.password}
            onChange={updateField("password")}
            error={fieldErrors.password}
          />

          <Button type="submit" variant="primary" className="w-full" loading={submitting}>
            Create Admin Account
          </Button>
        </form>
      </AuthCardPanel>

      <AuthFootnote>
        Already set up?{" "}
        <Link to="/admin/login" className="text-brass-dark font-medium hover:underline">
          Sign in
        </Link>
      </AuthFootnote>
    </AuthShell>
  );
}
