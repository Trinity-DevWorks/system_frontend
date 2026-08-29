/**
 * Country catalog is locale-specific (`name` is translated).
 *
 * @param {string} locale
 */
export function countriesQueryKey(locale) {
  return /** @type {const} */ (["tenant", "countries", locale]);
}
