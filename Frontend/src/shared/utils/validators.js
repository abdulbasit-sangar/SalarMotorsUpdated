import i18n from "../../i18n/index.js";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// All messages come from locales/*/validation.json and are translated when
// the form is validated (i.e. in the language active at submit time).
const tv = (key, params) => i18n.t(key, { ns: "validation", ...params });

export const validateLoginForm = ({ email, password }) => {
  const errors = {};
  if (!email?.trim()) errors.email = tv("email.required");
  else if (!EMAIL_RE.test(email.trim()))
    errors.email = tv("email.invalid");

  if (!password) errors.password = tv("password.required");
  else if (password.length < 8)
    errors.password = tv("password.min", { min: 8 });

  return errors;
};

export const validateRegisterForm = ({ username, email, password }) => {
  const errors = {};
  if (!username?.trim()) errors.username = tv("username.required");
  else if (username.trim().length < 3)
    errors.username = tv("username.min", { min: 3 });
  else if (username.trim().length > 30)
    errors.username = tv("username.max", { max: 30 });

  if (!email?.trim()) errors.email = tv("email.required");
  else if (!EMAIL_RE.test(email.trim()))
    errors.email = tv("email.invalid");

  if (!password) errors.password = tv("password.required");
  else if (password.length < 8)
    errors.password = tv("password.min", { min: 8 });

  return errors;
};

export const hasErrors = (errors) => Object.keys(errors).length > 0;

// ─── Manager registration (Manager/Sub-Admin RBAC) ────────────────────────────
export const validateManagerRegisterForm = ({
  username,
  email,
  password,
  confirmPassword,
}) => {
  const errors = {};
  if (!username?.trim()) errors.username = tv("username.required");
  else if (username.trim().length < 3)
    errors.username = tv("username.min", { min: 3 });
  else if (username.trim().length > 30)
    errors.username = tv("username.max", { max: 30 });

  if (!email?.trim()) errors.email = tv("email.required");
  else if (!EMAIL_RE.test(email.trim()))
    errors.email = tv("email.invalid");

  if (!password) errors.password = tv("password.required");
  else if (password.length < 8)
    errors.password = tv("password.min", { min: 8 });

  if (!confirmPassword) errors.confirmPassword = tv("confirmPassword.required");
  else if (password && confirmPassword !== password)
    errors.confirmPassword = tv("confirmPassword.mismatch");

  return errors;
};

// ─── Change password (Profile page) ───────────────────────────────────────────
export const validateChangePasswordForm = ({
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  const errors = {};
  if (!currentPassword) errors.currentPassword = tv("currentPassword.required");

  if (!newPassword) errors.newPassword = tv("newPassword.required");
  else if (newPassword.length < 8)
    errors.newPassword = tv("newPassword.min", { min: 8 });

  if (!confirmPassword)
    errors.confirmPassword = tv("confirmNewPassword.required");
  else if (newPassword && confirmPassword !== newPassword)
    errors.confirmPassword = tv("confirmPassword.mismatch");

  return errors;
};

// ─── Forgot password (email step) ─────────────────────────────────────────────
export const validateForgotPasswordForm = ({ email }) => {
  const errors = {};
  if (!email?.trim()) errors.email = tv("email.required");
  else if (!EMAIL_RE.test(email.trim()))
    errors.email = tv("email.invalid");
  return errors;
};

// ─── OTP verification step ─────────────────────────────────────────────────────
export const validateOtpForm = ({ otp }) => {
  const errors = {};
  if (!otp?.trim()) errors.otp = tv("otp.required");
  else if (!/^\d{6}$/.test(otp.trim()))
    errors.otp = tv("otp.digits", { count: 6 });
  return errors;
};

// ─── Reset password step ───────────────────────────────────────────────────────
export const validateResetPasswordForm = ({ newPassword, confirmPassword }) => {
  const errors = {};
  if (!newPassword) errors.newPassword = tv("newPassword.required");
  else if (newPassword.length < 8)
    errors.newPassword = tv("newPassword.min", { min: 8 });

  if (!confirmPassword)
    errors.confirmPassword = tv("confirmNewPassword.required");
  else if (newPassword && confirmPassword !== newPassword)
    errors.confirmPassword = tv("confirmPassword.mismatch");

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

  if (!values.title?.trim()) errors.title = tv("car.title.required");
  else if (values.title.trim().length > 150)
    errors.title = tv("car.title.max", { max: 150 });

  if (!values.brand?.trim()) errors.brand = tv("car.brand.required");
  if (!values.model?.trim()) errors.model = tv("car.model.required");

  if (!values.year) errors.year = tv("car.year.required");
  else if (values.year < MIN_CAR_YEAR)
    errors.year = tv("car.year.min", { min: MIN_CAR_YEAR });
  else if (values.year > currentYear + 1)
    errors.year = tv("car.year.future");

  if (
    values.price === "" ||
    values.price === null ||
    values.price === undefined
  ) {
    errors.price = tv("car.price.required");
  } else if (Number(values.price) < 0) {
    errors.price = tv("car.price.negative");
  }

  if (!values.province?.trim()) errors.province = tv("car.province.required");

  if (
    values.mileage !== "" &&
    values.mileage !== undefined &&
    Number(values.mileage) < 0
  ) {
    errors.mileage = tv("car.mileage.negative");
  }
  if (
    values.engineCC !== "" &&
    values.engineCC !== undefined &&
    Number(values.engineCC) < 0
  ) {
    errors.engineCC = tv("car.engineCC.negative");
  }
  if (values.description && values.description.length > 2000) {
    errors.description = tv("car.description.max", { max: 2000 });
  }

  return errors;
};
