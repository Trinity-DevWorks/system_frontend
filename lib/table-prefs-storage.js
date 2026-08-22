import { getLocalPreferenceUserId } from "@/lib/local-preference-scope";

const PREFIX = "appDataTable:v2";
const LEGACY_PREFIX = "appDataTable:v1";

/**
 * @param {string} tableId
 * @param {string} field
 */
function scopedKey(tableId, field) {
  return `${PREFIX}:${getLocalPreferenceUserId()}:${tableId}:${field}`;
}

/**
 * @param {string} tableId
 * @param {string} field
 */
function legacyKey(tableId, field) {
  return `${LEGACY_PREFIX}:${tableId}:${field}`;
}

/**
 * @param {string} tableId
 * @param {string} field
 * @returns {string | null}
 */
function readPref(tableId, field) {
  if (typeof window === "undefined") return null;
  try {
    const scoped = window.localStorage.getItem(scopedKey(tableId, field));
    if (scoped != null) return scoped;
    const userId = getLocalPreferenceUserId();
    const legacy = window.localStorage.getItem(legacyKey(tableId, field));
    if (legacy == null) return null;
    if (userId !== "anon") {
      window.localStorage.setItem(scopedKey(tableId, field), legacy);
    }
    return legacy;
  } catch {
    return null;
  }
}

/**
 * @param {string} tableId
 * @param {string} field
 * @param {string} value
 */
function writePref(tableId, field, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(scopedKey(tableId, field), value);
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {string} tableId
 * @returns {string[]}
 */
export function loadHiddenColumnKeys(tableId) {
  try {
    const raw = readPref(tableId, "hiddenCols");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}

/**
 * @param {string} tableId
 * @param {string[]} keys
 */
export function saveHiddenColumnKeys(tableId, keys) {
  writePref(tableId, "hiddenCols", JSON.stringify(keys));
}

/**
 * @param {string} tableId
 * @returns {"comfortable" | "compact"}
 */
export function loadTableDensity(tableId) {
  const v = readPref(tableId, "density");
  return v === "compact" ? "compact" : "comfortable";
}

/**
 * @param {string} tableId
 * @param {"comfortable" | "compact"} density
 */
export function saveTableDensity(tableId, density) {
  writePref(tableId, "density", density);
}

/**
 * @param {string} tableId
 * @param {number[]} allowed  Valid page-size options to guard against stale/invalid saved values.
 * @param {number} fallback
 * @returns {number}
 */
export function loadPageSize(tableId, allowed, fallback) {
  const raw = readPref(tableId, "pageSize");
  if (!raw) return fallback;
  const parsed = Number(raw);
  return allowed.includes(parsed) ? parsed : fallback;
}

/**
 * @param {string} tableId
 * @param {number} size
 */
export function savePageSize(tableId, size) {
  writePref(tableId, "pageSize", String(size));
}

/**
 * Persisted order of draggable column ids (same namespace as hiddenCols).
 * @param {string} tableId
 * @returns {string[] | null}
 */
export function loadColumnOrder(tableId) {
  try {
    const raw = readPref(tableId, "columnOrder");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === "string") : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} tableId
 * @param {string[]} order
 */
export function saveColumnOrder(tableId, order) {
  writePref(tableId, "columnOrder", JSON.stringify(order));
}
