/**
 * Invoice verifier cache keys. The list is a bare array (no pagination);
 * details live under `[...list, id]`.
 */

export const INVOICE_VERIFIERS_LIST_QUERY_KEY = /** @type {const} */ (["tenant", "invoice-verifiers"]);

/** @param {string} id */
export function invoiceVerifierDetailQueryKey(id) {
  return [...INVOICE_VERIFIERS_LIST_QUERY_KEY, id];
}
