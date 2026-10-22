// Pure (no i18n import) so it can be unit-tested in plain Node and scanned
// against the backend's messages. apiMessages.js uses it to translate.

export const EXACT = {
  "Invalid X-Device-Id header": "device",
  "Missing X-Device-Id header": "device",
  "Invalid or expired password reset request": "resetInvalid",
  "Invalid or expired verification code": "codeInvalid",
  "New password must be different from the current password": "passwordSame",
  "Search keyword is required": "keywordRequired",
  "This email is already verified. Please log in.": "alreadyVerified",
  "Too many attempts. Please request a new code.": "tooManyAttempts",
  "Validation failed": "validationFailed",
  "Access token has expired — please refresh": "sessionExpired",
  "Access token has expired": "sessionExpired",
  "Access token is missing": "sessionExpired",
  "Invalid access token": "sessionExpired",
  "Authentication required": "sessionExpired",
  "Invalid or expired refresh token": "sessionExpired",
  "Refresh token has been revoked": "sessionExpired",
  "Refresh token is missing": "sessionExpired",
  "Admin account not found": "sessionExpired",
  "Current password is incorrect": "currentPasswordWrong",
  "Invalid email or password": "invalidCredentials",
  "Admin account has been deactivated": "accountDeactivated",
  "This admin account has been deactivated": "accountDeactivated",
  "Admin already exists. Registration is disabled.": "registrationDisabled",
  "Invalid CSRF token": "csrf",
  "Invalid admin setup token": "setupTokenInvalid",
  "Please verify your email before logging in": "verifyEmailFirst",
  "You do not have permission to perform this action": "forbidden",
  "Admin not found": "adminNotFound",
  "Manager not found": "managerNotFound",
  "Car not found": "carNotFound",
  "Listing creation was not found": "listingRequestNotFound",
  "An account with this email already exists": "emailExists",
  "Listing changed while publishing. Please try again.": "listingChanged",
  "The idempotent listing result is unavailable": "listingResultUnavailable",
  "This Idempotency-Key was used for different data": "idempotencyMismatch",
  "This listing creation is already in progress": "listingInProgress",
  "ImageKit returned an incomplete upload result": "uploadIncomplete",
  "Could not reserve listing creation": "reserveFailed",
  "ImageKit upload timed out": "uploadTimeout",
  "Admin setup is disabled until ADMIN_SETUP_TOKEN is configured": "setupDisabled",
  "Image deletion is pending because ImageKit did not confirm cleanup":
    "imageDeletePending",
  "Listing deletion is pending because ImageKit cleanup did not complete":
    "listingDeletePending",
  "Reorder list must contain exactly the car's existing images": "reorderInvalid",
  "A valid Idempotency-Key is required to create a listing":
    "idempotencyKeyRequired",
  // Raised client-side by services/cars/carsApi.js (waitForCreationStatus)
  "Listing creation is taking longer than expected. Check Manage Listings before trying again.":
    "creationSlow",
};

// [regex, key, params-from-match]
export const PATTERNS = [
  [/^Upload at least (\d+) images to publish this listing\.$/, "imageMin", (m) => ({ count: Number(m[1]) })],
  [/^A car can have a maximum of (\d+) images$/, "imageMax", (m) => ({ count: Number(m[1]) })],
  [/^Provide between 1 and (\d+) images$/, "imageRange", (m) => ({ max: Number(m[1]) })],
  [
    /^This listing has (\d+) valid images?; (\d+) more (?:is|are) required \(minimum (\d+)\)\.$/,
    "imageMinDetail",
    (m) => ({ count: Number(m[1]), missing: Number(m[2]), min: Number(m[3]) }),
  ],
  [
    /^This listing already has (\d+) images? and you tried to add (\d+); only (\d+) more can be added\.$/,
    "imageMaxDetail",
    (m) => ({ current: Number(m[1]), adding: Number(m[2]), room: Number(m[3]) }),
  ],
  [/^Too many files\. Maximum is (\d+) images per car\.$/, "tooManyFiles", (m) => ({ count: Number(m[1]) })],
  [/^File too large\. Maximum size is (\d+)MB per image\.$/, "fileTooLarge", (m) => ({ size: Number(m[1]) })],
  [/^Invalid file type: /, "invalidFileType", () => ({})],
  [/^Unexpected field: /, "unexpectedField", () => ({})],
  [/^Invalid [^:]+: /, "invalidId", () => ({})],
  [/^Invalid value for field: /, "invalidValue", () => ({})],
  [/^(.+) '(.+)' already exists$/, "duplicateField", (m) => ({ field: m[1], value: m[2] })],
  [/^Route not found: /, "routeNotFound", () => ({})],
  [/^Too many requests/i, "rateLimited", () => ({})],
  [/^Manager account created, but the verification email could not be sent/, "managerEmailFailed", () => ({})],
  // The backend sends this as one long sentence; match on its opening.
  [/^We lost the connection to the database/, "dbConnection", () => ({})],
];

export const getApiMessageKey = (message) => {
  if (typeof message !== "string") return null;
  if (EXACT[message]) return EXACT[message];
  const hit = PATTERNS.find(([re]) => re.test(message));
  return hit ? hit[1] : null;
};

export const KNOWN_EXACT_MESSAGES = Object.keys(EXACT);
