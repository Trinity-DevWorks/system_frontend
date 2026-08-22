"use client";

import {
  PURCHASE_ORDER_DETAIL_QUERY_PREFIX,
  PURCHASE_ORDERS_QUERY_KEY,
} from "./stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  cancelPurchaseOrder,
  confirmPurchaseOrder,
  createPurchaseOrder,
  deletePurchaseOrder,
  fetchPurchaseOrder,
  syncPurchaseOrderLines,
  updatePurchaseOrder,
} from "../api/purchaseOrders.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  getValidPurchaseOrderLines,
  purchaseOrderCreatePayload,
  purchaseOrderHeaderToPayload,
} from "../utils/purchaseOrderDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   orderId: string | null;
 *   lines: import("../utils/purchaseOrderDrawerUtils").PurchaseOrderLineFormRow[];
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onConfirmed?: (record: Record<string, unknown>) => void;
 *   onCancelled?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 *   onClose?: () => void;
 * }} args
 */
export function usePurchaseOrderDrawerMutations({
  form,
  message,
  notification,
  t,
  tApiErrors,
  orderId,
  lines,
  onCreated,
  onSaved,
  onConfirmed,
  onCancelled,
  onDeleted,
  onClose,
}) {
  const queryClient = useQueryClient();

  const invalidateOrders = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });
  }, [queryClient]);

  const cacheOrderDetail = useCallback(
    (id, record) => {
      if (id == null || !record) return;
      queryClient.setQueryData([...PURCHASE_ORDER_DETAIL_QUERY_PREFIX, id], record);
    },
    [queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ values }) => {
      const validLines = getValidPurchaseOrderLines(lines);
      if (orderId == null) {
        return createPurchaseOrder(purchaseOrderCreatePayload(values, lines));
      }
      await updatePurchaseOrder(orderId, purchaseOrderHeaderToPayload(values));
      await syncPurchaseOrderLines(orderId, { lines: validLines });
      return fetchPurchaseOrder(orderId);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("poSaveError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      invalidateOrders();
      const id = normalizeEntityId(record?.id ?? orderId);
      if (orderId == null) {
        message.success(t("poCreateSuccess"));
        if (id != null) cacheOrderDetail(id, record);
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      } else {
        message.success(t("poUpdateSuccess"));
        if (id != null) cacheOrderDetail(id, record);
        onSaved?.(/** @type {Record<string, unknown>} */ (record));
      }
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ values }) => {
      let id = orderId;
      if (id == null) {
        const created = await createPurchaseOrder(purchaseOrderCreatePayload(values, lines));
        id = normalizeEntityId(created?.id);
        if (id == null) throw new Error("Missing purchase order id after create");
      } else {
        await updatePurchaseOrder(id, purchaseOrderHeaderToPayload(values));
        await syncPurchaseOrderLines(id, { lines: getValidPurchaseOrderLines(lines) });
      }
      return confirmPurchaseOrder(id);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("poConfirmError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      message.success(t("poConfirmSuccess"));
      invalidateOrders();
      const id = normalizeEntityId(record?.id ?? orderId);
      if (id != null) cacheOrderDetail(id, record);
      if (orderId == null) {
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      }
      onConfirmed?.(/** @type {Record<string, unknown>} */ (record));
      onClose?.();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (orderId == null) throw new Error("Missing purchase order id");
      return cancelPurchaseOrder(orderId);
    },
    onError: (err) => {
      notification.error({
        title: t("poCancelError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (record) => {
      message.success(t("poCancelSuccess"));
      invalidateOrders();
      cacheOrderDetail(orderId, record);
      onCancelled?.(/** @type {Record<string, unknown>} */ (record));
      onClose?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (orderId == null) throw new Error("Missing purchase order id");
      return deletePurchaseOrder(orderId);
    },
    onError: (err) => {
      notification.error({
        title: t("poDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: () => {
      message.success(t("poDeleteSuccess"));
      invalidateOrders();
      onDeleted?.();
      onClose?.();
    },
  });

  const submitting =
    saveMutation.isPending ||
    confirmMutation.isPending ||
    cancelMutation.isPending ||
    deleteMutation.isPending;

  return {
    saveMutation,
    confirmMutation,
    cancelMutation,
    deleteMutation,
    submitting,
  };
}
