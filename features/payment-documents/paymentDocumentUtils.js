/** Money comparisons at 4 decimal places, matching invoice storage. */

/**
 * @param {unknown} value
 */
export function moneyUnits(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10000);
}

/**
 * @param {number} units
 */
export function unitsToAmount(units) {
  return units / 10000;
}

export const PAYMENT_DOCUMENT_STATUS_VALUES = /** @type {const} */ (["draft", "posted", "reversed"]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getPaymentDocumentStatusLabel(t, status) {
  if (status === "draft") return t("statusDraft");
  if (status === "posted") return t("statusPosted");
  if (status === "reversed") return t("statusReversed");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function paymentDocumentStatusTagColor(status) {
  if (status === "posted") return "success";
  if (status === "reversed") return "warning";
  return "processing";
}

/**
 * @param {string | null | undefined} status
 */
export function isPaymentDocumentDraft(status) {
  return status === "draft" || status == null;
}
