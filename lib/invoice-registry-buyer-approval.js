/**
 * Party `approveByBuyer` via the injected wallet (MetaMask).
 * Company (supplier) approval is `invoice-registry-supplier-safe.js`.
 */

import { keccak256, stringToHex } from "viem";

const EIP712_DOMAIN_TYPES = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const PARTY_APPROVAL_TYPES = [
  { name: "proofId", type: "bytes32" },
  { name: "contentHash", type: "bytes32" },
  { name: "invoiceNumber", type: "string" },
  { name: "statement", type: "string" },
];

const BUYER_DISPUTE_TYPES = [
  { name: "proofId", type: "bytes32" },
  { name: "contentHash", type: "bytes32" },
  { name: "reasonHash", type: "bytes32" },
  { name: "invoiceNumber", type: "string" },
  { name: "statement", type: "string" },
];

const BUYER_APPROVAL_TYPES = PARTY_APPROVAL_TYPES;
const SUPPLIER_APPROVAL_TYPES = PARTY_APPROVAL_TYPES;

const APPROVE_BY_BUYER_SELECTOR = "0x0a3e2d36";
const DISPUTE_BY_BUYER_SELECTOR = "0xaad824ff";

/**
 * @typedef {{
 *   name: string;
 *   version: string;
 *   chain_id: number;
 *   verifying_contract: string;
 * }} PartyApprovalDomain
 */

/**
 * @typedef {{
 *   domain: PartyApprovalDomain;
 *   primary_type: string;
 *   types?: Record<string, Array<{ name: string, type: string }>>;
 *   message: {
 *     proof_id: string;
 *     content_hash: string;
 *     invoice_number: string;
 *     statement: string;
 *   };
 * }} PartyApprovalEip712
 */

/**
 * @typedef {{
 *   chainId: number;
 *   contractAddress: string;
 *   expectedWallet: string;
 *   eip712: PartyApprovalEip712;
 * }} PartyApprovalTx
 */

/**
 * @typedef {{
 *   chainId: number;
 *   contractAddress: string;
 *   buyerWallet: string;
 *   eip712: PartyApprovalEip712;
 * }} BuyerApprovalTx
 */

/**
 * @typedef {{
 *   chainId: number;
 *   contractAddress: string;
 *   supplierWallet: string;
 *   eip712: PartyApprovalEip712;
 * }} SupplierApprovalTx
 */

/** @typedef {PartyApprovalDomain} BuyerApprovalDomain */
/** @typedef {PartyApprovalEip712} BuyerApprovalEip712 */

export class BuyerApprovalError extends Error {
  /**
   * @param {"missing_wallet" | "wallet_mismatch" | "wrong_network" | "rejected" | "failed" | "not_safe_owner" | "pending_confirmations"} code
   */
  constructor(code) {
    super(code);
    this.name = "BuyerApprovalError";
    this.code = code;
  }
}

/**
 * @returns {{ request: (args: { method: string, params?: unknown[] }) => Promise<unknown> } | null}
 */
function getEthereum() {
  if (typeof window === "undefined") return null;
  const ethereum = window.ethereum;
  if (!ethereum || typeof ethereum.request !== "function") return null;
  return ethereum;
}

/**
 * @param {number} chainId
 */
function toHexChainId(chainId) {
  return `0x${Number(chainId).toString(16)}`;
}

/**
 * @param {string} hex
 */
function strip0x(hex) {
  const value = String(hex ?? "").toLowerCase();
  return value.startsWith("0x") ? value.slice(2) : value;
}

/**
 * @param {string} hex
 */
function asBytes32Hex(hex) {
  const value = strip0x(hex);
  if (!/^[0-9a-f]{64}$/.test(value)) {
    throw new BuyerApprovalError("failed");
  }
  return value;
}

/**
 * @param {unknown} chainId
 */
function toEip712ChainId(chainId) {
  const n = Number(chainId);
  if (!Number.isFinite(n) || n <= 0) {
    throw new BuyerApprovalError("failed");
  }
  return n;
}

/**
 * @param {unknown} address
 */
