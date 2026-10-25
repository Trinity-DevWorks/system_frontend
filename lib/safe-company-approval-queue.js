/**
 * Off-chain company Safe queue for `approveBySupplier` (Sepolia Transaction Service).
 * ERP owners confirm here; the company executes in Safe{Wallet}, not in this app.
 */

import { getAddress } from "viem";

export const SEPOLIA_CHAIN_ID = 11155111;
export const APPROVE_BY_SUPPLIER_SELECTOR = "0x97da4ed5";
export const APPROVE_BY_BUYER_SELECTOR = "0xd137afbb";
export const ATTEST_SELECTOR = "0x2032b50e";
export const DEFAULT_SEPOLIA_SAFE_TX_SERVICE_URL = "https://api.safe.global/tx-service/sep/api";

/**
 * @typedef {{
 *   owners: string[];
 *   threshold: number;
 *   confirmed: string[];
 *   safeTxHash: string | null;
 *   connected: string;
 *   alreadyConfirmedByConnected: boolean;
 *   readyToExecute: boolean;
 * }} SafeCompanyApprovalQueue
 */

/**
 * @param {string | null | undefined} url
 */
export function sepoliaSafeTxServiceUrl(url) {
  if (typeof url === "string" && url.trim() !== "") {
    return url.trim().replace(/\/$/, "");
  }
  return DEFAULT_SEPOLIA_SAFE_TX_SERVICE_URL;
}

/**
 * @param {unknown} address
 */
function checksumAddress(address) {
  try {
    return getAddress(String(address ?? ""));
  } catch {
    return "";
  }
}

/**
 * @param {unknown} proofId
 */
export function proofIdHexFromEip712Value(proofId) {
  if (typeof proofId !== "string") return "";
  const trimmed = proofId.trim();
  if (trimmed === "") return "";
  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
    return trimmed.slice(2).toLowerCase();
  }
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  const uuid = trimmed.replace(/-/g, "");
  if (/^[0-9a-fA-F]{32}$/.test(uuid)) {
    return `${uuid.toLowerCase()}${"0".repeat(32)}`;
  }
  return "";
}

/**
 * @param {unknown} data
 * @param {string} selector
 */
function calldataProofIdHex(data, selector) {
  const sel = String(selector ?? "").toLowerCase().replace(/^0x/, "");
  const raw = String(data ?? "").toLowerCase().replace(/^0x/, "");
  if (sel.length !== 8 || !raw.startsWith(sel) || raw.length < 72) {
    return "";
  }
  return raw.slice(8, 72);
}

/**
 * @param {unknown} tx
 * @param {{ contractAddress: string; proofIdHex: string; selector?: string }} match
 */
export function isPendingCompanyApprovalTx(tx, { contractAddress, proofIdHex, selector = APPROVE_BY_SUPPLIER_SELECTOR }) {
  if (!tx || typeof tx !== "object") return false;
  const record = /** @type {{ to?: unknown; data?: unknown; isExecuted?: unknown }} */ (tx);
  if (record.isExecuted === true) return false;
  const to = checksumAddress(record.to);
  const expected = checksumAddress(contractAddress);
  if (to === "" || expected === "" || to !== expected) return false;
  const calldataId = calldataProofIdHex(record.data, selector);
  if (calldataId === "") return false;
  if (proofIdHex === "") return true;
  return calldataId === proofIdHex.toLowerCase();
}

/**
 * @param {unknown} confirmations
 */
function confirmationOwners(confirmations) {
  if (!Array.isArray(confirmations)) return [];
  const owners = [];
  for (const row of confirmations) {
    const owner =
      row && typeof row === "object" && "owner" in row ? checksumAddress(row.owner) : "";
    if (owner !== "") owners.push(owner);
  }
  return owners;
}

/**
 * Prefer the queue item this owner already signed; otherwise the most-confirmed
 * matching `approveBySupplier` (lowest nonce as a tie-break).
 *
 * @param {unknown[]} results
 * @param {{ contractAddress: string; proofIdHex: string; connected: string; selector?: string }} args
 */
