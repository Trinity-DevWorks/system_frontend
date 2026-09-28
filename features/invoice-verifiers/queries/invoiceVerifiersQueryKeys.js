/**
 * Company verifiers list for the current tenant host.
 *
 * @param {string} hostname
 */
export function invoiceVerifiersQueryKey(hostname) {
  return /** @type {const} */ (["tenant", "invoice-verifiers", hostname]);
}
