/** @typedef {"draft" | "posted" | "reversed"} StockCountStatus */

export const STOCK_COUNT_STATUS_VALUES = /** @type {const} */ (["draft", "posted", "reversed"]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getStockCountStatusLabel(t, status) {
  if (status === "draft") return t("cntStatusDraft");
  if (status === "posted") return t("cntStatusPosted");
  if (status === "reversed") return t("cntStatusReversed");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function isStockCountDraft(status) {
  return status === "draft" || status == null;
}
