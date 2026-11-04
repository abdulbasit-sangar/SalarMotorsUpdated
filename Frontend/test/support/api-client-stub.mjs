// Stub for ../../services/api/client.js (the real one needs a browser
// build env). Matches the real parseApiError return shape.
export const parseApiError = (error) => ({
  message: error?.message || "unexpected",
  errors: [],
  status: null,
});
