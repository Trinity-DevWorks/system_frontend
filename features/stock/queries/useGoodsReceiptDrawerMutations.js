"use client";

import {
  GOODS_RECEIPT_DETAIL_QUERY_PREFIX,
  GOODS_RECEIPTS_QUERY_KEY,
  PURCHASE_ORDER_DETAIL_QUERY_PREFIX,
  PURCHASE_ORDERS_QUERY_KEY,
  STOCK_BALANCES_QUERY_KEY,
  STOCK_LOTS_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
  invalidatePurchasingAlertsQueries,
} from "./stockQueryKeys";
import { SUPPLIER_ITEMS_QUERY_KEY } from "@/features/suppliers";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  createGoodsReceipt,
  deleteGoodsReceipt,
  fetchGoodsReceipt,
  postGoodsReceipt,
  syncGoodsReceiptLines,
  updateGoodsReceipt,
} from "../api/goodsReceipts.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  getPersistableGrnLines,
  getValidGrnLines,
  grnCreatePayload,
  grnHeaderToPayload,
} from "../utils/goodsReceiptDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   receiptId: string | null;
 *   lines: import("../utils/goodsReceiptDrawerUtils").GrnLineFormRow[];
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onPosted?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 *   onClose?: () => void;
 * }} args
 */
export function useGoodsReceiptDrawerMutations({
  form,
  message,
  notification,
  t,
  tApiErrors,
  receiptId,
  lines,
  onCreated,
  onSaved,
  onPosted,
  onDeleted,
  onClose,
}) {
  const queryClient = useQueryClient();

  const invalidateLedger = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: GOODS_RECEIPTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_DETAIL_QUERY_PREFIX });
    queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_LOTS_QUERY_KEY });
    invalidatePurchasingAlertsQueries(queryClient);
  }, [queryClient]);

  const cacheDetail = useCallback(
    (id, record) => {
      if (id == null || !record) return;
      queryClient.setQueryData([...GOODS_RECEIPT_DETAIL_QUERY_PREFIX, id], record);
    },
    [queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ values }) => {
      if (receiptId == null) {
        const payload = grnCreatePayload(values);
        const persistable = getPersistableGrnLines(lines);
        if (persistable.length > 0) {
          payload.lines = persistable;
        }
        return createGoodsReceipt(payload);
      }
      await updateGoodsReceipt(
        receiptId,
        grnHeaderToPayload(values, { standalone: values.purchase_order_id == null }),
      );
      await syncGoodsReceiptLines(receiptId, { lines: getPersistableGrnLines(lines) });
      return fetchGoodsReceipt(receiptId);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("grnSaveError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      const id = normalizeEntityId(record?.id);
      cacheDetail(id, record);
      invalidateLedger();
      if (receiptId == null) {
        message.success(t("grnCreateSuccess"));
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      } else {
        message.success(t("grnUpdateSuccess"));
        onSaved?.(/** @type {Record<string, unknown>} */ (record));
      }
    },
  });

  const postMutation = useMutation({
    mutationFn: async ({ values }) => {
      const validLines = getValidGrnLines(lines);
      let id = receiptId;
      if (id == null) {
        const payload = grnCreatePayload(values);
        if (validLines.length > 0) {
          payload.lines = validLines;
        }
        const created = await createGoodsReceipt(payload);
        id = normalizeEntityId(created?.id);
        if (id == null) throw new Error("Missing receipt id after create");
      } else {
        await updateGoodsReceipt(
          id,
          grnHeaderToPayload(values, { standalone: values.purchase_order_id == null }),
        );
      }
      await syncGoodsReceiptLines(id, { lines: validLines });
      return postGoodsReceipt(id);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("grnPostError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      cacheDetail(normalizeEntityId(record?.id), record);
      invalidateLedger();
      queryClient.invalidateQueries({ queryKey: SUPPLIER_ITEMS_QUERY_KEY });
      message.success(t("grnPostSuccess"));
      if (receiptId == null) {
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      }
      onPosted?.(/** @type {Record<string, unknown>} */ (record));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (receiptId == null) throw new Error("missing receipt");
      return deleteGoodsReceipt(receiptId);
    },
    onError: (err) => {
      notification.error({
        title: t("grnDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: () => {
      invalidateLedger();
      message.success(t("grnDeleteSuccess"));
      onDeleted?.();
      onClose?.();
    },
  });

  return {
    saveMutation,
    postMutation,
    deleteMutation,
    submitting: saveMutation.isPending || postMutation.isPending || deleteMutation.isPending,
  };
}
