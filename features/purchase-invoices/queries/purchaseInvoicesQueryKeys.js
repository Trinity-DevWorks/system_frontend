export const PURCHASE_INVOICES_QUERY_KEY = ["tenant", "purchase-invoices"];
export const PURCHASE_INVOICE_DETAIL_QUERY_PREFIX = ["tenant", "purchase-invoice"];

/** @param {string | null | undefined} invoiceId */
export function purchaseInvoiceProofQueryKey(invoiceId) {
  return [...PURCHASE_INVOICE_DETAIL_QUERY_PREFIX, invoiceId, "proof"];
}
