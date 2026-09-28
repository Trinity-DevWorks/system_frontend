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

/**
 * Declared type sent with an address: `wallet` (personal) or `safe`; null when the address is empty.
 * @param {unknown} address
 * @param {unknown} type
 * @returns {"wallet" | "safe" | null}
 */
export function walletTypeForAddress(address, type) {
  if (address == null || String(address).trim() === "") return null;
  return type === "safe" ? "safe" : "wallet";
}
