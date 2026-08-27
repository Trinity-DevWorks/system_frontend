/** @typedef {"draft" | "posted"} OpeningStockStatus */

export const OPENING_STOCK_STATUS_VALUES = /** @type {const} */ (["draft", "posted"]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getOpeningStockStatusLabel(t, status) {
  if (status === "draft") return t("osStatusDraft");
  if (status === "posted") return t("osStatusPosted");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function isOpeningStockDraft(status) {
  return status === "draft" || status == null;
}
