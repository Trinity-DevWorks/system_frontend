"use client";

import { PURCHASE_INVOICES_QUERY_KEY, purchaseInvoiceProofQueryKey } from "./purchaseInvoicesQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { BuyerApprovalError, sendBuyerApproval, sendBuyerDispute } from "@/lib/invoice-registry-buyer-approval";
import { sendBuyerSafeApproval, sendBuyerSafeDispute } from "@/lib/invoice-registry-buyer-safe";
import { recordPurchaseInvoiceDispute, verifyPurchaseInvoice } from "../api/purchaseInvoices.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

const ROW_PROOF_MESSAGE_KEY = "purchase-invoice-row-proof";

/**
 * @param {(key: string) => string} t
 * @param {(key: string) => string} tSales
 * @param {(key: string) => string} tApiErrors
 * @param {unknown} err
 * @param {string} fallback
 */
function buyerWalletErrorDescription(t, tSales, tApiErrors, err, fallback) {
  const code = err instanceof BuyerApprovalError ? err.code : null;
  if (code === "missing_wallet") return t("approveBuyerWalletMissing");
  if (code === "wallet_mismatch") return t("approveBuyerWalletMismatch");
  if (code === "not_safe_owner") return t("approveBuyerNotSafeOwner");
  if (code === "wrong_network") return tSales("approveCompanyWrongNetwork");
  if (code === "rejected") return tSales("approveCompanyRejected");
  if (code === "pending_confirmations") return t("approveBuyerPendingConfirmations");
  return getLocalizedApiErrorMessage(tApiErrors, err) || fallback;
}

/**
 * @param {{
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tSales: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 * }} args
 */
