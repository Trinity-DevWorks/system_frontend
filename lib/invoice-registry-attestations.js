/**
 * Third-party attestations on InvoiceRegistry (auditor, tax authority, financier),
 * read and sent through the injected wallet (directly or through the verifier's Safe)
 * so the result does not depend on the ERP server.
 */
import { decodeFunctionResult, encodeFunctionData, keccak256, stringToHex } from "viem";
import { proofIdToBytes32 } from "@/lib/invoice-proof-merkle";
import { executeThroughSafe, readSafeOwners, SafeExecutionError } from "@/lib/safe-execution";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_BYTES32 = `0x${"0".repeat(64)}`;
const FULLY_APPROVED = 3;
const MAX_ATTESTATIONS = 50;

/** Index matches InvoiceRegistry.VerifierRole. */
export const VERIFIER_ROLES = /** @type {const} */ ([null, "auditor", "tax_authority", "financier"]);

/** Index matches InvoiceRegistry.Status. */
const INVOICE_STATUSES = /** @type {const} */ (["not_registered", "registered", "supplier_approved", "fully_approved"]);

const TX_EXPLORERS = { 1: "https://etherscan.io/tx/", 11155111: "https://sepolia.etherscan.io/tx/" };

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
      { name: "statement", type: "string" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
];

const EIP712_DOMAIN_TYPES = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

/** Field order matches InvoiceRegistry.ATTESTATION_TYPEHASH. */
const ATTESTATION_TYPES = [
  { name: "proofId", type: "bytes32" },
  { name: "contentHash", type: "bytes32" },
  { name: "role", type: "uint8" },
  { name: "referenceHash", type: "bytes32" },
  { name: "statement", type: "string" },
];

const ROLE_TITLES = { auditor: "auditor", tax_authority: "tax authority", financier: "financier" };

export class AttestationError extends Error {
  /**
   * @param {"missing_wallet" | "wrong_network" | "company_not_set" | "not_verifier" | "is_party" | "already_attested" | "already_financed" | "buyer_not_approved" | "invalid_safe" | "not_safe_owner" | "pending_confirmations" | "rejected" | "failed"} code
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
 * Connects the wallet and reports whether it may attest this proof. With `safeAddress`,
 * the Safe is the verifier and the connected wallet must be one of its owners.
 * @param {RegistryTarget} target
 * @param {{ safeAddress?: string | null }} [options]
 * @returns {Promise<{
 *   account: string;
 *   signer: string;
 *   safeAddress: string | null;
 *   supplier: string | null;
 *   status: (typeof INVOICE_STATUSES)[number];
 *   role: InvoiceAttestation["role"] | null;
 *   blocker: AttestationError["code"] | null;
 * }>} account is the verifier address (the Safe when attesting through one); signer is the connected wallet;
 *   supplier is the company whose verifier list applies
 */
export async function readVerifierEligibility(target, options = {}) {
  const { ethereum, to, proofId } = await connect(target);

  let accounts;
  try {
    accounts = await ethereum.request({ method: "eth_requestAccounts" });
  } catch {
    throw new AttestationError("rejected");
  }
  const signer = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0].toLowerCase() : "";
  if (!signer) throw new AttestationError("missing_wallet");

  let safeAddress = null;
  if (options.safeAddress != null && String(options.safeAddress).trim() !== "") {
    safeAddress = String(options.safeAddress).trim().toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(safeAddress)) throw new AttestationError("invalid_safe");
    const owners = await readSafeOwners(ethereum, safeAddress);
    if (owners.length === 0) throw new AttestationError("invalid_safe");
    if (!owners.includes(signer)) throw new AttestationError("not_safe_owner");
  }
  const account = safeAddress ?? signer;

  const [, supplierRaw, buyerRaw] = await read(ethereum, to, "invoices", [proofId]);
  const supplier = String(supplierRaw).toLowerCase();
  const status = INVOICE_STATUSES[Number(await read(ethereum, to, "statusOf", [proofId]))] ?? "not_registered";
  const result = (role, blocker) => ({
    account,
    signer,
    safeAddress,
    supplier: supplier === ZERO_ADDRESS ? null : supplier,
    status,
    role,
    blocker,
  });
  if (supplier === ZERO_ADDRESS) return result(null, "company_not_set");

  const role = VERIFIER_ROLES[Number(await read(ethereum, to, "verifierRole", [supplier, account]))] ?? null;
  if (!role) return result(role, "not_verifier");

  if (supplier === account || String(buyerRaw).toLowerCase() === account) {
    return result(role, "is_party");
  }
  if (await read(ethereum, to, "hasAttested", [proofId, account])) {
    return result(role, "already_attested");
  }
  if (role === "financier") {
    if (String(await read(ethereum, to, "financedBy", [proofId])).toLowerCase() !== ZERO_ADDRESS) {
      return result(role, "already_financed");
    }
    if (status !== INVOICE_STATUSES[FULLY_APPROVED]) {
      return result(role, "buyer_not_approved");
    }
  }

  return result(role, null);
}

/**
 * Block explorer link for a transaction, or null on local chains such as Anvil.
 * @param {number} chainId
 * @param {string} txHash
 */
