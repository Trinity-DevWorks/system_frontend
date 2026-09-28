/**
 * Latest chain consistency check for the current tenant host.
 *
 * @param {string} hostname
 */
export function invoiceChainCheckQueryKey(hostname) {
  return /** @type {const} */ (["tenant", "invoice-chain-check", hostname]);
}
