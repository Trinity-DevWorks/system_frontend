/**
 * Public Ethereum address (0x + 40 hex). Empty is allowed.
 */

export const WALLET_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/**
 * EIP-7702 delegation designator: 0xef0100 || address (23 bytes).
 * MetaMask Smart Accounts leave this as eth_getCode while the account remains an EOA.
 */
export const EIP7702_DELEGATION_PATTERN = /^0xef0100[0-9a-fA-F]{40}$/i;

/**
 * @param {unknown} code eth_getCode result
 */
export function isEip7702DelegationCode(code) {
  return typeof code === "string" && EIP7702_DELEGATION_PATTERN.test(code);
}

/**
 * True when eth_getCode is a real deployed contract (not empty, not EIP-7702).
 * @param {unknown} code
 */
export function hasDeployedContractCode(code) {
  if (typeof code !== "string" || code === "" || code === "0x" || code === "0x0") return false;
  return !isEip7702DelegationCode(code);
}

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
