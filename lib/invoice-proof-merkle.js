/**
 * Browser verifier for selective-disclosure bundles (`invoice-proof-disclosure`).
 * Mirrors backend `CanonicalInvoiceMerkle`:
 *
 *   leaf = SHA-256(0x00 || salt || path || 0x00 || value)
 *   node = SHA-256(0x01 || left || right)
 *
 * value is `n` (null), `t` / `f` (bool), `i<decimal>` (int), `s<utf-8>` (string),
 * or `a` (empty list). The on-chain check reads `invoices(proofId)` through
 * the injected wallet provider, so the verdict does not depend on the ERP server.
 */
import { sha256 } from "viem";

const INVOICES_SELECTOR = "0xf8a8a076";

const encoder = new TextEncoder();

/**
 * @param {string} hex
 */
function strip0x(hex) {
  const value = String(hex ?? "").toLowerCase();
  return value.startsWith("0x") ? value.slice(2) : value;
}

/**
 * @param {string} hex
 * @returns {Uint8Array}
 */
function bytes32(hex) {
  const raw = strip0x(hex);
  if (!/^[0-9a-f]{64}$/.test(raw)) {
    throw new Error("Expected 32 bytes hex.");
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    out[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * @param {Uint8Array[]} parts
 */
function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * @param {unknown} value
 * @returns {Uint8Array}
 */
function encodeValue(value) {
  if (value === null) return encoder.encode("n");
  if (value === true) return encoder.encode("t");
  if (value === false) return encoder.encode("f");
  if (typeof value === "number" && Number.isSafeInteger(value)) return encoder.encode(`i${value}`);
  if (typeof value === "string") return encoder.encode(`s${value}`);
  if (Array.isArray(value) && value.length === 0) return encoder.encode("a");
  throw new Error("Unsupported disclosed value.");
}

/**
 * @param {string} path
 * @param {unknown} value
 * @param {string} saltHex
 * @returns {Uint8Array}
 */
export function merkleLeafHash(path, value, saltHex) {
  if (typeof path !== "string" || path === "" || path.includes("\u0000")) {
    throw new Error("Invalid leaf path.");
  }
  return sha256(
    concatBytes([
      Uint8Array.of(0x00),
      bytes32(saltHex),
      encoder.encode(path),
      Uint8Array.of(0x00),
      encodeValue(value),
    ]),
    "bytes",
  );
}

/**
 * @param {Uint8Array} left
 * @param {Uint8Array} right
 */
function nodeHash(left, right) {
  return sha256(concatBytes([Uint8Array.of(0x01), left, right]), "bytes");
}

/**
 * @param {Uint8Array} bytes
 */
function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Root implied by one disclosed field and its proof (lowercase hex, no 0x).
 * @param {{ path: string; value: unknown; salt: string; proof: Array<{ position: string; hash: string }> }} field
 */
export function merkleRootFromField(field) {
  let hash = merkleLeafHash(field.path, field.value, field.salt);
  const steps = Array.isArray(field.proof) ? field.proof : [];
  for (const step of steps) {
    const sibling = bytes32(step?.hash);
    if (step?.position === "left") hash = nodeHash(sibling, hash);
    else if (step?.position === "right") hash = nodeHash(hash, sibling);
    else throw new Error("Invalid proof step.");
  }
  return toHex(hash);
}

/**
 * @typedef {{
 *   format?: string;
 *   schema_version?: number;
 *   proof_id?: string;
 *   content_hash?: string;
 *   leaf_count?: number;
 *   chain_id?: number | null;
 *   contract_address?: string | null;
 *   tx_hash?: string | null;
 *   block_number?: number | null;
 *   generated_at?: string;
 *   fields?: Array<{ path: string; value: unknown; index?: number; salt: string; proof: Array<{ position: string; hash: string }> }>;
 * }} InvoiceProofDisclosureBundle
 */

/**
 * Recompute every disclosed field against the bundle's `content_hash`.
 * @param {InvoiceProofDisclosureBundle} bundle
 * @returns {{ valid: boolean; contentHash: string; fields: Array<{ path: string; value: unknown; ok: boolean }> }}
 */
export function verifyDisclosureBundle(bundle) {
  if (!bundle || typeof bundle !== "object" || bundle.format !== "invoice-proof-disclosure") {
    throw new Error("Not an invoice proof disclosure file.");
  }
  const contentHash = strip0x(bundle.content_hash ?? "");
  if (!/^[0-9a-f]{64}$/.test(contentHash)) {
    throw new Error("Disclosure has no valid content hash.");
  }
  const fields = (Array.isArray(bundle.fields) ? bundle.fields : []).map((field) => {
    let ok = false;
    try {
      ok = merkleRootFromField(field) === contentHash;
    } catch {
      ok = false;
    }
    return { path: String(field?.path ?? ""), value: field?.value, ok };
  });
  return {
    valid: fields.length > 0 && fields.every((field) => field.ok),
    contentHash,
    fields,
  };
}

/**
 * Laravel snapshot UUID → InvoiceRegistry bytes32 proofId (right-padded).
 * @param {string} uuid
 */
export function proofIdToBytes32(uuid) {
  const hex = String(uuid ?? "").replaceAll("-", "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) {
    throw new Error("Proof id must be a UUID.");
  }
  return `${hex}${"0".repeat(32)}`;
}

/**
 * Read the sealed hash, revocation, and dispute of `invoices(proofId)` from InvoiceRegistry via
 * the injected wallet. `contentHash` is lowercase hex without 0x, or null when the proof is not
 * registered; `revoked` is true once the company cancelled the invoice on chain; `disputed` is
 * true after a buyer dispute. `disputeReasonHash` is `0x` plus 32 bytes when disputed.
 * @param {{ chainId: number; contractAddress: string; proofId: string }} params
 * @returns {Promise<{ contentHash: string | null; revoked: boolean; disputed: boolean; disputeReasonHash: string | null; replacedBy: string | null; sealBroken: boolean }>}
 */
export async function readOnChainSeal({ chainId, contractAddress, proofId }) {
  const ethereum = typeof window !== "undefined" ? window.ethereum : null;
  if (!ethereum || typeof ethereum.request !== "function") {
    throw new Error("missing_wallet");
  }
  const to = `0x${strip0x(contractAddress)}`;
  if (!/^0x[0-9a-f]{40}$/.test(to)) {
    throw new Error("Invalid contract address.");
  }
  const expectedChain = `0x${Number(chainId).toString(16)}`;
  const currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
  if (currentChain !== expectedChain) {
    try {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: expectedChain }] });
    } catch {
      throw new Error("wrong_network");
    }
  }
  const result = await ethereum.request({
    method: "eth_call",
    params: [{ to, data: `${INVOICES_SELECTOR}${proofIdToBytes32(proofId)}` }, "latest"],
  });
  const hex = strip0x(String(result ?? ""));
  const word = hex.slice(0, 64);
  if (!/^[0-9a-f]{64}$/.test(word) || /^0+$/.test(word)) {
    return { contentHash: null, revoked: false, disputed: false, disputeReasonHash: null, replacedBy: null, sealBroken: false };
  }
  const revokedAt = hex.slice(8 * 64, 9 * 64);
  const replacedByWord = hex.slice(9 * 64, 10 * 64);
  const disputedAt = hex.slice(10 * 64, 11 * 64);
  const reasonHash = hex.slice(11 * 64, 12 * 64);
  const disputed = /^[0-9a-f]{64}$/.test(disputedAt) && !/^0+$/.test(disputedAt);
  let sealBroken = false;
  try {
    const seal = await ethereum.request({
      method: "eth_call",
      params: [{ to, data: `0x409bd11c${proofIdToBytes32(proofId)}` }, "latest"],
    });
    const sealWord = strip0x(String(seal ?? ""));
    sealBroken = /^[0-9a-f]{64}$/.test(sealWord) && !/^0+$/.test(sealWord);
  } catch {
    sealBroken = false;
  }
  return {
    contentHash: word,
    revoked: /^[0-9a-f]{64}$/.test(revokedAt) && !/^0+$/.test(revokedAt),
    disputed,
    disputeReasonHash:
      disputed && /^[0-9a-f]{64}$/.test(reasonHash) && !/^0+$/.test(reasonHash) ? `0x${reasonHash}` : null,
    replacedBy: bytes32ToProofId(replacedByWord),
    sealBroken,
  };
}

/**
 * @param {string} hex
 */
function bytes32ToProofId(hex) {
  if (!/^[0-9a-f]{64}$/.test(hex) || /^0+$/.test(hex)) return null;
  const id = hex.slice(0, 32);
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}
