"use client";

import { SALES_INVOICE_DETAIL_QUERY_PREFIX, SALES_INVOICES_QUERY_KEY } from "./salesInvoicesQueryKeys";
import { STOCK_BALANCES_QUERY_KEY, STOCK_MOVEMENTS_QUERY_KEY } from "@/features/stock/queries/stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  createSalesInvoice,
  deleteSalesInvoice,
  fetchSalesInvoice,
  postSalesInvoice,
  syncSalesInvoiceLines,
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

  const submitting = saveMutation.isPending || postMutation.isPending || deleteMutation.isPending;

  return {
    saveMutation,
    postMutation,
    deleteMutation,
    submitting,
  };
}
