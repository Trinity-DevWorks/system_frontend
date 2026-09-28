/**
 * Third-party attestations on InvoiceRegistry (auditor, tax authority, financier),
 * read and sent through the injected wallet so the result does not depend on the ERP server.
 */
import { decodeFunctionResult, encodeFunctionData, keccak256, stringToHex } from "viem";
import { proofIdToBytes32 } from "@/lib/invoice-proof-merkle";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_BYTES32 = `0x${"0".repeat(64)}`;
const FULLY_APPROVED = 3;
const MAX_ATTESTATIONS = 50;

/** Index matches InvoiceRegistry.VerifierRole. */
export const VERIFIER_ROLES = /** @type {const} */ ([null, "auditor", "tax_authority", "financier"]);

const REGISTRY_ABI = [
  {
    type: "function",
    name: "attestationCount",
    stateMutability: "view",
    inputs: [{ name: "proofId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "attestationAt",
    stateMutability: "view",
    inputs: [
      { name: "proofId", type: "bytes32" },
      { name: "index", type: "uint256" },
    ],
    outputs: [
      { name: "verifier", type: "address" },
      { name: "role", type: "uint8" },
      { name: "referenceHash", type: "bytes32" },
      { name: "attestedAt", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "financedBy",
    stateMutability: "view",
    inputs: [{ name: "proofId", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "verifierRole",
    stateMutability: "view",
    inputs: [
      { name: "company", type: "address" },
      { name: "verifier", type: "address" },
    ],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "hasAttested",
    stateMutability: "view",
    inputs: [
      { name: "proofId", type: "bytes32" },
      { name: "verifier", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "statusOf",
    stateMutability: "view",
    inputs: [{ name: "proofId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "invoices",
    stateMutability: "view",
    inputs: [{ name: "proofId", type: "bytes32" }],
    outputs: [
      { name: "contentHash", type: "bytes32" },
      { name: "supplier", type: "address" },
      { name: "buyer", type: "address" },
      { name: "supplierApproved", type: "bool" },
      { name: "buyerApproved", type: "bool" },
      { name: "registeredAt", type: "uint256" },
      { name: "supplierApprovedAt", type: "uint256" },
      { name: "buyerApprovedAt", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "attest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proofId", type: "bytes32" },
      { name: "contentHash", type: "bytes32" },
      { name: "referenceHash", type: "bytes32" },
    ],
    outputs: [],
  },
];

export class AttestationError extends Error {
  /**
   * @param {"missing_wallet" | "wrong_network" | "company_not_set" | "not_verifier" | "is_party" | "already_attested" | "already_financed" | "buyer_not_approved" | "rejected" | "failed"} code
   */
  constructor(code) {
    super(code);
    this.name = "AttestationError";
    this.code = code;
  }
}

/**
 * @typedef {{
 *   verifier: string;
 *   role: "auditor" | "tax_authority" | "financier";
 *   referenceHash: string | null;
 *   attestedAt: number | null;
 * }} InvoiceAttestation
 */

/**
 * @typedef {{ chainId: number; contractAddress: string; proofId: string }} RegistryTarget
 */

function getEthereum() {
  if (typeof window === "undefined") return null;
  const ethereum = window.ethereum;
  if (!ethereum || typeof ethereum.request !== "function") return null;
  return ethereum;
}

/**
 * @param {RegistryTarget} target
 */
async function connect(target) {
  const ethereum = getEthereum();
  if (!ethereum) throw new AttestationError("missing_wallet");

  const expectedChain = `0x${Number(target.chainId).toString(16)}`;
  const currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
  if (currentChain !== expectedChain) {
    try {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: expectedChain }] });
    } catch {
      throw new AttestationError("wrong_network");
    }
  }

  const to = String(target.contractAddress ?? "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(to)) throw new AttestationError("failed");

  return { ethereum, to, proofId: /** @type {`0x${string}`} */ (`0x${proofIdToBytes32(target.proofId)}`) };
}

/**
 * @param {{ request: Function }} ethereum
 * @param {string} to
 * @param {string} functionName
 * @param {unknown[]} args
 */
async function read(ethereum, to, functionName, args) {
  const data = encodeFunctionData({ abi: REGISTRY_ABI, functionName, args });
  const result = await ethereum.request({ method: "eth_call", params: [{ to, data }, "latest"] });
  return decodeFunctionResult({ abi: REGISTRY_ABI, functionName, data: result });
}

/**
 * All attestations for a proof plus the exclusive financier, if any.
 * @param {RegistryTarget} target
 * @returns {Promise<{ attestations: InvoiceAttestation[]; financedBy: string | null }>}
 */
export async function readAttestations(target) {
  const { ethereum, to, proofId } = await connect(target);
  const count = Math.min(Number(await read(ethereum, to, "attestationCount", [proofId])), MAX_ATTESTATIONS);

  /** @type {InvoiceAttestation[]} */
  const attestations = [];
  for (let index = 0; index < count; index += 1) {
    const [verifier, role, referenceHash, attestedAt] = await read(ethereum, to, "attestationAt", [proofId, BigInt(index)]);
    const roleName = VERIFIER_ROLES[Number(role)];
    if (!roleName) continue;
    attestations.push({
      verifier: String(verifier).toLowerCase(),
      role: roleName,
      referenceHash: referenceHash === ZERO_BYTES32 ? null : String(referenceHash),
      attestedAt: Number(attestedAt) > 0 ? Number(attestedAt) : null,
    });
  }

  const financedBy = String(await read(ethereum, to, "financedBy", [proofId])).toLowerCase();

  return { attestations, financedBy: financedBy === ZERO_ADDRESS ? null : financedBy };
}

/**
 * Connects the wallet and reports whether it may attest this proof.
 * @param {RegistryTarget} target
 * @returns {Promise<{ account: string; role: InvoiceAttestation["role"] | null; blocker: AttestationError["code"] | null }>}
 */
export async function readVerifierEligibility(target) {
  const { ethereum, to, proofId } = await connect(target);

  let accounts;
  try {
    accounts = await ethereum.request({ method: "eth_requestAccounts" });
  } catch {
    throw new AttestationError("rejected");
  }
  const account = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0].toLowerCase() : "";
  if (!account) throw new AttestationError("missing_wallet");

  const [, supplierRaw, buyerRaw] = await read(ethereum, to, "invoices", [proofId]);
  const supplier = String(supplierRaw).toLowerCase();
  if (supplier === ZERO_ADDRESS) return { account, role: null, blocker: "company_not_set" };

  const role = VERIFIER_ROLES[Number(await read(ethereum, to, "verifierRole", [supplier, account]))] ?? null;
  if (!role) return { account, role, blocker: "not_verifier" };

  if (supplier === account || String(buyerRaw).toLowerCase() === account) {
    return { account, role, blocker: "is_party" };
  }
  if (await read(ethereum, to, "hasAttested", [proofId, account])) {
    return { account, role, blocker: "already_attested" };
  }
  if (role === "financier") {
    if (String(await read(ethereum, to, "financedBy", [proofId])).toLowerCase() !== ZERO_ADDRESS) {
      return { account, role, blocker: "already_financed" };
    }
    if (Number(await read(ethereum, to, "statusOf", [proofId])) !== FULLY_APPROVED) {
      return { account, role, blocker: "buyer_not_approved" };
    }
  }

  return { account, role, blocker: null };
}

/**
 * Private reference (loan or audit number) → keccak256; empty → zero hash.
 * @param {string} reference
 */
export function referenceHashOf(reference) {
  const value = String(reference ?? "").trim();
  return value === "" ? ZERO_BYTES32 : keccak256(stringToHex(value));
}

/**
 * Sends `attest` from the connected verifier wallet and waits for the receipt.
 * @param {RegistryTarget & { account: string; contentHash: string; reference: string }} params
 * @returns {Promise<string>} transaction hash
 */
export async function sendAttestation(params) {
  const { ethereum, to, proofId } = await connect(params);
  const contentHash = String(params.contentHash ?? "").toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{64}$/.test(contentHash)) throw new AttestationError("failed");

  const data = encodeFunctionData({
    abi: REGISTRY_ABI,
    functionName: "attest",
    args: [proofId, `0x${contentHash}`, referenceHashOf(params.reference)],
  });

  let hash;
  try {
    hash = await ethereum.request({
      method: "eth_sendTransaction",
      params: [{ from: params.account, to, data, chainId: `0x${Number(params.chainId).toString(16)}` }],
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") throw new AttestationError("rejected");
    throw new AttestationError("failed");
  }
  if (typeof hash !== "string" || hash === "") throw new AttestationError("failed");

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const receipt = await ethereum.request({ method: "eth_getTransactionReceipt", params: [hash] });
    if (receipt && typeof receipt === "object") {
      if (/** @type {{ status?: string }} */ (receipt).status === "0x0") throw new AttestationError("failed");
      return hash;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return hash;
}
