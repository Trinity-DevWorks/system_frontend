import { tenantRequest } from "@/lib/axios";

/**
 * On-chain view of an address on the active network (`GET wallet-inspection`).
 * `available` is false when invoice proofs or the chain are not configured.
 *
 * @typedef {{
 *   available: boolean;
 *   blockchain_network: string | null;
 *   address: string | null;
 *   kind: "wallet" | "safe" | "contract" | null;
 *   owners: string[];
 *   threshold: number | null;
 * }} WalletInspection
 */

/**
 * @param {string} address
 * @returns {Promise<WalletInspection>}
 */
export function fetchWalletInspection(address) {
  return tenantRequest("GET", `wallet-inspection?address=${encodeURIComponent(address)}`);
}
