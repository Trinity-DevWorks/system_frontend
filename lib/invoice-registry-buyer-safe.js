/**
 * Buyer approval when the customer wallet is a Safe. The Safe executing
 * `approveByBuyer` is the approval (the contract ignores the signature), so the
 * connected owner runs it through the Safe. An EOA buyer uses
 * `invoice-registry-buyer-approval.js`.
 */

import {
  BuyerApprovalError,
  encodeApproveByBuyer,
  encodeDisputeByBuyer,
  toBuyerApprovalTypedData,
  toBuyerDisputeTypedData,
  disputeReasonHash,
} from "@/lib/invoice-registry-buyer-approval";
import { APPROVE_BY_BUYER_SELECTOR, SEPOLIA_CHAIN_ID } from "@/lib/safe-company-approval-queue";
import { proposeOrConfirmSepoliaSafeCall, rethrowSepoliaSafeError } from "@/lib/sepolia-safe-confirm";
import { assertConnectedSafeOwner, executeThroughSafe, SafeExecutionError } from "@/lib/safe-execution";

/**
 * @param {unknown} error
 * @returns {never}
 */
function rethrowWalletError(error) {
  if (error instanceof BuyerApprovalError) throw error;
  if (error instanceof SafeExecutionError) {
    throw new BuyerApprovalError(error.code === "invalid_safe" ? "wallet_mismatch" : error.code);
  }
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") throw new BuyerApprovalError("rejected");
  throw new BuyerApprovalError("failed");
}

/**
 * @param {{ request: (args: { method: string, params?: unknown[] }) => Promise<unknown> }} ethereum
 * @param {number} chainId
 */
async function switchChain(ethereum, chainId) {
  const expectedChain = `0x${Number(chainId).toString(16)}`;
  let currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
  if (currentChain !== expectedChain) {
    try {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: expectedChain }] });
      currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") throw new BuyerApprovalError("rejected");
      throw new BuyerApprovalError("wrong_network");
    }
  }
  if (currentChain !== expectedChain) throw new BuyerApprovalError("wrong_network");
}

/**
 * @param {import("@/lib/invoice-registry-buyer-approval").BuyerApprovalTx & {
 *   safeTxServiceUrl?: string | null;
 *   safeApiKey?: string | null;
 * }} tx
 * @returns {Promise<{ status: "executed" | "proposed"; txHash?: string; confirmations_complete?: boolean }>}
 */
export async function sendBuyerSafeApproval(tx) {
  const ethereum = typeof window !== "undefined" ? window.ethereum : null;
  if (!ethereum || typeof ethereum.request !== "function") throw new BuyerApprovalError("missing_wallet");

  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const from = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
  if (!from) throw new BuyerApprovalError("missing_wallet");

  await switchChain(ethereum, tx.chainId);
  try {
    await assertConnectedSafeOwner(ethereum, from, tx.buyerWallet);
  } catch (error) {
    rethrowWalletError(error);
  }

  const typedData = toBuyerApprovalTypedData(tx.eip712);
  if (typedData.message.invoiceNumber === "" || typedData.message.statement === "") {
    throw new BuyerApprovalError("failed");
  }

  const data = encodeApproveByBuyer(
    typedData.message.proofId,
    typedData.message.contentHash,
    typedData.message.invoiceNumber,
    typedData.message.statement,
    "",
  );

  const confirmStatement = async () => {
    const confirmation = await ethereum.request({
      method: "eth_signTypedData_v4",
      params: [from, JSON.stringify(typedData)],
    });
    if (typeof confirmation !== "string" || !/^0x[0-9a-f]{130,}$/i.test(confirmation)) {
      throw new BuyerApprovalError("failed");
    }
  };

  try {
    if (Number(tx.chainId) === SEPOLIA_CHAIN_ID) {
      return await proposeOrConfirmSepoliaSafeCall({
        ethereum,
        from,
        safeAddress: tx.buyerWallet,
        contractAddress: tx.contractAddress,
        data,
        proofId: tx.eip712?.message?.proof_id ?? typedData.message.proofId,
        selector: APPROVE_BY_BUYER_SELECTOR,
        txServiceUrl: tx.safeTxServiceUrl,
        apiKey: tx.safeApiKey,
        beforeWrite: confirmStatement,
      });
    }
    await confirmStatement();
    return await executeThroughSafe({
      ethereum,
      from,
      safeAddress: tx.buyerWallet,
      to: tx.contractAddress,
      data,
    });
  } catch (error) {
    rethrowSepoliaSafeError(error);
  }
}

/**
 * @param {import("@/lib/invoice-registry-buyer-approval").BuyerApprovalTx & { reason: string; eip712: import("@/lib/invoice-registry-buyer-approval").PartyApprovalEip712 }} tx
 * @returns {Promise<{ status: "executed" | "proposed"; txHash: string }>}
 */
export async function sendBuyerSafeDispute(tx) {
  const ethereum = typeof window !== "undefined" ? window.ethereum : null;
  if (!ethereum || typeof ethereum.request !== "function") throw new BuyerApprovalError("missing_wallet");

  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const from = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
  if (!from) throw new BuyerApprovalError("missing_wallet");

  await switchChain(ethereum, tx.chainId);
  try {
    await assertConnectedSafeOwner(ethereum, from, tx.buyerWallet);
  } catch (error) {
    rethrowWalletError(error);
  }

  const reason = String(tx.reason ?? "").trim();
  if (reason === "") throw new BuyerApprovalError("failed");
  const reasonHash = disputeReasonHash(reason);
  const typedData = toBuyerDisputeTypedData(tx.eip712, reasonHash);
  if (typedData.message.invoiceNumber === "" || typedData.message.statement === "") {
    throw new BuyerApprovalError("failed");
  }

  try {
    const confirmation = await ethereum.request({
      method: "eth_signTypedData_v4",
      params: [from, JSON.stringify(typedData)],
    });
    if (typeof confirmation !== "string" || !/^0x[0-9a-f]{130,}$/i.test(confirmation)) {
      throw new BuyerApprovalError("failed");
    }

    return await executeThroughSafe({
      ethereum,
      from,
      safeAddress: tx.buyerWallet,
      to: tx.contractAddress,
      data: encodeDisputeByBuyer(
        typedData.message.proofId,
        typedData.message.contentHash,
        typedData.message.reasonHash,
        typedData.message.invoiceNumber,
        typedData.message.statement,
        "",
      ),
    });
  } catch (error) {
    rethrowWalletError(error);
  }
}
