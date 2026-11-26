"use client";

import { isDiscountApprovalError } from "@/features/sales-documents/components/useDiscountApproval";

import { SALES_INVOICE_DETAIL_QUERY_PREFIX, SALES_INVOICES_QUERY_KEY } from "./salesInvoicesQueryKeys";
import { STOCK_BALANCES_QUERY_KEY, STOCK_MOVEMENTS_QUERY_KEY } from "@/features/stock/queries/stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  createSalesInvoice,
  deleteSalesInvoice,
  postNewSalesInvoice,
  postSalesInvoice,
  reverseSalesInvoice,
  recordSalesInvoicePayments,
  updateSalesInvoice,
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

  const cacheDetail = useCallback(
    (id, record) => {
      if (id == null || !record) return;
      queryClient.setQueryData([...SALES_INVOICE_DETAIL_QUERY_PREFIX, id], record);
    },
    [queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ values }) => {
      if (invoiceId == null) {
        return createSalesInvoice(salesInvoiceCreatePayload(values, lines));
      }
      // One call: the header and the lines are saved together.
      return updateSalesInvoice(invoiceId, { ...salesInvoiceHeaderToPayload(values), lines: getValidSalesInvoiceLines(lines) });
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
    // One call: the invoice as shown (header, lines) and the payments from the payment modal (none = all on
    // account) are saved and posted together, all or nothing. `requestId` keeps a retry from posting twice.
    mutationFn: async ({ values, payments = [], keepExtraAsCredit = false, discountApproval = null, requestId }) => {
      const document = invoiceId == null
        ? salesInvoiceCreatePayload(values, lines)
        : { ...salesInvoiceHeaderToPayload(values), lines: getValidSalesInvoiceLines(lines) };
      const body = {
        ...document,
        payments,
        keep_extra_as_credit: Boolean(keepExtraAsCredit),
        // A manager's PIN when the discount or the credit limit needs approval.
        ...(discountApproval ? { approval: discountApproval } : {}),
      };
      return invoiceId == null ? postNewSalesInvoice(body, requestId) : postSalesInvoice(invoiceId, body, requestId);
    },
    onError: (err) => {
      // The approval popup shows these itself.
      if (isDiscountApprovalError(err)) return;
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
    },
  });

  /** Money received later against the posted invoice (each row becomes a receipt). */
  const recordPaymentMutation = useMutation({
    mutationFn: async ({ payments, payment_date, keep_extra_as_credit = false }) => {
      if (invoiceId == null) throw new Error("Missing sales invoice id");
      return recordSalesInvoicePayments(invoiceId, { payments, payment_date, keep_extra_as_credit: Boolean(keep_extra_as_credit) });
    },
    onError: (err) => {
      notification.error({
        title: t("recordPaymentError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (record) => {
      message.success(t("recordPaymentSuccess"));
      invalidateList();
      queryClient.invalidateQueries({ queryKey: ["tenant", "cash-bank-accounts"] });
      const id = normalizeEntityId(record?.id ?? invoiceId);
      if (id != null) cacheDetail(id, record);
      onPosted?.(/** @type {Record<string, unknown>} */ (record));
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

  const submitting = saveMutation.isPending || postMutation.isPending || recordPaymentMutation.isPending || reverseMutation.isPending || deleteMutation.isPending;

  return {
    saveMutation,
    recordPaymentMutation,
    postMutation,
    reverseMutation,
    deleteMutation,
    submitting,
  };
}