function toAddress(address) {
  const hex = strip0x(String(address ?? ""));
  if (!/^[0-9a-f]{40}$/.test(hex)) {
    throw new BuyerApprovalError("failed");
  }
  return `0x${hex}`;
}

/**
 * @param {number} value
 */
function padUint(value) {
  return BigInt(value).toString(16).padStart(64, "0");
}

/**
 * @param {string} hex
 */
function encodeDynamicHex(hex) {
  const raw = strip0x(hex);
  if (raw.length % 2 !== 0 || (raw !== "" && !/^[0-9a-f]+$/.test(raw))) {
    throw new BuyerApprovalError("failed");
  }
  const padded = raw === "" ? "" : raw + "0".repeat((64 - (raw.length % 64)) % 64);
  return padUint(raw.length / 2) + padded;
}

/**
 * @param {string} value
 */
function utf8ToHex(value) {
  const bytes = new TextEncoder().encode(value);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * @param {string} selector
 * @param {string} proofId
 * @param {string} contentHash
 * @param {string} invoiceNumber
 * @param {string} statement
 * @param {string} signature
 */
function encodeApproveByParty(selector, proofId, contentHash, invoiceNumber, statement, signature) {
  const encodedNumber = encodeDynamicHex(utf8ToHex(invoiceNumber));
  const encodedStatement = encodeDynamicHex(utf8ToHex(statement));
  const encodedSignature = encodeDynamicHex(signature);
  const headSize = 160;
  const statementOffset = headSize + encodedNumber.length / 2;
  const signatureOffset = statementOffset + encodedStatement.length / 2;

  return (
    selector +
    asBytes32Hex(proofId) +
    asBytes32Hex(contentHash) +
    padUint(headSize) +
    padUint(statementOffset) +
    padUint(signatureOffset) +
    encodedNumber +
    encodedStatement +
    encodedSignature
  );
}

/**
 * @param {string} proofId
 * @param {string} contentHash
 * @param {string} invoiceNumber
 * @param {string} statement
 * @param {string} signature
 */
export function encodeApproveByBuyer(proofId, contentHash, invoiceNumber, statement, signature) {
  return encodeApproveByParty(
    APPROVE_BY_BUYER_SELECTOR,
    proofId,
    contentHash,
    invoiceNumber,
    statement,
    signature,
  );
}

/**
 * MetaMask's eth-sig-util sanitizer sets `types.EIP712Domain = []` when it is
 * omitted, so the domain separator becomes keccak("EIP712Domain()") and does
 * not match InvoiceRegistry. Always send the Solidity domain fields in order.
 *
 * @param {PartyApprovalEip712} eip712
 * @param {"BuyerApproval" | "SupplierApproval"} expectedPrimary
 */
export function toPartyApprovalTypedData(eip712, expectedPrimary) {
  if (
    eip712 == null ||
    typeof eip712 !== "object" ||
    eip712.primary_type !== expectedPrimary ||
    (expectedPrimary !== "BuyerApproval" && expectedPrimary !== "SupplierApproval") ||
    eip712.domain == null ||
    eip712.message == null
  ) {
    throw new BuyerApprovalError("failed");
  }

  const structTypes = expectedPrimary === "SupplierApproval" ? SUPPLIER_APPROVAL_TYPES : BUYER_APPROVAL_TYPES;

  return {
    types: {
      EIP712Domain: EIP712_DOMAIN_TYPES,
      [expectedPrimary]: structTypes,
    },
    primaryType: expectedPrimary,
    domain: {
      name: eip712.domain.name,
      version: eip712.domain.version,
      chainId: toEip712ChainId(eip712.domain.chain_id),
      verifyingContract: toAddress(eip712.domain.verifying_contract),
    },
    message: {
      proofId: `0x${asBytes32Hex(String(eip712.message.proof_id ?? ""))}`,
      contentHash: `0x${asBytes32Hex(String(eip712.message.content_hash ?? ""))}`,
      invoiceNumber: String(eip712.message.invoice_number ?? ""),
      statement: String(eip712.message.statement ?? ""),
    },
  };
}

/**
 * @param {PartyApprovalEip712} eip712
 */
export function toBuyerApprovalTypedData(eip712) {
  return toPartyApprovalTypedData(eip712, "BuyerApproval");
}

/**
 * @param {PartyApprovalEip712} eip712
 */
export function toSupplierApprovalTypedData(eip712) {
  return toPartyApprovalTypedData(eip712, "SupplierApproval");
}

/**
 * @param {PartyApprovalTx} tx
 * @param {"BuyerApproval" | "SupplierApproval"} primaryType
 * @returns {Promise<string>} transaction hash
 */
async function sendPartyApproval(tx, primaryType) {
  const ethereum = getEthereum();
  if (!ethereum) {
    throw new BuyerApprovalError("missing_wallet");
  }

  const expectedWallet = String(tx.expectedWallet ?? "").toLowerCase();
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const from = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
  const connected = from.toLowerCase();
  if (!connected || connected !== expectedWallet) {
    throw new BuyerApprovalError("wallet_mismatch");
  }

  const expectedChain = toHexChainId(tx.chainId).toLowerCase();
  let currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
  if (currentChain !== expectedChain) {
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHexChainId(tx.chainId) }],
      });
      currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
    } catch {
      throw new BuyerApprovalError("wrong_network");
    }
  }
  if (currentChain !== expectedChain) {
    throw new BuyerApprovalError("wrong_network");
  }

  const typedData = toPartyApprovalTypedData(tx.eip712, primaryType);
  if (
    typeof typedData.domain.name !== "string" ||
    typedData.domain.name === "" ||
    typeof typedData.domain.version !== "string" ||
    typedData.domain.version === "" ||
    typeof typedData.domain.verifyingContract !== "string" ||
    typedData.domain.verifyingContract === "" ||
    typeof typedData.message.proofId !== "string" ||
    typeof typedData.message.contentHash !== "string" ||
    typeof typedData.message.invoiceNumber !== "string" ||
    typedData.message.invoiceNumber === "" ||
    typeof typedData.message.statement !== "string" ||
    typedData.message.statement === ""
  ) {
    throw new BuyerApprovalError("failed");
  }

  try {
    const signature = await ethereum.request({
      method: "eth_signTypedData_v4",
      params: [from, JSON.stringify(typedData)],
    });
    if (typeof signature !== "string" || !/^0x[0-9a-f]+$/i.test(signature) || strip0x(signature).length < 130) {
      throw new BuyerApprovalError("failed");
    }

    const data = encodeApproveByParty(
      APPROVE_BY_BUYER_SELECTOR,
      typedData.message.proofId,
      typedData.message.contentHash,
      typedData.message.invoiceNumber,
      typedData.message.statement,
      signature,
    );
    const hash = await ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to: toAddress(tx.contractAddress),
          data,
          chainId: toHexChainId(tx.chainId),
          gas: "0x30000",
        },
      ],
    });
    if (typeof hash !== "string" || hash === "") {
      throw new BuyerApprovalError("failed");
    }
    return hash;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") {
      throw new BuyerApprovalError("rejected");
    }
    if (error instanceof BuyerApprovalError) throw error;
    throw new BuyerApprovalError("failed");
  }
}

