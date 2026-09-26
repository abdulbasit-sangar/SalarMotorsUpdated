/**
 * getDeviceId — returns a random, anonymous per-browser identifier used to
 * scope Favorites (see Backend/src/models/favorite.model.js for the full
 * rationale: this project has no public customer accounts, only Admin/
 * Manager auth, so favorites are tied to a device rather than a login).
 *
 * The ID itself carries no personal information — it's a random UUID,
 * generated once and persisted in localStorage so it survives refreshes
 * and repeat visits. It is sent as the `X-Device-Id` header on every
 * request (see services/api/client.js) and is the lookup key the backend
 * uses to persist favorites server-side — never a substitute for real
 * authentication.
 */
const STORAGE_KEY = "salarmotors_device_id";

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (older browsers).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

let cachedId = null;

export const getDeviceId = () => {
  if (cachedId) return cachedId;

  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    cachedId = id;
    return id;
  } catch {
    // Storage unavailable (e.g. privacy mode) — fall back to an in-memory
    // ID for this session only; favorites just won't persist across reloads.
    cachedId = generateId();
    return cachedId;
  }
};
