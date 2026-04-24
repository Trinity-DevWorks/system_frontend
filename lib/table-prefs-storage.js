const PREFIX = "appDataTable:v1";

/**
 * @param {string} tableId
 * @returns {string[]}
 */
export function loadHiddenColumnKeys(tableId) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${PREFIX}:${tableId}:hiddenCols`);
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
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PREFIX}:${tableId}:hiddenCols`, JSON.stringify(keys));
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {string} tableId
 * @returns {"comfortable" | "compact"}
 */
export function loadTableDensity(tableId) {
  if (typeof window === "undefined") return "comfortable";
  try {
    const v = window.localStorage.getItem(`${PREFIX}:${tableId}:density`);
    return v === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable";
  }
}

/**
 * @param {string} tableId
 * @param {"comfortable" | "compact"} density
 */
export function saveTableDensity(tableId, density) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PREFIX}:${tableId}:density`, density);
  } catch {
    /* ignore */
  }
}

/**
 * Persisted order of draggable column ids (same namespace as hiddenCols).
 * @param {string} tableId
 * @returns {string[] | null}
 */
export function loadColumnOrder(tableId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}:${tableId}:columnOrder`);
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
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PREFIX}:${tableId}:columnOrder`, JSON.stringify(order));
  } catch {
    /* ignore quota */
  }
}