/**
 * @param {BuyerApprovalTx} tx
 * @returns {Promise<string>} transaction hash
 */
export async function sendBuyerApproval(tx) {
  return sendPartyApproval(
    {
      chainId: tx.chainId,
      contractAddress: tx.contractAddress,
      expectedWallet: tx.buyerWallet,
      eip712: tx.eip712,
    },
    "BuyerApproval",
  );
}

/**
 * keccak256 of the UTF-8 reason, matching Solidity keccak256(bytes(reason)).
 * @param {string} reason
 */
export function disputeReasonHash(reason) {
  return keccak256(stringToHex(reason));
}

/**
 * @param {string} proofId
 * @param {string} contentHash
 * @param {string} reasonHash
 * @param {string} invoiceNumber
 * @param {string} statement
 * @param {string} signature
 */
export function encodeDisputeByBuyer(proofId, contentHash, reasonHash, invoiceNumber, statement, signature) {
  const encodedNumber = encodeDynamicHex(utf8ToHex(invoiceNumber));
  const encodedStatement = encodeDynamicHex(utf8ToHex(statement));
  const encodedSignature = encodeDynamicHex(signature);
  const headSize = 192;
  const statementOffset = headSize + encodedNumber.length / 2;
  const signatureOffset = statementOffset + encodedStatement.length / 2;

  return (
    DISPUTE_BY_BUYER_SELECTOR +
    asBytes32Hex(proofId) +
    asBytes32Hex(contentHash) +
    asBytes32Hex(reasonHash) +
    padUint(headSize) +
    padUint(statementOffset) +
    padUint(signatureOffset) +
    encodedNumber +
    encodedStatement +
    encodedSignature
  );
}