export function usePurchaseInvoiceProofMutations({ message, notification, t, tSales, tApiErrors }) {
  const queryClient = useQueryClient();

  const notifyManualProofCheck = useCallback(
    (result) => {
      const status = result && typeof result === "object" ? result.status : null;
      if (status === "verified") message.success(tSales("verifySuccessVerified"));
      else if (status === "tampered") {
        notification.error({ title: tSales("proofStatusTampered"), description: tSales("verifySuccessTampered") });
      } else if (status === "pending_chain") message.info(tSales("verifySuccessPendingChain"));
      else if (status === "waiting_company") message.info(t("verifySuccessWaitingSupplier"));
      else if (status === "waiting_buyer") message.info(t("verifySuccessWaitingBuyer"));
      else if (status === "fully_approved") message.success(tSales("verifySuccessFullyApproved"));
      else if (status === "revoked") message.info(tSales("verifySuccessRevoked"));
      else if (status === "disputed") message.warning(tSales("verifySuccessDisputed"));
      else message.warning(tSales("verifySuccessNotRegistered"));
    },
    [message, notification, t, tSales],
  );

  const storeProof = useCallback(
    (id, result) => {
      if (id == null || !result) return;
      queryClient.setQueryData(purchaseInvoiceProofQueryKey(id), result);
      queryClient.invalidateQueries({ queryKey: PURCHASE_INVOICES_QUERY_KEY });
    },
    [queryClient],
  );

  const verifyMutation = useMutation({
    mutationFn: (/** @type {string} */ invoiceId) => verifyPurchaseInvoice(invoiceId),
    onError: (err) => {
      notification.error({
        title: tSales("verifyError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (result, invoiceId) => {
      notifyManualProofCheck(result);
      storeProof(invoiceId, result);
    },
  });

  const approveBuyerMutation = useMutation({
    mutationFn: async (/** @type {{ invoiceId: string; proof: Record<string, unknown> | null }} */ { invoiceId, proof }) => {
      const chainId = Number(proof?.chain_id);
      const contractAddress = typeof proof?.contract_address === "string" ? proof.contract_address : "";
      const buyerWallet = typeof proof?.buyer_wallet === "string" ? proof.buyer_wallet : "";
      const eip712 = proof?.eip712 && typeof proof.eip712 === "object" ? proof.eip712 : null;
      if (!Number.isFinite(chainId) || chainId <= 0 || contractAddress === "" || buyerWallet === "" || eip712 == null) {
        throw new BuyerApprovalError("failed");
      }
      const walletType = typeof proof?.buyer_wallet_type === "string" ? proof.buyer_wallet_type : "";
      if (walletType === "safe") {
        const sent = await sendBuyerSafeApproval({ chainId, contractAddress, buyerWallet, eip712 });
        if (sent.status === "proposed") {
          return { ...(await verifyPurchaseInvoice(invoiceId)), _proposed: true };
        }
        return verifyPurchaseInvoice(invoiceId);
      }
      await sendBuyerApproval({ chainId, contractAddress, buyerWallet, eip712 });
      return verifyPurchaseInvoice(invoiceId);
    },
    onError: (err) => {
      notification.error({
        title: t("actionApproveAsBuyer"),
        description: buyerWalletErrorDescription(t, tSales, tApiErrors, err, tSales("approveCompanyError")),
      });
    },
    onSuccess: (result, { invoiceId }) => {
      if (result && result._proposed) message.info(tSales("approveCompanyProposed"));
      else message.success(tSales("approveCompanySuccess"));
      storeProof(invoiceId, result);
    },
  });

  const disputeBuyerMutation = useMutation({
    mutationFn: async (
      /** @type {{ invoiceId: string; proof: Record<string, unknown> | null; reason: string }} */ {
        invoiceId,
        proof,
        reason,
      },
    ) => {
      const chainId = Number(proof?.chain_id);
      const contractAddress = typeof proof?.contract_address === "string" ? proof.contract_address : "";
      const buyerWallet = typeof proof?.buyer_wallet === "string" ? proof.buyer_wallet : "";
      const eip712 = proof?.dispute_eip712 && typeof proof.dispute_eip712 === "object" ? proof.dispute_eip712 : null;
      if (!Number.isFinite(chainId) || chainId <= 0 || contractAddress === "" || buyerWallet === "" || eip712 == null) {
        throw new BuyerApprovalError("failed");
      }
      const walletType = typeof proof?.buyer_wallet_type === "string" ? proof.buyer_wallet_type : "";
      let txHash = "";
      if (walletType === "safe") {
        const sent = await sendBuyerSafeDispute({ chainId, contractAddress, buyerWallet, eip712, reason });
        if (sent.status === "proposed") return { proposed: true, result: await verifyPurchaseInvoice(invoiceId) };
        txHash = typeof sent.txHash === "string" ? sent.txHash : "";
      } else {
        txHash = await sendBuyerDispute({ chainId, contractAddress, buyerWallet, eip712, reason });
      }
      await recordPurchaseInvoiceDispute(invoiceId, { reason, tx_hash: txHash });
      return { proposed: false, result: await verifyPurchaseInvoice(invoiceId) };
    },
    onError: (err) => {
      notification.error({
        title: t("disputeError"),
        description: buyerWalletErrorDescription(t, tSales, tApiErrors, err, t("disputeError")),
      });
    },
    onSuccess: ({ proposed, result }, { invoiceId }) => {
      if (proposed) message.info(t("disputeSafeProposed"));
      else message.success(t("disputeSuccess"));
      storeProof(invoiceId, result);
    },
  });

  const refreshFromRow = useCallback(
    async (/** @type {string} */ invoiceId) => {
      message.loading({ key: ROW_PROOF_MESSAGE_KEY, content: t("rowProofChecking"), duration: 0 });
      try {
        await verifyMutation.mutateAsync(invoiceId);
      } catch {
        // verifyMutation.onError already notified.
      } finally {
        message.destroy(ROW_PROOF_MESSAGE_KEY);
      }
    },
    [message, t, verifyMutation],
  );

  const approveFromRow = useCallback(
    async (/** @type {string} */ invoiceId) => {
      message.loading({ key: ROW_PROOF_MESSAGE_KEY, content: t("rowProofChecking"), duration: 0 });
      let proof;
      try {
        proof = await verifyPurchaseInvoice(invoiceId);
      } catch (err) {
        message.destroy(ROW_PROOF_MESSAGE_KEY);
        notification.error({
          title: tSales("verifyError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
        return;
      }
      storeProof(invoiceId, proof);

      if (!proof?.can_approve_as_buyer) {
        message.destroy(ROW_PROOF_MESSAGE_KEY);
        if (proof?.status === "waiting_buyer") {
          message.warning(t("approveBuyerUnavailable"));
        } else {
          notifyManualProofCheck(proof);
        }
        return;
      }

      message.loading({ key: ROW_PROOF_MESSAGE_KEY, content: t("rowProofApproving"), duration: 0 });
      try {
        await approveBuyerMutation.mutateAsync({ invoiceId, proof });
      } catch {
        // approveBuyerMutation.onError already notified.
      } finally {
        message.destroy(ROW_PROOF_MESSAGE_KEY);
      }
    },
    [approveBuyerMutation, message, notification, notifyManualProofCheck, storeProof, t, tApiErrors, tSales],
  );

  return {
    verifyMutation,
    approveBuyerMutation,
    disputeBuyerMutation,
    refreshFromRow,
    approveFromRow,
  };
}
