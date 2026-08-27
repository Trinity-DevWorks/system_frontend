/** @typedef {"draft" | "posted"} BundleExplosionStatus */

export const BUNDLE_EXPLOSION_STATUS_VALUES = /** @type {const} */ (["draft", "posted"]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getBundleExplosionStatusLabel(t, status) {
  if (status === "draft") return t("bexStatusDraft");
  if (status === "posted") return t("bexStatusPosted");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function isBundleExplosionDraft(status) {
  return status === "draft" || status == null;
}
