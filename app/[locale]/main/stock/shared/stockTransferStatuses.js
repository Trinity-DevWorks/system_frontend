/** @typedef {"draft" | "posted" | "cancelled"} StockTransferStatus */

export const STOCK_TRANSFER_STATUS_VALUES = /** @type {const} */ ([
  "draft",
  "posted",
  "cancelled",
]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getStockTransferStatusLabel(t, status) {
  if (status === "draft") return t("transferStatusDraft");
  if (status === "posted") return t("transferStatusPosted");
  if (status === "cancelled") return t("transferStatusCancelled");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function isStockTransferDraft(status) {
  return status === "draft" || status == null;
}
