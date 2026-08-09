/**
 * Shared dirty-check helpers for Settings forms (company profile / company settings).
 */

/**
 * @param {unknown} value
 * @returns {unknown}
 */
export function normalizeSettingsFieldValue(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return value;
}

/**
 * @param {Record<string, unknown>} current
 * @param {Record<string, unknown> | null | undefined} baseline
 * @param {string[]} keys
 */
export function areSettingsFormValuesDirty(current, baseline, keys) {
  if (!baseline) return false;
  for (const key of keys) {
    const left = normalizeSettingsFieldValue(current?.[key]);
    const right = normalizeSettingsFieldValue(baseline?.[key]);
    if (left !== right) return true;
  }
  return false;
}
