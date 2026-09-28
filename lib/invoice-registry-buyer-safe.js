/**
 * Buyer approval when the customer wallet is a Safe. The Safe executing
 * `approveByBuyer` is the approval (the contract ignores the signature), so the
 * connected owner runs it through the Safe. An EOA buyer uses
 * `invoice-registry-buyer-approval.js`.
 */

import {
  BuyerApprovalError,
  encodeApproveByBuyer,
  toBuyerApprovalTypedData,
} from "@/lib/invoice-registry-buyer-approval";
import { executeThroughSafe, SafeExecutionError } from "@/lib/safe-execution";

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
 * @param {import("@/lib/invoice-registry-buyer-approval").BuyerApprovalTx} tx
 * @returns {Promise<{ status: "executed" | "proposed"; txHash: string }>}
 */
export async function sendBuyerSafeApproval(tx) {
  const ethereum = typeof window !== "undefined" ? window.ethereum : null;
  if (!ethereum || typeof ethereum.request !== "function") throw new BuyerApprovalError("missing_wallet");

  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const from = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
  if (!from) throw new BuyerApprovalError("missing_wallet");

  await switchChain(ethereum, tx.chainId);

  const typedData = toBuyerApprovalTypedData(tx.eip712);
  if (typedData.message.invoiceNumber === "" || typedData.message.statement === "") {
    throw new BuyerApprovalError("failed");
  }

  try {
    // Shows the approval sentence in MetaMask; the contract checks the Safe as msg.sender, not this signature.
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
      data: encodeApproveByBuyer(
        typedData.message.proofId,
        typedData.message.contentHash,
        typedData.message.invoiceNumber,
        typedData.message.statement,
        "",
      ),
    });
  } catch (error) {
    rethrowWalletError(error);
  }
}
