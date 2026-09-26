/** @typedef {"draft" | "in_transit" | "partially_received" | "received" | "cancelled"} StockTransferStatus */

export const STOCK_TRANSFER_STATUS_VALUES = /** @type {const} */ ([
  "draft",
  "in_transit",
  "partially_received",
  "received",
  "cancelled",
]);

/**
 * @param {string | null | undefined} status
 */
export function getStockTransferStatusTagColor(status) {
  if (status === "received") return "success";
  if (status === "in_transit" || status === "partially_received") return "warning";
  if (status === "cancelled") return "default";
  return "processing";
}
/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getStockTransferStatusLabel(t, status) {
  if (status === "draft") return t("transferStatusDraft");
  if (status === "in_transit") return t("transferStatusInTransit");
  if (status === "partially_received") return t("transferStatusPartiallyReceived");
  if (status === "received") return t("transferStatusReceived");
  if (status === "cancelled") return t("transferStatusCancelled");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function isStockTransferDraft(status) {
  return status === "draft" || status == null;
}

/**
 * @param {string | null | undefined} status
 */
export function isStockTransferInTransit(status) {
  return status === "in_transit";
}

/**
 * @param {string | null | undefined} status
 */
export function isStockTransferReceivable(status) {
  return status === "in_transit" || status === "partially_received";
}

/**
 * @param {string | null | undefined} status
 */
export function isStockTransferDispatchable(status) {
  return status === "draft";
}

/**
 * @param {string | null | undefined} status
 */
export function isStockTransferCancellable(status) {
  return status === "in_transit";
}
