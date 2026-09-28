"use client";

import { SALES_INVOICE_DETAIL_QUERY_PREFIX, SALES_INVOICES_QUERY_KEY, salesInvoiceProofQueryKey } from "./salesInvoicesQueryKeys";
import { STOCK_BALANCES_QUERY_KEY, STOCK_MOVEMENTS_QUERY_KEY } from "@/features/stock/queries/stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { BuyerApprovalError } from "@/lib/invoice-registry-buyer-approval";
import { sendSupplierApproval } from "@/lib/invoice-registry-supplier-safe";
import {
  createSalesInvoice,
  deleteSalesInvoice,
  fetchSalesInvoice,
  postSalesInvoice,
  reverseSalesInvoice,
  syncSalesInvoiceLines,
  updateSalesInvoice,
  verifySalesInvoice,
} from "../api/salesInvoices.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  getValidSalesInvoiceLines,
  salesInvoiceCreatePayload,
  salesInvoiceHeaderToPayload,
} from "../utils/salesInvoiceDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   invoiceId: string | null;
 *   lines: import("../utils/salesInvoiceDrawerUtils").SalesInvoiceLineFormRow[];
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onPosted?: (record: Record<string, unknown>) => void;
 *   onReversed?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 *   onClose?: () => void;
 * }} args
 */
export function useSalesInvoiceDrawerMutations({
  form,
  message,
  notification,
  t,
  tApiErrors,
  invoiceId,
  lines,
  onCreated,
  onSaved,
  onPosted,
  onReversed,
  onDeleted,
  onClose,
}) {
  const queryClient = useQueryClient();

  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SALES_INVOICES_QUERY_KEY });
  }, [queryClient]);

  const invalidateAfterPost = useCallback(() => {
    invalidateList();
    queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
  }, [invalidateList, queryClient]);

  const cacheProof = useCallback(
    (id, result) => {
      if (id == null || !result) return;
      queryClient.setQueryData(salesInvoiceProofQueryKey(id), result);
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
      } else {
        message.warning(t("verifySuccessNotRegistered"));
      }
    },
    [message, notification, t],
  );

  const cacheDetail = useCallback(
    (id, record) => {
      if (id == null || !record) return;
      queryClient.setQueryData([...SALES_INVOICE_DETAIL_QUERY_PREFIX, id], record);
    },
    [queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ values }) => {
      const validLines = getValidSalesInvoiceLines(lines);
      if (invoiceId == null) {
        return createSalesInvoice(salesInvoiceCreatePayload(values, lines));
      }
      await updateSalesInvoice(invoiceId, salesInvoiceHeaderToPayload(values));
      const synced = await syncSalesInvoiceLines(invoiceId, { lines: validLines });
      if (synced.invoice) return synced.invoice;
      return fetchSalesInvoice(invoiceId);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("saveError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      invalidateList();
      const id = normalizeEntityId(record?.id ?? invoiceId);
      if (invoiceId == null) {
        message.success(t("createSuccess"));
        if (id != null) cacheDetail(id, record);
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      } else {
        message.success(t("updateSuccess"));
        if (id != null) cacheDetail(id, record);
        onSaved?.(/** @type {Record<string, unknown>} */ (record));
      }
    },
  });

  const postMutation = useMutation({
    mutationFn: async ({ values }) => {
      let id = invoiceId;
      if (id == null) {
        const created = await createSalesInvoice(salesInvoiceCreatePayload(values, lines));
        id = normalizeEntityId(created?.id);
        if (id == null) throw new Error("Missing sales invoice id after create");
      } else {
        await updateSalesInvoice(id, salesInvoiceHeaderToPayload(values));
        await syncSalesInvoiceLines(id, { lines: getValidSalesInvoiceLines(lines) });
      }
      return postSalesInvoice(id);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("postError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      message.success(t("postSuccess"));
      invalidateAfterPost();
      const id = normalizeEntityId(record?.id ?? invoiceId);
      if (id != null) cacheDetail(id, record);
      if (invoiceId == null) {
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      }
      onPosted?.(/** @type {Record<string, unknown>} */ (record));
      onClose?.();
    },
  });

  const reverseMutation = useMutation({
    mutationFn: async () => {
      if (invoiceId == null) throw new Error("Missing sales invoice id");
      return reverseSalesInvoice(invoiceId);
    },
    onError: (err) => {
      notification.error({
        title: t("reverseError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (record) => {
      message.success(t("reverseSuccess"));
      invalidateAfterPost();
      const id = normalizeEntityId(record?.id ?? invoiceId);
      if (id != null) cacheDetail(id, record);
      onReversed?.(/** @type {Record<string, unknown>} */ (record));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => {
      if (invoiceId == null) throw new Error("Missing sales invoice id");
      return verifySalesInvoice(invoiceId);
    },
    onError: (err) => {
      notification.error({
        title: t("verifyError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (result) => {
      notifyManualProofCheck(result);
      cacheProof(invoiceId, result);
    },
  });

  const approveCompanyMutation = useMutation({
    mutationFn: async (proof) => {
      if (invoiceId == null) throw new Error("Missing sales invoice id");
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
    onSuccess: (result) => {
      if (result && result._companyApprovalProposed) {
        message.info(t("approveCompanyProposed"));
      } else {
        message.success(t("approveCompanySuccess"));
      }
      cacheProof(invoiceId, result);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (invoiceId == null) throw new Error("Missing sales invoice id");
      return deleteSalesInvoice(invoiceId);
    },
    onError: (err) => {
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: () => {
      message.success(t("deleteSuccess"));
      invalidateList();
      onDeleted?.();
      onClose?.();
    },
  });

  const submitting =
    saveMutation.isPending ||
    postMutation.isPending ||
    reverseMutation.isPending ||
    deleteMutation.isPending ||
    verifyMutation.isPending ||
    approveCompanyMutation.isPending;

  return {
    saveMutation,
    postMutation,
    reverseMutation,
    deleteMutation,
    verifyMutation,
    approveCompanyMutation,
    submitting,
  };
}
