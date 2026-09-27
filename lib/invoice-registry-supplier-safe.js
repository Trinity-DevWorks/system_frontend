/**
 * Company (supplier) approval through a Safe. Anvil uses the local 1-of-1
 * OneOwnerSafe. Sepolia uses Safe{Wallet} + Transaction Service.
 */

import { getAddress } from "viem";

import { BuyerApprovalError, toSupplierApprovalTypedData } from "@/lib/invoice-registry-buyer-approval";

const APPROVE_BY_SUPPLIER_SELECTOR = "0x1d97ab7e";
const ONE_OWNER_SAFE_EXEC_SELECTOR = "0xbe6002c2";
const OWNER_SELECTOR = "0x8da5cb5b";
const ANVIL_CHAIN_ID = 31337;
const SEPOLIA_CHAIN_ID = 11155111;

/**
 * @typedef {{
 *   chainId: number;
 *   contractAddress: string;
 *   supplierWallet: string;
 *   eip712: import("@/lib/invoice-registry-buyer-approval").PartyApprovalEip712;
   *   blockchainNetwork?: string | null;
   *   safeTxServiceUrl?: string | null;
   *   safeApiKey?: string | null;
   * }} SupplierApprovalTx
 */

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
 * @param {unknown} address
 */
function toAddress(address) {
  const hex = strip0x(String(address ?? ""));
  if (!/^[0-9a-f]{40}$/.test(hex)) {
    throw new BuyerApprovalError("failed");
  }
  try {
    return getAddress(`0x${hex}`);
  } catch {
    throw new BuyerApprovalError("failed");
  }
}

/**
 * @param {unknown} data
 */
function checksumSafeTxData(data) {
  if (!data || typeof data !== "object") {
    return data;
  }
  const next = { .../** @type {Record<string, unknown>} */ (data) };
  for (const key of ["to", "gasToken", "refundReceiver"]) {
    if (typeof next[key] === "string" && next[key] !== "") {
      next[key] = toAddress(next[key]);
    }
  }
  return next;
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
 * @param {string} proofId
 * @param {string} contentHash
 * @param {string} invoiceNumber
 * @param {string} statement
 */
export function encodeApproveBySupplier(proofId, contentHash, invoiceNumber, statement) {
  const encodedNumber = encodeDynamicHex(utf8ToHex(invoiceNumber));
  const encodedStatement = encodeDynamicHex(utf8ToHex(statement));
  const headSize = 128;
  const statementOffset = headSize + encodedNumber.length / 2;
  return `0x${
    APPROVE_BY_SUPPLIER_SELECTOR.slice(2) +
    asBytes32Hex(proofId) +
    asBytes32Hex(contentHash) +
    padUint(headSize) +
    padUint(statementOffset) +
    encodedNumber +
    encodedStatement
  }`;
}

/**
 * @param {string} to
 * @param {string} innerData
 */
export function encodeOneOwnerSafeExec(to, innerData) {
  const encodedData = encodeDynamicHex(innerData);
  return (
    ONE_OWNER_SAFE_EXEC_SELECTOR +
    strip0x(toAddress(to)).padStart(64, "0") +
    padUint(64) +
    encodedData
  );
}

/**
 * @param {SupplierApprovalTx} tx
 * @returns {Promise<{ status: "executed" | "proposed"; txHash?: string }>}
 */
export async function sendSupplierApproval(tx) {
  const chainId = Number(tx.chainId);
  const network = String(tx.blockchainNetwork ?? "").toLowerCase();
  if (network === "sepolia" || chainId === SEPOLIA_CHAIN_ID) {
    return sendSepoliaSafeApproval(tx);
  }
  return sendAnvilSafeApproval(tx);
}

/**
 * @param {{ request: (args: { method: string, params?: unknown[] }) => Promise<unknown> }} ethereum
 * @param {number} chainId
 */
async function switchChain(ethereum, chainId) {
  const expectedChain = toHexChainId(chainId).toLowerCase();
  let currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
  if (currentChain !== expectedChain) {
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHexChainId(chainId) }],
      });
      currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") {
        throw new BuyerApprovalError("rejected");
      }
      throw new BuyerApprovalError("wrong_network");
    }
  }
  if (currentChain !== expectedChain) {
    throw new BuyerApprovalError("wrong_network");
  }
}

/**
 * @param {SupplierApprovalTx} tx
 */
function approvalCalldata(tx) {
  const typedData = toSupplierApprovalTypedData(tx.eip712);
  if (typedData.message.invoiceNumber === "" || typedData.message.statement === "") {
    throw new BuyerApprovalError("failed");
  }
  return encodeApproveBySupplier(
    typedData.message.proofId,
    typedData.message.contentHash,
    typedData.message.invoiceNumber,
    typedData.message.statement,
  );
}

/**
 * The Safe call itself is hex. Sign SupplierApproval first so MetaMask shows
 * the sentence. The contract checks `msg.sender` is the Safe, not this signature.
 *
 * @param {{ request: (args: { method: string, params?: unknown[] }) => Promise<unknown> }} ethereum
 * @param {string} from
 * @param {SupplierApprovalTx} tx
 */
async function confirmSupplierStatement(ethereum, from, tx) {
  const typedData = toSupplierApprovalTypedData(tx.eip712);
  if (typedData.message.invoiceNumber === "" || typedData.message.statement === "") {
    throw new BuyerApprovalError("failed");
  }
  const signature = await ethereum.request({
    method: "eth_signTypedData_v4",
    params: [from, JSON.stringify(typedData)],
  });
  if (typeof signature !== "string" || !/^0x[0-9a-f]+$/i.test(signature) || strip0x(signature).length < 130) {
    throw new BuyerApprovalError("failed");
  }
}