export function transactionUrl(chainId, txHash) {
  const base = TX_EXPLORERS[/** @type {keyof typeof TX_EXPLORERS} */ (Number(chainId))];
  return base && /^0x[0-9a-f]{64}$/i.test(String(txHash)) ? `${base}${txHash}` : null;
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
 * The sentence the verifier agrees to. It is stored in the transaction calldata and,
 * for a personal wallet, signed as EIP-712 `Attestation`, so it stays in English like
 * the party approval statements.
 * @param {InvoiceAttestation["role"]} role
 * @param {string | null} [invoiceNumber]
 */
export function buildAttestationStatement(role, invoiceNumber) {
  const number = String(invoiceNumber ?? "").trim();
  const invoice = number === "" ? "this invoice" : `invoice ${number}`;
  const prefix = `As ${ROLE_TITLES[role] ?? "verifier"}, I confirm`;

  if (role === "financier") {
    return `${prefix} that I am financing ${invoice}. Its content matches the hash registered on the blockchain.`;
  }
  if (role === "tax_authority") {
    return `${prefix} that I checked ${invoice} for tax purposes. Its content matches the hash registered on the blockchain.`;
  }
  return `${prefix} that I reviewed ${invoice}. Its content matches the hash registered on the blockchain.`;
}

/**
 * Sends `attest` from the connected verifier wallet, or through the verifier Safe when
 * `safeAddress` is set, and waits for the receipt. A personal wallet first signs the
 * EIP-712 `Attestation`; a Safe approves by executing the call, so it signs nothing.
 * @param {RegistryTarget & {
 *   account: string;
 *   signer?: string;
 *   safeAddress?: string | null;
 *   contentHash: string;
 *   reference: string;
 *   role: InvoiceAttestation["role"];
 *   statement: string;
 *   onStage?: (stage: "sign" | "send" | "confirm") => void;
 * }} params
 * @returns {Promise<{ status: "executed" | "proposed"; txHash: string; confirmations?: number; threshold?: number }>}
 *   "proposed" means this Safe owner's approval was recorded; more owners must confirm.
 */
export async function sendAttestation(params) {
  const { ethereum, to, proofId } = await connect(params);
  const contentHash = /** @type {`0x${string}`} */ (
    `0x${String(params.contentHash ?? "").toLowerCase().replace(/^0x/, "")}`
  );
  const roleIndex = VERIFIER_ROLES.indexOf(params.role);
  const statement = String(params.statement ?? "");
  if (!/^0x[0-9a-f]{64}$/.test(contentHash) || roleIndex < 1 || statement === "") {
    throw new AttestationError("failed");
  }
  const referenceHash = referenceHashOf(params.reference);

  let signature = "0x";
  if (!params.safeAddress) {
    params.onStage?.("sign");
    signature = await signAttestation(ethereum, params, {
      proofId,
      contentHash,
      role: roleIndex,
      referenceHash,
      statement,
    });
  }

  const data = encodeFunctionData({
    abi: REGISTRY_ABI,
    functionName: "attest",
    args: [proofId, contentHash, referenceHash, statement, signature],
  });

  params.onStage?.("send");
  if (params.safeAddress) {
    let sent;
    try {
      sent = await executeThroughSafe({
        ethereum,
        from: params.signer ?? "",
        safeAddress: params.safeAddress,
        to,
        data,
      });
    } catch (error) {
      throw new AttestationError(error instanceof SafeExecutionError ? error.code : "failed");
    }
    if (sent.status === "proposed") return sent;
    params.onStage?.("confirm");
    await waitForReceipt(ethereum, sent.txHash);
    return sent;
  }

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

  params.onStage?.("confirm");
  await waitForReceipt(ethereum, hash);
  return { status: "executed", txHash: hash };
}

/**
 * MetaMask replaces a missing `EIP712Domain` with an empty type, which changes the
 * domain separator, so the domain fields are always sent in Solidity order.
 * @param {{ request: Function }} ethereum
 * @param {RegistryTarget & { account: string }} target
 * @param {{ proofId: string; contentHash: string; role: number; referenceHash: string; statement: string }} message
 * @returns {Promise<string>}
 */
async function signAttestation(ethereum, target, message) {
  const typedData = {
    types: { EIP712Domain: EIP712_DOMAIN_TYPES, Attestation: ATTESTATION_TYPES },
    primaryType: "Attestation",
    domain: {
      name: "InvoiceRegistry",
      version: "1",
      chainId: Number(target.chainId),
      verifyingContract: String(target.contractAddress).toLowerCase(),
    },
    message,
  };

  let signature;
  try {
    signature = await ethereum.request({
      method: "eth_signTypedData_v4",
      params: [target.account, JSON.stringify(typedData)],
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") throw new AttestationError("rejected");
    throw new AttestationError("failed");
  }
  if (typeof signature !== "string" || !/^0x[0-9a-f]{130}$/i.test(signature)) throw new AttestationError("failed");

  return signature;
}

/**
 * @param {{ request: Function }} ethereum
 * @param {string} hash
 */
async function waitForReceipt(ethereum, hash) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const receipt = await ethereum.request({ method: "eth_getTransactionReceipt", params: [hash] });
    if (receipt && typeof receipt === "object") {
      if (/** @type {{ status?: string }} */ (receipt).status === "0x0") throw new AttestationError("failed");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
