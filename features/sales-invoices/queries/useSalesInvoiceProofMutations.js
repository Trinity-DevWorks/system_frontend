"use client";

import { SALES_INVOICES_QUERY_KEY, salesInvoiceProofQueryKey } from "./salesInvoicesQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { BuyerApprovalError } from "@/lib/invoice-registry-buyer-approval";
import { sendSupplierApproval } from "@/lib/invoice-registry-supplier-safe";
import { verifySalesInvoice } from "../api/salesInvoices.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

const ROW_PROOF_MESSAGE_KEY = "sales-invoice-row-proof";

/**
 * Proof refresh and company approval, shared by the sales invoice drawer and list rows.
 *
 * @param {{
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 * }} args
 */
export function useSalesInvoiceProofMutations({ message, notification, t, tApiErrors }) {
  const queryClient = useQueryClient();

  const storeProof = useCallback(
    (id, result) => {
      if (id == null || !result) return;
      queryClient.setQueryData(salesInvoiceProofQueryKey(id), result);
      queryClient.invalidateQueries({ queryKey: SALES_INVOICES_QUERY_KEY });
    },
    [queryClient],
  );

  const notifyManualProofCheck = useCallback(
    (result) => {
      const status = result && typeof result === "object" ? result.status : null;
      if (status === "verified") {
        message.success(t("verifySuccessVerified"));
      } else if (status === "tampered") {
        notification.error({
          title: t("proofStatusTampered"),
          description: t("verifySuccessTampered"),
        });
      } else if (status === "pending_chain") {
        message.warning(t("verifySuccessPendingChain"));
      } else if (status === "waiting_company") {
        message.info(t("verifySuccessWaitingCompany"));
      } else if (status === "waiting_buyer") {
        message.info(t("verifySuccessWaitingBuyer"));
      } else if (status === "fully_approved") {
        message.success(t("verifySuccessFullyApproved"));
      } else if (status === "revoked") {
        message.info(t("verifySuccessRevoked"));
      } else {
        message.warning(t("verifySuccessNotRegistered"));
      }
    },
    [message, notification, t],
  );

  const verifyMutation = useMutation({
    mutationFn: (/** @type {string} */ invoiceId) => verifySalesInvoice(invoiceId),
    onError: (err) => {
      notification.error({
        title: t("verifyError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (result, invoiceId) => {
      notifyManualProofCheck(result);
      storeProof(invoiceId, result);
    },
  });

  const approveCompanyMutation = useMutation({
    mutationFn: async (/** @type {{ invoiceId: string; proof: Record<string, unknown> | null }} */ { invoiceId, proof }) => {
      const chainId = Number(proof?.chain_id);
      const contractAddress = typeof proof?.contract_address === "string" ? proof.contract_address : "";
      const supplierWallet = typeof proof?.supplier_wallet === "string" ? proof.supplier_wallet : "";
      const eip712 = proof?.eip712 && typeof proof.eip712 === "object" ? proof.eip712 : null;
      if (
        !Number.isFinite(chainId) ||
        chainId <= 0 ||
        contractAddress === "" ||
        supplierWallet === "" ||
        eip712 == null
      ) {
        throw new BuyerApprovalError("failed");
      }
      const blockchainNetwork =
        typeof proof?.blockchain_network === "string" ? proof.blockchain_network : null;
      const safeTxServiceUrl =
        typeof proof?.safe_tx_service_url === "string" ? proof.safe_tx_service_url : null;
      const safeApiKey = typeof proof?.safe_api_key === "string" ? proof.safe_api_key : null;
      const result = await sendSupplierApproval({
        chainId,
        contractAddress,
        supplierWallet,
        eip712,
        blockchainNetwork,
        safeTxServiceUrl,
        safeApiKey,
      });
      if (result.status === "proposed") {
        return { ...((await verifySalesInvoice(invoiceId)) ?? {}), _companyApprovalProposed: true };
      }
      return verifySalesInvoice(invoiceId);
    },
    onError: (err) => {
      const code = err instanceof BuyerApprovalError ? err.code : null;
      let description = t("approveCompanyError");
      if (code === "missing_wallet") description = t("approveCompanyWalletMissing");
      else if (code === "wallet_mismatch" || code === "not_safe_owner")
        description = t("approveCompanyWalletMismatch");
      else if (code === "wrong_network") description = t("approveCompanyWrongNetwork");
      else if (code === "rejected") description = t("approveCompanyRejected");
      else description = getLocalizedApiErrorMessage(tApiErrors, err) || t("approveCompanyError");
      notification.error({
        title: t("approveCompanyError"),
        description,
      });
    },
    onSuccess: (result, { invoiceId }) => {
      if (result && result._companyApprovalProposed) {
        message.info(t("approveCompanyProposed"));
      } else {
        message.success(t("approveCompanySuccess"));
      }
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

  /** Re-reads the chain first: the list status may be stale and signing needs fresh typed data. */
  const approveFromRow = useCallback(
    async (/** @type {string} */ invoiceId) => {
      message.loading({ key: ROW_PROOF_MESSAGE_KEY, content: t("rowProofChecking"), duration: 0 });
      let proof;
      try {
        proof = await verifySalesInvoice(invoiceId);
      } catch (err) {
        message.destroy(ROW_PROOF_MESSAGE_KEY);
        notification.error({
          title: t("verifyError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
        return;
      }
      storeProof(invoiceId, proof);

      if (!proof?.can_approve_as_company) {
        message.destroy(ROW_PROOF_MESSAGE_KEY);
        if (proof?.status === "waiting_company") {
          message.warning(t("approveCompanyUnavailable"));
        } else {
          notifyManualProofCheck(proof);
        }
        return;
      }

      message.loading({ key: ROW_PROOF_MESSAGE_KEY, content: t("rowProofApproving"), duration: 0 });
      try {
        await approveCompanyMutation.mutateAsync({ invoiceId, proof });
      } catch {
        // approveCompanyMutation.onError already notified.
      } finally {
        message.destroy(ROW_PROOF_MESSAGE_KEY);
      }
    },
    [approveCompanyMutation, message, notification, notifyManualProofCheck, storeProof, t, tApiErrors],
  );

  return {
    verifyMutation,
    approveCompanyMutation,
    refreshFromRow,
    approveFromRow,
  };
}
