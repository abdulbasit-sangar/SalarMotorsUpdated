import { useCallback, useEffect, useRef, useState } from "react";

const DB_NAME = "safar-drafts";
const STORE_NAME = "create-listing-images";

const keyFor = (userKey) => `images:${userKey}`;

// Minimal promise wrapper around IndexedDB — the only browser storage that
// can hold File/Blob objects natively (structured clone), with quota far
// beyond sessionStorage's ~5MB. File objects can NOT be JSON-serialized,
// which is why the text-field draft (useDraftForm) uses sessionStorage
// while images need this hook.
function openDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("indexeddb-unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise = null;
const getDb = () => {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
};

async function idbSet(key, value) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDel(key) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const isRestorableFile = (f) =>
  f instanceof File && Number(f.size) > 0 && typeof f.name === "string";

/**
 * Persists the selected listing images across navigation, same idea as
 * useDraftForm but for File objects.
 *
 * Images are stored per user (`userKey`) in IndexedDB, so a manager and a
 * superadmin on the same device never see each other's images. Restored
 * entries are genuine File objects (name/type/size intact), so
 * ImageUploader previews, countSelectableFiles, and the createCar upload
 * all behave exactly as if the files had just been selected.
 *
 * Returns [images, setImages, clearImages]. Call clearImages() after a
 * successful submit (and on explicit cancel) alongside clearDraft().
 */
export function useDraftImages(userKey) {
  const storageKey = userKey ? keyFor(userKey) : null;

  const [images, setImages] = useState([]);
  // Same per-key hydration tracking as useDraftForm: if the signed-in user
  // changes mid-session, the NEW user's images load instead of the old
  // user's files being written into the new user's slot.
  const [hydratedKey, setHydratedKey] = useState(null);
  const writeTimer = useRef(null);

  useEffect(
    () => () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    },
    [],
  );

  // Restore once the user identity is known (and re-restore if it changes).
  useEffect(() => {
    if (!storageKey || hydratedKey === storageKey) return;
    let cancelled = false;
    idbGet(storageKey)
      .then((stored) => {
        if (cancelled) return;
        const files = Array.isArray(stored)
          ? stored.filter(isRestorableFile)
          : [];
        setImages(files);
        setHydratedKey(storageKey);
      })
      .catch(() => {
        // IndexedDB unavailable — the uploader still works in memory.
        if (!cancelled) setHydratedKey(storageKey);
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey, hydratedKey]);

  // Persist on change (debounced). Skipped until this key's stored images
  // have been restored, so an empty selection can never wipe them.
  useEffect(() => {
    if (!storageKey || hydratedKey !== storageKey) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      idbSet(storageKey, images.filter(isRestorableFile)).catch(() => {
        // Quota exceeded or unavailable — the form still works in memory.
      });
    }, 400);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [images, storageKey, hydratedKey]);

  const clearImages = useCallback(() => {
    setImages([]);
    if (!storageKey) return;
    idbDel(storageKey).catch(() => {
      // ignore
    });
  }, [storageKey]);

  return [images, setImages, clearImages];
}