/**
 * @param {unknown} error
 */
function rethrowWalletError(error) {
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") {
    throw new BuyerApprovalError("rejected");
  }
  if (error instanceof BuyerApprovalError) throw error;
  throw new BuyerApprovalError("failed");
}

/**
 * @param {SupplierApprovalTx} tx
 * @returns {Promise<{ status: "executed"; txHash: string }>}
 */
async function sendAnvilSafeApproval(tx) {
  const ethereum = getEthereum();
  if (!ethereum) {
    throw new BuyerApprovalError("missing_wallet");
  }

  const safe = toAddress(tx.supplierWallet);
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const from = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
  const connected = from.toLowerCase();
  if (!connected) {
    throw new BuyerApprovalError("missing_wallet");
  }

  await switchChain(ethereum, tx.chainId === ANVIL_CHAIN_ID ? ANVIL_CHAIN_ID : Number(tx.chainId));

  const code = await ethereum.request({ method: "eth_getCode", params: [safe, "latest"] });
  if (typeof code !== "string" || code === "" || code === "0x" || code === "0x0") {
    throw new BuyerApprovalError("company_safe_required");
  }

  const ownerWord = await ethereum.request({
    method: "eth_call",
    params: [{ to: safe, data: OWNER_SELECTOR }, "latest"],
  });
  const ownerHex = typeof ownerWord === "string" ? strip0x(ownerWord) : "";
  const owner = ownerHex.length >= 40 ? `0x${ownerHex.slice(-40)}` : "";
  if (!owner || connected !== owner) {
    throw new BuyerApprovalError("not_safe_owner");
  }

  try {
    await confirmSupplierStatement(ethereum, from, tx);
    const inner = approvalCalldata(tx);
    const data = encodeOneOwnerSafeExec(tx.contractAddress, inner);
    const hash = await ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to: safe,
          data: `0x${strip0x(data)}`,
          chainId: toHexChainId(tx.chainId),
          gas: "0x7a120",
        },
      ],
    });
    if (typeof hash !== "string" || hash === "") {
      throw new BuyerApprovalError("failed");
    }
    return { status: "executed", txHash: hash };
  } catch (error) {
    rethrowWalletError(error);
    throw new BuyerApprovalError("failed");
  }
}

/**
 * @param {SupplierApprovalTx} tx
 * @returns {Promise<{ status: "executed" | "proposed"; txHash?: string }>}
 */
async function sendSepoliaSafeApproval(tx) {
  const ethereum = getEthereum();
  if (!ethereum) {
    throw new BuyerApprovalError("missing_wallet");
  }

  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const rawFrom = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
  if (!rawFrom) {
    throw new BuyerApprovalError("missing_wallet");
  }
  const from = toAddress(rawFrom);

  await switchChain(ethereum, SEPOLIA_CHAIN_ID);

  const safeAddress = toAddress(tx.supplierWallet);

  try {
    await confirmSupplierStatement(ethereum, from, tx);
  } catch (error) {
    rethrowWalletError(error);
    throw new BuyerApprovalError("failed");
  }

  const inner = approvalCalldata(tx);
  const serviceUrl =
    typeof tx.safeTxServiceUrl === "string" && tx.safeTxServiceUrl.trim() !== ""
      ? tx.safeTxServiceUrl.trim().replace(/\/$/, "")
      : "https://api.safe.global/tx-service/sep/api";

  try {
    const protocolMod = await import("@safe-global/protocol-kit");
    const apiMod = await import("@safe-global/api-kit");
    const Safe = protocolMod.default ?? protocolMod.Safe ?? protocolMod;
    const SafeApiKit = apiMod.default ?? apiMod.SafeApiKit ?? apiMod;

    const protocolKit = await Safe.init({
      provider: ethereum,
      signer: from,
      safeAddress,
    });

    const owners = await protocolKit.getOwners();
    const ownerSet = new Set(
      (Array.isArray(owners) ? owners : []).map((owner) => String(owner).toLowerCase()),
    );
    if (!ownerSet.has(from.toLowerCase())) {
      throw new BuyerApprovalError("not_safe_owner");
    }

    const safeTransaction = await protocolKit.createTransaction({
      transactions: [
        {
          to: toAddress(tx.contractAddress),
          value: "0",
          data: inner,
        },
      ],
    });
    const signed = await protocolKit.signTransaction(safeTransaction);
    const safeTxHash = await protocolKit.getTransactionHash(signed);

    const apiKit = new SafeApiKit({
      chainId: BigInt(SEPOLIA_CHAIN_ID),
      txServiceUrl: serviceUrl,
      ...(typeof tx.safeApiKey === "string" && tx.safeApiKey.trim() !== ""
        ? { apiKey: tx.safeApiKey.trim() }
        : {}),
    });

    const senderSignature = signed.encodedSignatures();

    await apiKit.proposeTransaction({
      safeAddress,
      safeTransactionData: checksumSafeTxData(signed.data),
      safeTxHash,
      senderAddress: from,
      senderSignature,
    });

    const threshold = Number(await protocolKit.getThreshold());
    const signatureCount =
      signed && signed.signatures instanceof Map
        ? signed.signatures.size
        : senderSignature
          ? 1
          : 0;
    if (signatureCount >= threshold) {
      const executed = await protocolKit.executeTransaction(signed);
      const hash =
        executed && typeof executed === "object" && "hash" in executed
          ? String(executed.hash)
          : "";
      if (hash === "") {
        throw new BuyerApprovalError("failed");
      }
      return { status: "executed", txHash: hash };
    }

    return { status: "proposed" };
  } catch (error) {
    rethrowWalletError(error);
    throw new BuyerApprovalError("failed");
  }
}