export function pickPendingCompanyApprovalTx(results, { contractAddress, proofIdHex, connected, selector = APPROVE_BY_SUPPLIER_SELECTOR }) {
  const matches = (Array.isArray(results) ? results : []).filter((tx) =>
    isPendingCompanyApprovalTx(tx, { contractAddress, proofIdHex, selector }),
  );
  if (matches.length === 0) return null;

  const connectedAddress = checksumAddress(connected);
  if (connectedAddress !== "") {
    const already = matches.find((tx) => {
      const owners = confirmationOwners(
        tx && typeof tx === "object" && "confirmations" in tx ? tx.confirmations : [],
      );
      return owners.some((owner) => owner.toLowerCase() === connectedAddress.toLowerCase());
    });
    if (already) return already;
  }

  matches.sort((left, right) => {
    const leftCount = confirmationOwners(
      left && typeof left === "object" && "confirmations" in left ? left.confirmations : [],
    ).length;
    const rightCount = confirmationOwners(
      right && typeof right === "object" && "confirmations" in right ? right.confirmations : [],
    ).length;
    if (rightCount !== leftCount) return rightCount - leftCount;
    const leftNonce = Number(
      left && typeof left === "object" && "nonce" in left ? left.nonce : 0,
    );
    const rightNonce = Number(
      right && typeof right === "object" && "nonce" in right ? right.nonce : 0,
    );
    return leftNonce - rightNonce;
  });
  return matches[0] ?? null;
}

/**
 * @param {{
 *   chainId?: number;
 *   txServiceUrl?: string | null;
 *   apiKey?: string | null;
 * }} args
 */
export async function createSepoliaSafeApiKit({ chainId = SEPOLIA_CHAIN_ID, txServiceUrl, apiKey }) {
  const apiMod = await import("@safe-global/api-kit");
  const SafeApiKit = apiMod.default ?? apiMod.SafeApiKit ?? apiMod;
  return new SafeApiKit({
    chainId: BigInt(chainId),
    txServiceUrl: sepoliaSafeTxServiceUrl(txServiceUrl),
    ...(typeof apiKey === "string" && apiKey.trim() !== "" ? { apiKey: apiKey.trim() } : {}),
  });
}

/**
 * @param {{
 *   apiKit?: { getSafeInfo: (address: string) => Promise<unknown>; getPendingTransactions: (address: string) => Promise<unknown> };
 *   chainId?: number;
 *   txServiceUrl?: string | null;
 *   apiKey?: string | null;
 *   safeAddress: string;
 *   contractAddress: string;
 *   proofId?: unknown;
 *   connected?: string;
 *   selector?: string;
 * }} args
 * @returns {Promise<SafeCompanyApprovalQueue | null>}
 */
export async function fetchSafeCompanyApprovalQueue({
  apiKit,
  chainId = SEPOLIA_CHAIN_ID,
  txServiceUrl,
  apiKey,
  safeAddress,
  contractAddress,
  proofId,
  connected = "",
  selector = APPROVE_BY_SUPPLIER_SELECTOR,
}) {
  const safe = checksumAddress(safeAddress);
  const contract = checksumAddress(contractAddress);
  if (safe === "" || contract === "") return null;

  const kit =
    apiKit ??
    (await createSepoliaSafeApiKit({
      chainId,
      txServiceUrl,
      apiKey,
    }));

  let info;
  try {
    info = await kit.getSafeInfo(safe);
  } catch {
    return null;
  }

  const owners = Array.isArray(info?.owners)
    ? info.owners.map((owner) => checksumAddress(owner)).filter(Boolean)
    : [];
  const threshold = Number(info?.threshold);
  if (owners.length === 0 || !Number.isFinite(threshold) || threshold < 1) {
    return null;
  }

  let pending;
  try {
    pending = await kit.getPendingTransactions(safe);
  } catch {
    pending = { results: [] };
  }

  const proofIdHex = proofIdHexFromEip712Value(proofId);
  const connectedAddress = checksumAddress(connected);
  const picked = pickPendingCompanyApprovalTx(pending?.results ?? [], {
    contractAddress: contract,
    proofIdHex,
    connected: connectedAddress,
    selector,
  });

  const confirmed = confirmationOwners(
    picked && typeof picked === "object" && "confirmations" in picked ? picked.confirmations : [],
  );
  const safeTxHash =
    picked && typeof picked === "object" && typeof picked.safeTxHash === "string" && picked.safeTxHash !== ""
      ? picked.safeTxHash
      : null;
  const alreadyConfirmedByConnected =
    connectedAddress !== "" &&
    confirmed.some((owner) => owner.toLowerCase() === connectedAddress.toLowerCase());
  const readyToExecute = safeTxHash != null && confirmed.length >= threshold;

  return {
    owners,
    threshold,
    confirmed,
    safeTxHash,
    connected: connectedAddress,
    alreadyConfirmedByConnected,
    readyToExecute,
  };
}
