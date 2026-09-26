import { ApiError } from "../utils/apiHelpers.js";

export const requireSetupToken = (req, res, next) => {
  const configuredToken = process.env.ADMIN_SETUP_TOKEN;
  const suppliedToken = req.headers["x-admin-setup-token"];

  if (!configuredToken) {
    return next(
      new ApiError(
        503,
        "Admin setup is disabled until ADMIN_SETUP_TOKEN is configured",
      ),
    );
  }

  if (typeof suppliedToken !== "string" || suppliedToken !== configuredToken) {
    return next(new ApiError(403, "Invalid admin setup token"));
  }

  next();
};
