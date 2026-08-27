"use client";

import {
  STOCK_ADJUSTMENT_DETAIL_QUERY_PREFIX,
  STOCK_ADJUSTMENTS_QUERY_KEY,
  STOCK_BALANCES_QUERY_KEY,
  STOCK_LOTS_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
  invalidatePurchasingAlertsQueries,
} from "./stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  createStockAdjustment,
  deleteStockAdjustment,
  fetchStockAdjustment,
  postStockAdjustmentDocument,
  syncStockAdjustmentLines,
  updateStockAdjustment,
} from "../api/stockAdjustments.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  adjHeaderToPayload,
  getPersistableAdjLines,
  getValidAdjLines,
} from "../utils/stockAdjustmentDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   documentId: string | null;
 *   lines: import("../utils/stockAdjustmentDrawerUtils").AdjLineFormRow[];
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onPosted?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 *   onClose?: () => void;
 * }} args
 */
export function useStockAdjustmentDrawerMutations({
  form,
  message,
  notification,
  t,
  tApiErrors,
  documentId,
  lines,
  onCreated,
  onSaved,
  onPosted,
  onDeleted,
  onClose,
}) {
  const queryClient = useQueryClient();

  const invalidateLedger = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: STOCK_ADJUSTMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_LOTS_QUERY_KEY });
    invalidatePurchasingAlertsQueries(queryClient);
  }, [queryClient]);

  const cacheDetail = useCallback(
    (id, record) => {
      if (id == null || !record) return;
      queryClient.setQueryData([...STOCK_ADJUSTMENT_DETAIL_QUERY_PREFIX, id], record);
    },
    [queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ values }) => {
      const persistable = getPersistableAdjLines(lines);
      if (documentId == null) {
        return createStockAdjustment({
          ...adjHeaderToPayload(values),
          ...(persistable.length > 0 ? { lines: persistable } : {}),
        });
      }
      await updateStockAdjustment(documentId, adjHeaderToPayload(values));
      await syncStockAdjustmentLines(documentId, { lines: persistable });
      return fetchStockAdjustment(documentId);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("adjSaveError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      const id = normalizeEntityId(record?.id);
      cacheDetail(id, record);
      invalidateLedger();
      if (documentId == null) {
        message.success(t("adjCreateSuccess"));
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      } else {
        message.success(t("adjUpdateSuccess"));
        onSaved?.(/** @type {Record<string, unknown>} */ (record));
      }
    },
  });

  const postMutation = useMutation({
    mutationFn: async ({ values }) => {
      const validLines = getValidAdjLines(lines);
      let id = documentId;
      if (id == null) {
        const created = await createStockAdjustment({
          ...adjHeaderToPayload(values),
          lines: validLines,
        });
        id = normalizeEntityId(created?.id);
        if (id == null) throw new Error("Missing document id after create");
        await syncStockAdjustmentLines(id, { lines: validLines });
      } else {
        await updateStockAdjustment(id, adjHeaderToPayload(values));
        await syncStockAdjustmentLines(id, { lines: validLines });
      }
      return postStockAdjustmentDocument(id);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("adjPostError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      cacheDetail(normalizeEntityId(record?.id), record);
      invalidateLedger();
      message.success(t("adjPostSuccess"));
      if (documentId == null) {
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      }
      onPosted?.(/** @type {Record<string, unknown>} */ (record));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (documentId == null) throw new Error("missing document");
      return deleteStockAdjustment(documentId);
    },
    onError: (err) => {
      notification.error({
        title: t("adjDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: () => {
      invalidateLedger();
      message.success(t("adjDeleteSuccess"));
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
