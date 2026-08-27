"use client";

import {
  STOCK_COUNT_DETAIL_QUERY_PREFIX,
  STOCK_COUNTS_QUERY_KEY,
  STOCK_BALANCES_QUERY_KEY,
  STOCK_LOTS_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
  invalidatePurchasingAlertsQueries,
} from "./stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  createStockCount,
  deleteStockCount,
  fetchStockCount,
  loadStockCountBalances,
  postStockCount,
  syncStockCountLines,
  updateStockCount,
} from "../api/stockCounts.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  cntHeaderToPayload,
  getPersistableCntLines,
  getValidCntLines,
} from "../utils/stockCountDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   documentId: string | null;
 *   lines: import("../utils/stockCountDrawerUtils").CntLineFormRow[];
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onPosted?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 *   onClose?: () => void;
 * }} args
 */
export function useStockCountDrawerMutations({
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
    queryClient.invalidateQueries({ queryKey: STOCK_COUNTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_LOTS_QUERY_KEY });
    invalidatePurchasingAlertsQueries(queryClient);
  }, [queryClient]);

  const cacheDetail = useCallback(
    (id, record) => {
      if (id == null || !record) return;
      queryClient.setQueryData([...STOCK_COUNT_DETAIL_QUERY_PREFIX, id], record);
    },
    [queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ values }) => {
      const persistable = getPersistableCntLines(lines);
      if (documentId == null) {
        return createStockCount({
          ...cntHeaderToPayload(values),
          ...(persistable.length > 0 ? { lines: persistable } : {}),
        });
      }
      await updateStockCount(documentId, cntHeaderToPayload(values));
      await syncStockCountLines(documentId, { lines: persistable });
      return fetchStockCount(documentId);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("cntSaveError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      const id = normalizeEntityId(record?.id);
      cacheDetail(id, record);
      invalidateLedger();
      if (documentId == null) {
        message.success(t("cntCreateSuccess"));
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      } else {
        message.success(t("cntUpdateSuccess"));
        onSaved?.(/** @type {Record<string, unknown>} */ (record));
      }
    },
  });

  const loadBalancesMutation = useMutation({
    mutationFn: async () => {
      const values = form.getFieldsValue(true);
      if (documentId == null) {
        return createStockCount({
          ...cntHeaderToPayload(values),
          load_balances: true,
        });
      }
      await updateStockCount(documentId, cntHeaderToPayload(values));
      return loadStockCountBalances(documentId);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("cntLoadBalancesError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      const id = normalizeEntityId(record?.id);
      cacheDetail(id, record);
      invalidateLedger();
      message.success(t("cntLoadBalancesSuccess"));
      if (documentId == null) {
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      } else {
        onSaved?.(/** @type {Record<string, unknown>} */ (record));
      }
    },
  });

  const postMutation = useMutation({
    mutationFn: async ({ values }) => {
      const validLines = getValidCntLines(lines);
      let id = documentId;
      if (id == null) {
        const created = await createStockCount({
          ...cntHeaderToPayload(values),
          lines: validLines,
        });
        id = normalizeEntityId(created?.id);
        if (id == null) throw new Error("Missing document id after create");
        await syncStockCountLines(id, { lines: validLines });
      } else {
        await updateStockCount(id, cntHeaderToPayload(values));
        await syncStockCountLines(id, { lines: validLines });
      }
      return postStockCount(id);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("cntPostError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      cacheDetail(normalizeEntityId(record?.id), record);
      invalidateLedger();
      message.success(t("cntPostSuccess"));
      if (documentId == null) {
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      }
      onPosted?.(/** @type {Record<string, unknown>} */ (record));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (documentId == null) throw new Error("missing document");
      return deleteStockCount(documentId);
    },
    onError: (err) => {
      notification.error({
        title: t("cntDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: () => {
      invalidateLedger();
      message.success(t("cntDeleteSuccess"));
      onDeleted?.();
      onClose?.();
    },
  });

  return {
    saveMutation,
    loadBalancesMutation,
    postMutation,
    deleteMutation,
    submitting:
      saveMutation.isPending ||
      loadBalancesMutation.isPending ||
      postMutation.isPending ||
      deleteMutation.isPending,
  };
}
