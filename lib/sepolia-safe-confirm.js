/**
 * Sepolia Safe{Wallet} confirmations via the Transaction Service.
 * Owners confirm here; execution stays in Safe{Wallet}.
 */

import { getAddress } from "viem";
import { BuyerApprovalError } from "@/lib/invoice-registry-buyer-approval";
import { SafeExecutionError } from "@/lib/safe-execution";
import {
  APPROVE_BY_SUPPLIER_SELECTOR,
  SEPOLIA_CHAIN_ID,
  createSepoliaSafeApiKit,
  fetchSafeCompanyApprovalQueue,
  sepoliaSafeTxServiceUrl,
} from "@/lib/safe-company-approval-queue";

/**
 * @param {unknown} address
 */
function toAddress(address) {
  try {
    return getAddress(String(address ?? ""));
  } catch {
    throw new BuyerApprovalError("failed");
  }
}

/**
 * @param {unknown} data
 */
function checksumSafeTxData(data) {
  if (!data || typeof data !== "object") return data;
  const next = { .../** @type {Record<string, unknown>} */ (data) };
  for (const key of ["to", "gasToken", "refundReceiver"]) {
    if (typeof next[key] === "string" && next[key] !== "") {
      next[key] = toAddress(next[key]);
    }
  }
  return next;
}

/**
 * @param {unknown} error
 */
function isAlreadyConfirmedSafeError(error) {
  const message = String(
    error && typeof error === "object" && "message" in error ? error.message : error ?? "",
  ).toLowerCase();
  return (
    message.includes("gs026") ||
    (message.includes("already") && (message.includes("sign") || message.includes("confirm")))
  );
}

/**
 * @param {{
 *   protocolKit: {
 *     createTransaction: (args: unknown) => Promise<unknown>;
 *     getTransactionHash: (tx: unknown) => Promise<string>;
 *     signTransaction: (tx: unknown) => Promise<{
 *       signatures?: Map<string, { data?: string }>;
 *       encodedSignatures: () => string;
 *     }>;
 *     signHash: (hash: string) => Promise<{ data?: string }>;
 *   };
 *   apiKit: {
 *     getTransaction: (hash: string) => Promise<Record<string, unknown>>;
 *     confirmTransaction: (hash: string, signature: string) => Promise<unknown>;
 *   };
 *   safeTxHash: string;
 *   from: string;
 * }} args
 */
async function confirmExistingSafeTx({ protocolKit, apiKit, safeTxHash, from }) {
  try {
    const pending = await apiKit.getTransaction(safeTxHash);
    const safeTransaction = await protocolKit.createTransaction({
      transactions: [
        {
          to: toAddress(pending.to),
          value: String(pending.value ?? "0"),
          data: typeof pending.data === "string" && pending.data !== "" ? pending.data : "0x",
          operation: pending.operation,
        },
      ],
      options: {
        nonce: Number(pending.nonce),
        safeTxGas: pending.safeTxGas,
        baseGas: pending.baseGas,
        gasPrice: pending.gasPrice,
        gasToken: pending.gasToken,
        refundReceiver: pending.refundReceiver,
      },
    });
    const reconstructedHash = await protocolKit.getTransactionHash(safeTransaction);
    let signatureData = "";
    if (reconstructedHash.toLowerCase() === String(safeTxHash).toLowerCase()) {
      const signed = await protocolKit.signTransaction(safeTransaction);
      const ownerKey = from.toLowerCase();
      let ownerSig = null;
      if (signed.signatures instanceof Map) {
        for (const [key, value] of signed.signatures) {
          if (String(key).toLowerCase() === ownerKey) {
            ownerSig = value;
            break;
          }
        }
        if (!ownerSig) ownerSig = [...signed.signatures.values()][0] ?? null;
      }
      signatureData =
        ownerSig && typeof ownerSig.data === "string" && ownerSig.data !== ""
          ? ownerSig.data
          : signed.encodedSignatures();
    } else {
      const signature = await protocolKit.signHash(safeTxHash);
      signatureData = typeof signature?.data === "string" ? signature.data : "";
    }
    if (signatureData === "") throw new BuyerApprovalError("failed");
    await apiKit.confirmTransaction(safeTxHash, signatureData);
  } catch (error) {
    if (error instanceof BuyerApprovalError) throw error;
    if (isAlreadyConfirmedSafeError(error)) throw new BuyerApprovalError("pending_confirmations");
    throw error;
  }
}

