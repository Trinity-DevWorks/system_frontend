/** @typedef {"draft" | "posted"} StockAdjustmentStatus */

export const STOCK_ADJUSTMENT_STATUS_VALUES = /** @type {const} */ (["draft", "posted"]);

export const STOCK_ADJUSTMENT_REASON_DIRECTIONS = /** @type {const} */ (["increase", "decrease", "both"]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getStockAdjustmentStatusLabel(t, status) {
  if (status === "draft") return t("adjStatusDraft");
  if (status === "posted") return t("adjStatusPosted");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function isStockAdjustmentDraft(status) {
  return status === "draft" || status == null;
}

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} direction
 */
export function getAdjustmentReasonDirectionLabel(t, direction) {
  if (direction === "increase") return t("adjReasonDirectionIncrease");
  if (direction === "decrease") return t("adjReasonDirectionDecrease");
  if (direction === "both") return t("adjReasonDirectionBoth");
  return direction ? String(direction) : "\u2014";
}
