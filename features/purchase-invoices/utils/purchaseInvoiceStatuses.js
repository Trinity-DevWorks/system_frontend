export const PURCHASE_INVOICE_STATUS_VALUES = ["draft", "posted", "reversed"];

/**
 * @param {(key: string) => string} t
 * @param {unknown} status
 */
export function getPurchaseInvoiceStatusLabel(t, status) {
  if (status === "posted") return t("statusPosted");
  if (status === "reversed") return t("statusReversed");
  if (status === "draft") return t("statusDraft");
  return status == null ? "" : String(status);
}

/**
 * @param {unknown} status
 */
export function isPurchaseInvoicePosted(status) {
  return status === "posted";
}

/**
 * @param {unknown} status
 */
export function isPurchaseInvoiceDraft(status) {
  return status === "draft" || status == null;
}

/**
 * @param {unknown} record
 */
export function purchaseInvoiceHasPayments(record) {
  const paid = Number(record?.paid_total ?? 0);
  return Number.isFinite(paid) && paid > 0;
}

/**
 * @param {unknown} record
 */
export function purchaseInvoiceCanReverse(record) {
  if (record && typeof record === "object" && typeof record.can_reverse === "boolean") {
    return record.can_reverse;
  }
  return record?.status === "posted" && !purchaseInvoiceHasPayments(record);
}

/**
 * @param {(key: string) => string} t
 * @param {unknown} record
 */
export function purchaseInvoiceReverseDisabledReason(t, record) {
  if (purchaseInvoiceCanReverse(record)) return "";
  if (purchaseInvoiceHasPayments(record)) return t("reverseDisabledHasPayments");
  return "";
}

/**
 * @param {unknown} record
 */
export function purchaseInvoiceCanReissue(record) {
  if (!record || typeof record !== "object") return false;
  const row = /** @type {Record<string, unknown>} */ (record);
  if (row.can_reissue === true) return true;
  if (row.can_reissue === false) return false;
  const status = row.status;
  if (status !== "posted" && status !== "reversed") return false;
  if (row.linked_proof_id != null && row.linked_proof_id !== "") return false;
  if (Number(row.paid_total ?? 0) > 0) return false;
  if (row.goods_receipt_id != null && row.goods_receipt_id !== "") return false;
  return row.replaced_by_invoice == null;
}

/**
 * @param {(key: string) => string} t
 * @param {unknown} record
 */
export function purchaseInvoiceReissueDisabledReason(t, record) {
  if (purchaseInvoiceCanReissue(record)) return "";
  if (!record || typeof record !== "object") return "";
  const row = /** @type {Record<string, unknown>} */ (record);
  if (row.linked_proof_id != null && row.linked_proof_id !== "") return t("reissueDisabledLinkedProof");
  if (Number(row.paid_total ?? 0) > 0) return t("reissueDisabledHasPayments");
  if (row.goods_receipt_id != null && row.goods_receipt_id !== "") return t("reissueDisabledHasGrn");
  if (row.replaced_by_invoice != null) return t("reissueDisabledAlreadyReissued");
  return "";
}

/**
 * @param {string | null | undefined} status
 */
export function purchaseInvoiceStatusTagColor(status) {
  if (status === "posted") return "success";
  if (status === "reversed") return "warning";
  return "processing";
}

/**
 * @param {string | null | undefined} status
 * @param {unknown} paidTotal
 * @param {unknown} netToPay
 * @returns {"unpaid" | "partial" | "paid" | null}
 */
export function purchaseInvoiceSettlement(status, paidTotal, netToPay) {
  if (status !== "posted") return null;
  const paid = Number(paidTotal ?? 0);
  const open = Number(netToPay ?? 0);
  if (!Number.isFinite(paid) || paid <= 0) return "unpaid";
  if (!Number.isFinite(open) || open <= 0) return "paid";
  return "partial";
}

/**
 * @param {(key: string) => string} t
 * @param {"unpaid" | "partial" | "paid" | null} settlement
 */
export function getPurchaseInvoiceSettlementLabel(t, settlement) {
  if (settlement === "unpaid") return t("settlementUnpaid");
  if (settlement === "partial") return t("settlementPartial");
  if (settlement === "paid") return t("settlementPaid");
  return "";
}
