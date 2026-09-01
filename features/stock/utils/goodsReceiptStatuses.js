/** @typedef {"draft" | "posted"} GoodsReceiptStatus */

export const GOODS_RECEIPT_STATUS_VALUES = /** @type {const} */ (["draft", "posted"]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getGoodsReceiptStatusLabel(t, status) {
  if (status === "draft") return t("grnStatusDraft");
  if (status === "posted") return t("grnStatusPosted");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function isGoodsReceiptDraft(status) {
  return status === "draft" || status == null;
}

/**
 * @param {string | null | undefined} status
 */
export function isGoodsReceiptPosted(status) {
  return status === "posted";
}
