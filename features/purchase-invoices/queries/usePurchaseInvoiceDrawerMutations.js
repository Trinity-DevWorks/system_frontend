"use client";

import { PURCHASE_INVOICE_DETAIL_QUERY_PREFIX, PURCHASE_INVOICES_QUERY_KEY } from "./purchaseInvoicesQueryKeys";
import { STOCK_BALANCES_QUERY_KEY, STOCK_MOVEMENTS_QUERY_KEY } from "@/features/stock/queries/stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  createPurchaseInvoice,
  deletePurchaseInvoice,
  fetchPurchaseInvoice,
  postPurchaseInvoice,
  reversePurchaseInvoice,
  syncPurchaseInvoiceLines,
  updatePurchaseInvoice,
} from "../api/purchaseInvoices.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  getValidPurchaseInvoiceLines,
  purchaseInvoiceCreatePayload,
  purchaseInvoiceHeaderToPayload,
} from "../utils/purchaseInvoiceDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   invoiceId: string | null;
 *   lines: import("../utils/purchaseInvoiceDrawerUtils").PurchaseInvoiceLineFormRow[];
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onPosted?: (record: Record<string, unknown>) => void;
 *   onReversed?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 *   onClose?: () => void;
 * }} args
 */
export function usePurchaseInvoiceDrawerMutations({
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
    queryClient.invalidateQueries({ queryKey: PURCHASE_INVOICES_QUERY_KEY });
  }, [queryClient]);

  const invalidateAfterPost = useCallback(() => {
    invalidateList();
    queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
  }, [invalidateList, queryClient]);

  const cacheDetail = useCallback(
    (id, record) => {
      if (id == null || !record) return;
      queryClient.setQueryData([...PURCHASE_INVOICE_DETAIL_QUERY_PREFIX, id], record);
    },
    [queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ values }) => {
      const validLines = getValidPurchaseInvoiceLines(lines);
      if (invoiceId == null) {
        return createPurchaseInvoice(purchaseInvoiceCreatePayload(values, lines));
      }
      await updatePurchaseInvoice(invoiceId, purchaseInvoiceHeaderToPayload(values));
      const synced = await syncPurchaseInvoiceLines(invoiceId, { lines: validLines });
      if (synced.invoice) return synced.invoice;
      return fetchPurchaseInvoice(invoiceId);
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
        const created = await createPurchaseInvoice(purchaseInvoiceCreatePayload(values, lines));
        id = normalizeEntityId(created?.id);
        if (id == null) throw new Error("Missing purchase invoice id after create");
      } else {
        await updatePurchaseInvoice(id, purchaseInvoiceHeaderToPayload(values));
        await syncPurchaseInvoiceLines(id, { lines: getValidPurchaseInvoiceLines(lines) });
      }
      return postPurchaseInvoice(id);
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
      if (invoiceId == null) throw new Error("Missing purchase invoice id");
      return reversePurchaseInvoice(invoiceId);
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
      if (invoiceId == null) throw new Error("Missing purchase invoice id");
      return deletePurchaseInvoice(invoiceId);
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

  const submitting = saveMutation.isPending || postMutation.isPending || reverseMutation.isPending || deleteMutation.isPending;

  return {
    saveMutation,
    postMutation,
    reverseMutation,
    deleteMutation,
    submitting,
  };
}
