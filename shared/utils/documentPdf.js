/**
 * Statuses in which a document may be printed / downloaded as PDF.
 * Mirrors the backend `*_PDF_NOT_ALLOWED` rules (docs/printing-plan.md).
 */
export const DOCUMENT_PDF_PRINTABLE_STATUSES = /** @type {const} */ ({
  sales_quotation: ["sent", "accepted", "converted"],
  sales_order: ["confirmed", "partially_invoiced", "invoiced"],
  sales_invoice: ["posted", "reversed"],
  sales_credit_note: ["posted", "reversed"],
  customer_receipt: ["posted", "reversed"],
  customer_refund: ["posted", "reversed"],
  purchase_order: ["confirmed", "sent", "closed"],
  purchase_invoice: ["posted", "reversed"],
  purchase_debit_note: ["posted", "reversed"],
  supplier_payment: ["posted", "reversed"],
  supplier_refund: ["posted", "reversed"],
  goods_receipt: ["posted", "reversed"],
  stock_transfer: ["in_transit", "partially_received", "received"],
  journal_entry: ["posted", "reversed"],
});

/**
 * @param {keyof typeof DOCUMENT_PDF_PRINTABLE_STATUSES} kind
 * @param {string | null | undefined} status
 */
export function isDocumentPdfPrintable(kind, status) {
  if (typeof status !== "string") return false;
  return /** @type {readonly string[]} */ (DOCUMENT_PDF_PRINTABLE_STATUSES[kind] ?? []).includes(status);
}

/**
 * `{documentNumber}.pdf`, falling back to a generic name when the number is unknown.
 *
 * @param {unknown} documentNumber
 * @param {string} fallback
 */
export function documentPdfFilename(documentNumber, fallback) {
  const base = typeof documentNumber === "string" && documentNumber.trim() ? documentNumber.trim() : fallback;
  return `${base}.pdf`;
}
