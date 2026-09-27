export const SALES_INVOICES_QUERY_KEY = /** @type {const} */ (["tenant", "sales-invoices"]);

export const SALES_INVOICE_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "sales-invoice",
]);

/**
 * @param {string | null | undefined} invoiceId
 */
export function salesInvoiceProofQueryKey(invoiceId) {
  return [...SALES_INVOICE_DETAIL_QUERY_PREFIX, invoiceId ?? null, "proof"];
}

/**
 * Public buyer portal (tenant host, no ERP session).
 * @param {string | null | undefined} invoiceId
 * @param {string | number | null | undefined} [exp]
 * @param {string | null | undefined} [sig]
 */
export function invoiceProofPortalQueryKey(invoiceId, exp = null, sig = null) {
  return ["tenant", "invoice-proof-portal", invoiceId ?? null, exp ?? null, sig ?? null];
}

/**
 * @param {string | null | undefined} itemId
 */
export function salesInvoiceItemAvailabilityQueryKey(itemId) {
  return [...SALES_INVOICES_QUERY_KEY, "item-availability", itemId ?? null];
}