/**
 * @param {{
 *   ethereum: { request: Function };
 *   from: string;
 *   safeAddress: string;
 *   contractAddress: string;
 *   data: string;
 *   proofId?: unknown;
 *   selector?: string;
 *   txServiceUrl?: string | null;
 *   apiKey?: string | null;
 *   beforeWrite?: () => Promise<void>;
 * }} args
 * @returns {Promise<{ status: "proposed"; confirmations_complete?: boolean }>}
 */
export async function proposeOrConfirmSepoliaSafeCall({
  ethereum,
  from,
  safeAddress,
  contractAddress,
  data,
  proofId,
  selector = APPROVE_BY_SUPPLIER_SELECTOR,
  txServiceUrl,
  apiKey,
  beforeWrite,
}) {
  const protocolMod = await import("@safe-global/protocol-kit");
  const Safe = protocolMod.default ?? protocolMod.Safe ?? protocolMod;
  const checksumSafe = toAddress(safeAddress);
  const checksumFrom = toAddress(from);

  const protocolKit = await Safe.init({
    provider: ethereum,
    signer: checksumFrom,
    safeAddress: checksumSafe,
  });

  const owners = await protocolKit.getOwners();
  const ownerSet = new Set((Array.isArray(owners) ? owners : []).map((owner) => String(owner).toLowerCase()));
  if (!ownerSet.has(checksumFrom.toLowerCase())) {
    throw new BuyerApprovalError("not_safe_owner");
  }

  const apiKit = await createSepoliaSafeApiKit({
    chainId: SEPOLIA_CHAIN_ID,
    txServiceUrl: sepoliaSafeTxServiceUrl(txServiceUrl),
    apiKey,
  });
  const threshold = Number(await protocolKit.getThreshold());
  const queueArgs = {
    apiKit,
    chainId: SEPOLIA_CHAIN_ID,
    safeAddress: checksumSafe,
    contractAddress,
    proofId,
    connected: checksumFrom,
    selector,
  };
  const queue = await fetchSafeCompanyApprovalQueue(queueArgs);

  if (queue?.alreadyConfirmedByConnected) {
    throw new BuyerApprovalError("pending_confirmations");
  }
  if (queue?.readyToExecute) {
    throw new BuyerApprovalError("waiting_company_execute");
  }

  if (beforeWrite) await beforeWrite();

  if (queue?.safeTxHash) {
    await confirmExistingSafeTx({ protocolKit, apiKit, safeTxHash: queue.safeTxHash, from: checksumFrom });
    const nextCount = queue.confirmed.length + 1;
    return {
      status: "proposed",
      confirmations_complete: Number.isFinite(threshold) && nextCount >= threshold,
    };
  }

  try {
    const safeTransaction = await protocolKit.createTransaction({
      transactions: [
        {
          to: toAddress(contractAddress),
          value: "0",
          data,
        },
      ],
    });
    const signed = await protocolKit.signTransaction(safeTransaction);
    const safeTxHash = await protocolKit.getTransactionHash(signed);
    await apiKit.proposeTransaction({
      safeAddress: checksumSafe,
      safeTransactionData: checksumSafeTxData(signed.data),
      safeTxHash,
      senderAddress: checksumFrom,
      senderSignature: signed.encodedSignatures(),
    });
    return {
      status: "proposed",
      confirmations_complete: Number.isFinite(threshold) && threshold <= 1,
    };
  } catch (proposeError) {
    if (proposeError instanceof BuyerApprovalError) throw proposeError;
    const again = await fetchSafeCompanyApprovalQueue(queueArgs);
    if (again?.alreadyConfirmedByConnected) throw new BuyerApprovalError("pending_confirmations");
    if (again?.safeTxHash) {
      await confirmExistingSafeTx({ protocolKit, apiKit, safeTxHash: again.safeTxHash, from: checksumFrom });
      const nextCount = again.confirmed.length + 1;
      return {
        status: "proposed",
        confirmations_complete: Number.isFinite(threshold) && nextCount >= threshold,
      };
    }
    throw proposeError;
  }
}

/**
 * @param {unknown} error
 * @returns {never}
 */
export function rethrowSepoliaSafeError(error) {
  if (error instanceof BuyerApprovalError) throw error;
  if (error instanceof SafeExecutionError) {
    throw new BuyerApprovalError(error.code === "invalid_safe" ? "wallet_mismatch" : error.code);
  }
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") {
    throw new BuyerApprovalError("rejected");
  }
  throw new BuyerApprovalError("failed");
}
