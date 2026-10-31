import { useCallback, useEffect, useState } from "react";

const DRAFT_PREFIX = "safar:create-listing-draft";

const readDraft = (key, initial) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    // Merge over the initial shape so a draft saved by an older form
    // version never injects unknown keys or drops new ones.
    return {
      ...initial,
      ...parsed,
      features: Array.isArray(parsed.features) ? parsed.features : [],
    };
  } catch {
    return null;
  }
};

/**
 * Persists a JSON-safe form object to sessionStorage so navigating away
 * from the page and coming back restores everything the user typed.
 *
 * Drafts are namespaced per user (`userKey`), so a manager and a
 * superadmin on the same device never see each other's drafts.
 * File objects (e.g. selected images) are NOT JSON-serializable and are
 * therefore never persisted — only plain field values survive.
 *
 * Returns [form, setForm, clearDraft]. Call clearDraft() after a
 * successful submit (and on explicit cancel) so a stale draft doesn't
 * reappear on the next visit.
 */
export function useDraftForm(initial, userKey) {
  const storageKey = userKey ? `${DRAFT_PREFIX}:${userKey}` : null;

  const [form, setForm] = useState(initial);
  // The key whose stored draft has already been loaded into `form`.
  // Tracked per key (not a plain boolean) so that if the signed-in user
  // changes mid-session, the NEW user's draft is loaded instead of the
  // old user's values being written into the new user's slot.
  const [hydratedKey, setHydratedKey] = useState(null);

  // Restore once the user identity is known (and re-restore if it changes).
  useEffect(() => {
    if (!storageKey) return;
    if (hydratedKey === storageKey) return;
    setForm(readDraft(storageKey, initial) ?? initial);
    setHydratedKey(storageKey);
    // `initial` is a module-level constant; re-reading it is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, hydratedKey]);

  // Persist on change (debounced). Skipped until this key's stored draft
  // has been restored, so the empty initial form can never overwrite it.
  useEffect(() => {
    if (!storageKey || hydratedKey !== storageKey) return;
    const id = setTimeout(() => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(form));
      } catch {
        // Storage full or unavailable — the form still works in memory.
      }
    }, 250);
    return () => clearTimeout(id);
  }, [form, storageKey, hydratedKey]);

  const clearDraft = useCallback(() => {
    if (!storageKey) return;
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return [form, setForm, clearDraft];
}
