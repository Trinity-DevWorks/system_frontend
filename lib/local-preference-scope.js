const USER_ID_KEY = "tenant.local-prefs.user-id";
export const LOCAL_PREFERENCE_USER_EVENT = "tenant-prefs-user-id";

/** @type {string | null} */
let memoryUserId = null;

/**
 * @param {unknown} me
 * @returns {string | null}
 */
export function localPreferenceUserIdFromMe(me) {
  if (!me || typeof me !== "object") return null;
  const id = /** @type {{ id?: unknown }} */ (me).id;
  if (id == null || id === "") return null;
  return String(id);
}

function emitUserIdChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOCAL_PREFERENCE_USER_EVENT));
}

/**
 * Persist the signed-in user id so table prefs / bookmarks are scoped.
 *
 * @param {unknown} me
 */
export function syncLocalPreferenceUserId(me) {
  if (typeof window === "undefined") return;
  const id = localPreferenceUserIdFromMe(me);
  if (!id) return;
  memoryUserId = id;
  try {
    window.localStorage.setItem(USER_ID_KEY, id);
  } catch {
    /* ignore quota */
  }
  emitUserIdChange();
}

export function clearLocalPreferenceUserId() {
  memoryUserId = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(USER_ID_KEY);
  } catch {
    /* ignore */
  }
  emitUserIdChange();
}

/**
 * @returns {string}
 */
export function getLocalPreferenceUserId() {
  if (memoryUserId) return memoryUserId;
  if (typeof window === "undefined") return "anon";
  try {
    const stored = window.localStorage.getItem(USER_ID_KEY);
    if (stored && stored.trim()) {
      memoryUserId = stored.trim();
      return memoryUserId;
    }
  } catch {
    /* ignore */
  }
  return "anon";
}
