/**
 * Public Ethereum address (0x + 40 hex). Empty is allowed.
 */

export const WALLET_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/**
 * @param {unknown} value
 */
export function isOptionalWalletAddress(value) {
  if (value == null) return true;
  const trimmed = String(value).trim();
  if (trimmed === "") return true;
  return WALLET_ADDRESS_PATTERN.test(trimmed);
}
