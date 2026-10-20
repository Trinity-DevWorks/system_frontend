/** @typedef {"draft" | "posted" | "reversed"} ProductionStatus */

export const PRODUCTION_STATUS_VALUES = /** @type {const} */ (["draft", "posted", "reversed"]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getProductionStatusLabel(t, status) {
  if (status === "draft") return t("prdStatusDraft");
  if (status === "posted") return t("prdStatusPosted");
  if (status === "reversed") return t("prdStatusReversed");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function isProductionDraft(status) {
  return status === "draft" || status == null;
}
