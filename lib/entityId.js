/**
 * Normalize API primary keys (bigint or UUID string) for URLs and cache keys.
 * Never use Number() on UUIDs — that yields NaN.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeEntityId(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return String(Math.trunc(value));
  }
  const trimmed = String(value).trim();
  if (trimmed === "" || trimmed === "NaN" || trimmed === "undefined") return null;
  return trimmed;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isPersistedEntityId(value) {
  return normalizeEntityId(value) != null;
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function entityIdsEqual(a, b) {
  const left = normalizeEntityId(a);
  const right = normalizeEntityId(b);
  if (left == null || right == null) return false;
  return left === right;
}
