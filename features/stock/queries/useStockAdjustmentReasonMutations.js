"use client";

import {
  STOCK_ADJUSTMENT_REASON_DETAIL_QUERY_PREFIX,
  STOCK_ADJUSTMENT_REASON_NAMES_QUERY_KEY,
  STOCK_ADJUSTMENT_REASONS_QUERY_KEY,
} from "./stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  createStockAdjustmentReason,
  deleteStockAdjustmentReason,
  updateStockAdjustmentReason,
} from "../api/stockAdjustmentReasons.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * @param {{
 *   form?: import("antd").FormInstance | null;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 * }} args
 */
export function useStockAdjustmentReasonMutations({
  form,
  message,
  notification,
  t,
  tApiErrors,
  onCreated,
  onSaved,
  onDeleted,
}) {
  const queryClient = useQueryClient();

  const invalidateReasons = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: STOCK_ADJUSTMENT_REASONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_ADJUSTMENT_REASON_NAMES_QUERY_KEY });
  }, [queryClient]);

  const cacheDetail = useCallback(
    (id, record) => {
      if (id == null || !record) return;
      queryClient.setQueryData([...STOCK_ADJUSTMENT_REASON_DETAIL_QUERY_PREFIX, id], record);
    },
    [queryClient],
  );

  const createMutation = useMutation({
    mutationFn: (payload) => createStockAdjustmentReason(payload),
    onError: (err) => {
      if (form && applyApiFieldErrors(form, err)) return;
      notification.error({
        title: t("adjReasonSaveError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (record) => {
      cacheDetail(record?.id, record);
      invalidateReasons();
      message.success(t("adjReasonCreateSuccess"));
      onCreated?.(/** @type {Record<string, unknown>} */ (record));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateStockAdjustmentReason(id, values),
    onError: (err) => {
      if (form && applyApiFieldErrors(form, err)) return;
      notification.error({
        title: t("adjReasonSaveError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (record) => {
      cacheDetail(record?.id, record);
      invalidateReasons();
      message.success(t("adjReasonUpdateSuccess"));
      onSaved?.(/** @type {Record<string, unknown>} */ (record));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteStockAdjustmentReason(id),
    onError: (err) => {
      notification.error({
        title: t("adjReasonDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: () => {
      invalidateReasons();
      message.success(t("adjReasonDeleteSuccess"));
      onDeleted?.();
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    submitting: createMutation.isPending || updateMutation.isPending,
  };
}
