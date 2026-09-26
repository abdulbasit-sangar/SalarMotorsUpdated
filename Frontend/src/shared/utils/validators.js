const EMAIL_RE = /^\S+@\S+\.\S+$/;

export const validateLoginForm = ({ email, password }) => {
  const errors = {};
  if (!email?.trim()) errors.email = "Email is required";
  else if (!EMAIL_RE.test(email.trim())) errors.email = "Please provide a valid email address";

  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";

  return errors;
};

export const validateRegisterForm = ({ username, email, password }) => {
  const errors = {};
  if (!username?.trim()) errors.username = "Username is required";
  else if (username.trim().length < 3) errors.username = "Username must be at least 3 characters";
  else if (username.trim().length > 30) errors.username = "Username must not exceed 30 characters";

  if (!email?.trim()) errors.email = "Email is required";
  else if (!EMAIL_RE.test(email.trim())) errors.email = "Please provide a valid email address";

  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";

  return errors;
};

export const hasErrors = (errors) => Object.keys(errors).length > 0;

// ─── Manager registration (Manager/Sub-Admin RBAC) ────────────────────────────
export const validateManagerRegisterForm = ({ username, email, password, confirmPassword }) => {
  const errors = {};
  if (!username?.trim()) errors.username = "Username is required";
  else if (username.trim().length < 3) errors.username = "Username must be at least 3 characters";
  else if (username.trim().length > 30) errors.username = "Username must not exceed 30 characters";

  if (!email?.trim()) errors.email = "Email is required";
  else if (!EMAIL_RE.test(email.trim())) errors.email = "Please provide a valid email address";

  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";

  if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
  else if (password && confirmPassword !== password) errors.confirmPassword = "Passwords do not match";

  return errors;
};

// ─── Change password (Profile page) ───────────────────────────────────────────
export const validateChangePasswordForm = ({ currentPassword, newPassword, confirmPassword }) => {
  const errors = {};
  if (!currentPassword) errors.currentPassword = "Current password is required";

  if (!newPassword) errors.newPassword = "New password is required";
  else if (newPassword.length < 8) errors.newPassword = "New password must be at least 8 characters";

  if (!confirmPassword) errors.confirmPassword = "Please confirm your new password";
  else if (newPassword && confirmPassword !== newPassword) errors.confirmPassword = "Passwords do not match";

  return errors;
};

// ─── Forgot password (email step) ─────────────────────────────────────────────
export const validateForgotPasswordForm = ({ email }) => {
  const errors = {};
  if (!email?.trim()) errors.email = "Email is required";
  else if (!EMAIL_RE.test(email.trim())) errors.email = "Please provide a valid email address";
  return errors;
};

// ─── OTP verification step ─────────────────────────────────────────────────────
export const validateOtpForm = ({ otp }) => {
  const errors = {};
  if (!otp?.trim()) errors.otp = "Verification code is required";
  else if (!/^\d{6}$/.test(otp.trim())) errors.otp = "Verification code must be 6 digits";
  return errors;
};

// ─── Reset password step ───────────────────────────────────────────────────────
export const validateResetPasswordForm = ({ newPassword, confirmPassword }) => {
  const errors = {};
  if (!newPassword) errors.newPassword = "New password is required";
  else if (newPassword.length < 8) errors.newPassword = "New password must be at least 8 characters";

  if (!confirmPassword) errors.confirmPassword = "Please confirm your new password";
  else if (newPassword && confirmPassword !== newPassword) errors.confirmPassword = "Passwords do not match";

  return errors;
};

const currentYear = new Date().getFullYear();

// Mirrors backend/constants/car.constants.js MIN_CAR_YEAR — kept in sync
// manually since this file has no access to the backend module. Update
// both together if the minimum ever changes.
const MIN_CAR_YEAR = 2005;

/**
 * Mirrors validators/car.validator.js createCarSchema — required fields are
 * enforced client-side; optional fields are only checked if the person
 * actually filled them in.
 */
export const validateCarForm = (values) => {
  const errors = {};

  if (!values.title?.trim()) errors.title = "Title is required";
  else if (values.title.trim().length > 150) errors.title = "Title must not exceed 150 characters";

  if (!values.brand?.trim()) errors.brand = "Brand is required";
  if (!values.model?.trim()) errors.model = "Model is required";

  if (!values.year) errors.year = "Year is required";
  else if (values.year < MIN_CAR_YEAR) errors.year = `Year must be ${MIN_CAR_YEAR} or later`;
  else if (values.year > currentYear + 1) errors.year = "Year cannot be in the future";

  if (values.price === "" || values.price === null || values.price === undefined) {
    errors.price = "Price is required";
  } else if (Number(values.price) < 0) {
    errors.price = "Price cannot be negative";
  }

  if (!values.province?.trim()) errors.province = "Location is required";
  if (!values.steeringType) errors.steeringType = "Steering type is required";

  if (values.mileage !== "" && values.mileage !== undefined && Number(values.mileage) < 0) {
    errors.mileage = "Mileage cannot be negative";
  }
  if (values.engineCC !== "" && values.engineCC !== undefined && Number(values.engineCC) < 0) {
    errors.engineCC = "Engine CC cannot be negative";
  }
  if (values.description && values.description.length > 2000) {
    errors.description = "Description must not exceed 2000 characters";
  }

  return errors;
};
