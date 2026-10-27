/** @typedef {"draft" | "posted" | "reversed"} StockRevaluationStatus */

export const STOCK_REVALUATION_STATUS_VALUES = /** @type {const} */ (["draft", "posted", "reversed"]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getStockRevaluationStatusLabel(t, status) {
  if (status === "draft") return t("srvStatusDraft");
  if (status === "posted") return t("srvStatusPosted");
  if (status === "reversed") return t("srvStatusReversed");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function isStockRevaluationDraft(status) {
  return status === "draft" || status == null;
}
