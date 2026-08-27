/** @typedef {"draft" | "posted"} StockCountStatus */

export const STOCK_COUNT_STATUS_VALUES = /** @type {const} */ (["draft", "posted"]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getStockCountStatusLabel(t, status) {
  if (status === "draft") return t("cntStatusDraft");
  if (status === "posted") return t("cntStatusPosted");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function isStockCountDraft(status) {
  return status === "draft" || status == null;
}
