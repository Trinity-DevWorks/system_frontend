"use client";

import {
  PURCHASE_INVOICE_DETAIL_QUERY_PREFIX,
  PURCHASE_INVOICES_QUERY_KEY,
} from "./purchaseInvoiceQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  createPurchaseInvoice,
  deletePurchaseInvoice,
  fetchPurchaseInvoice,
  postPurchaseInvoice,
  syncPurchaseInvoiceLines,
  updatePurchaseInvoice,
} from "../api/purchaseInvoices.api";
import {
  getPersistablePiLines,
  piCreatePayload,
  piHeaderToPayload,
} from "../utils/purchaseInvoiceDrawerUtils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   invoiceId: string | null;
 *   lines: import("../utils/purchaseInvoiceDrawerUtils").PiLineFormRow[];
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onPosted?: (record: Record<string, unknown>) => void;
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
  onDeleted,
  onClose,
}) {
  const queryClient = useQueryClient();

  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: PURCHASE_INVOICES_QUERY_KEY });
  }, [queryClient]);

  const cacheDetail = useCallback(
    (id, record) => {
      if (id == null || !record) return;
      queryClient.setQueryData([...PURCHASE_INVOICE_DETAIL_QUERY_PREFIX, id], record);
    },
    [queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ values }) => {
      if (invoiceId == null) {
        const payload = piCreatePayload(values);
        const persistable = getPersistablePiLines(lines);
        if (persistable.length > 0) {
          payload.lines = persistable;
        }
        return createPurchaseInvoice(payload);
      }
      await updatePurchaseInvoice(invoiceId, piHeaderToPayload(values));
      await syncPurchaseInvoiceLines(invoiceId, { lines: getPersistablePiLines(lines) });
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
      const id = normalizeEntityId(record?.id);
      cacheDetail(id, record);
      invalidateList();
      if (invoiceId == null) {
        message.success(t("createSuccess"));
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      } else {
        message.success(t("updateSuccess"));
        onSaved?.(/** @type {Record<string, unknown>} */ (record));
      }
    },
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      if (invoiceId == null) throw new Error("Missing invoice id");
      return postPurchaseInvoice(invoiceId);
    },
    onError: (err) => {
      notification.error({
        title: t("postError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (record) => {
      const id = normalizeEntityId(record?.id);
      cacheDetail(id, record);
      invalidateList();
      message.success(t("postSuccess"));
      onPosted?.(/** @type {Record<string, unknown>} */ (record));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (invoiceId == null) throw new Error("Missing invoice id");
      return deletePurchaseInvoice(invoiceId);
    },
    onError: (err) => {
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: () => {
      invalidateList();
      message.success(t("deleteSuccess"));
      onDeleted?.();
      onClose?.();
    },
  });

  return { saveMutation, postMutation, deleteMutation };
}