/**
 * @param {PartyApprovalEip712} eip712
 * @param {string} reasonHash
 */
export function toBuyerDisputeTypedData(eip712, reasonHash) {
  if (
    eip712 == null ||
    typeof eip712 !== "object" ||
    eip712.primary_type !== "BuyerDispute" ||
    eip712.domain == null ||
    eip712.message == null
  ) {
    throw new BuyerApprovalError("failed");
  }

  return {
    types: {
      EIP712Domain: EIP712_DOMAIN_TYPES,
      BuyerDispute: BUYER_DISPUTE_TYPES,
    },
    primaryType: "BuyerDispute",
    domain: {
      name: eip712.domain.name,
      version: eip712.domain.version,
      chainId: toEip712ChainId(eip712.domain.chain_id),
      verifyingContract: toAddress(eip712.domain.verifying_contract),
    },
    message: {
      proofId: `0x${asBytes32Hex(String(eip712.message.proof_id ?? ""))}`,
      contentHash: `0x${asBytes32Hex(String(eip712.message.content_hash ?? ""))}`,
      reasonHash: `0x${asBytes32Hex(reasonHash)}`,
      invoiceNumber: String(eip712.message.invoice_number ?? ""),
      statement: String(eip712.message.statement ?? ""),
    },
  };
}

/**
 * @param {{
 *   chainId: number;
 *   contractAddress: string;
 *   buyerWallet: string;
 *   eip712: PartyApprovalEip712;
 *   reason: string;
 * }} tx
 * @returns {Promise<string>}
 */
export async function sendBuyerDispute(tx) {
  const ethereum = getEthereum();
  if (!ethereum) throw new BuyerApprovalError("missing_wallet");

  const expectedWallet = String(tx.buyerWallet ?? "").toLowerCase();
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const from = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
  if (!from || from.toLowerCase() !== expectedWallet) throw new BuyerApprovalError("wallet_mismatch");

  const expectedChain = toHexChainId(tx.chainId).toLowerCase();
  let currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
  if (currentChain !== expectedChain) {
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHexChainId(tx.chainId) }],
      });
      currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
    } catch {
      throw new BuyerApprovalError("wrong_network");
    }
  }
  if (currentChain !== expectedChain) throw new BuyerApprovalError("wrong_network");

  const reason = String(tx.reason ?? "").trim();
  if (reason === "") throw new BuyerApprovalError("failed");
  const reasonHash = disputeReasonHash(reason);
  const typedData = toBuyerDisputeTypedData(tx.eip712, reasonHash);
  if (typedData.message.invoiceNumber === "" || typedData.message.statement === "") {
    throw new BuyerApprovalError("failed");
  }

  try {
    const signature = await ethereum.request({
      method: "eth_signTypedData_v4",
      params: [from, JSON.stringify(typedData)],
    });
    if (typeof signature !== "string" || !/^0x[0-9a-f]+$/i.test(signature) || strip0x(signature).length < 130) {
      throw new BuyerApprovalError("failed");
    }
    const hash = await ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to: toAddress(tx.contractAddress),
          data: encodeDisputeByBuyer(
            typedData.message.proofId,
            typedData.message.contentHash,
            typedData.message.reasonHash,
            typedData.message.invoiceNumber,
            typedData.message.statement,
            signature,
          ),
          chainId: toHexChainId(tx.chainId),
          gas: "0x30000",
        },
      ],
    });
    if (typeof hash !== "string" || hash === "") throw new BuyerApprovalError("failed");
    return hash;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") throw new BuyerApprovalError("rejected");
    if (error instanceof BuyerApprovalError) throw error;
    throw new BuyerApprovalError("failed");
  }
}
