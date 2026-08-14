/** @typedef {"draft" | "confirmed" | "sent" | "cancelled"} PurchaseOrderStatus */

export const PURCHASE_ORDER_STATUS_VALUES = /** @type {const} */ ([
  "draft",
  "confirmed",
  "sent",
  "cancelled",
]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getPurchaseOrderStatusLabel(t, status) {
  if (status === "draft") return t("poStatusDraft");
  if (status === "confirmed") return t("poStatusConfirmed");
  if (status === "sent") return t("poStatusSent");
  if (status === "cancelled") return t("poStatusCancelled");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function isPurchaseOrderDraft(status) {
  return status === "draft" || status == null;
}

/**
 * @param {string | null | undefined} status
 */
export function isPurchaseOrderConfirmed(status) {
  return status === "confirmed";
}

/**
 * @param {string | null | undefined} status
 */
export function isPurchaseOrderPrintable(status) {
  return status === "confirmed" || status === "sent";
}

/**
 * @param {string | null | undefined} status
 */
export function isPurchaseOrderCancellable(status) {
  return status === "draft" || status === "confirmed" || status === "sent";
}
