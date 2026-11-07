"use client";

import {
  STOCK_BALANCES_QUERY_KEY,
  STOCK_LOTS_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
  STOCK_REVALUATION_DETAIL_QUERY_PREFIX,
  STOCK_REVALUATIONS_QUERY_KEY,
  invalidatePurchasingAlertsQueries,
} from "./stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  createStockRevaluation,
  deleteStockRevaluation,
  fetchStockRevaluation,
  postStockRevaluationDocument,
  reverseStockRevaluationDocument,
  syncStockRevaluationLines,
  updateStockRevaluation,
} from "../api/stockRevaluations.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  getPersistableSrvLines,
  getValidSrvLines,
  srvHeaderToPayload,
} from "../utils/stockRevaluationDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   documentId: string | null;
 *   lines: import("../utils/stockRevaluationDrawerUtils").SrvLineFormRow[];
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onPosted?: (record: Record<string, unknown>) => void;
 *   onReversed?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 *   onClose?: () => void;
 * }} args
 */
export function useStockRevaluationDrawerMutations({
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
  onReversed,
  onDeleted,
  onClose,
}) {
  const queryClient = useQueryClient();

  const invalidateLedger = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: STOCK_REVALUATIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_LOTS_QUERY_KEY });
    invalidatePurchasingAlertsQueries(queryClient);
  }, [queryClient]);

  const cacheDetail = useCallback(
    (id, record) => {
      if (id == null || !record) return;
      queryClient.setQueryData([...STOCK_REVALUATION_DETAIL_QUERY_PREFIX, id], record);
    },
    [queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ values }) => {
      const persistable = getPersistableSrvLines(lines);
      if (documentId == null) {
        return createStockRevaluation({
          ...srvHeaderToPayload(values),
          ...(persistable.length > 0 ? { lines: persistable } : {}),
        });
      }
      await updateStockRevaluation(documentId, srvHeaderToPayload(values));
      await syncStockRevaluationLines(documentId, { lines: persistable });
      return fetchStockRevaluation(documentId);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("srvSaveError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      const id = normalizeEntityId(record?.id);
      cacheDetail(id, record);
      invalidateLedger();
      if (documentId == null) {
        message.success(t("srvCreateSuccess"));
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      } else {
        message.success(t("srvUpdateSuccess"));
        onSaved?.(/** @type {Record<string, unknown>} */ (record));
      }
    },
  });

  const postMutation = useMutation({
    mutationFn: async ({ values }) => {
      const validLines = getValidSrvLines(lines);
      let id = documentId;
      if (id == null) {
        const created = await createStockRevaluation({
          ...srvHeaderToPayload(values),
          lines: validLines,
        });
        id = normalizeEntityId(created?.id);
        if (id == null) throw new Error("Missing document id after create");
        await syncStockRevaluationLines(id, { lines: validLines });
      } else {
        await updateStockRevaluation(id, srvHeaderToPayload(values));
        await syncStockRevaluationLines(id, { lines: validLines });
      }
      return postStockRevaluationDocument(id);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("srvPostError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      cacheDetail(normalizeEntityId(record?.id), record);
      invalidateLedger();
      message.success(t("srvPostSuccess"));
      if (documentId == null) {
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      }
      onPosted?.(/** @type {Record<string, unknown>} */ (record));
    },
  });

  const reverseMutation = useMutation({
    mutationFn: async () => {
      if (documentId == null) throw new Error("missing document");
      return reverseStockRevaluationDocument(documentId);
    },
    onError: (err) => {
      notification.error({
        title: t("reverseError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (record) => {
      cacheDetail(normalizeEntityId(record?.id), record);
      invalidateLedger();
      message.success(t("srvReverseSuccess"));
      onReversed?.(/** @type {Record<string, unknown>} */ (record));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (documentId == null) throw new Error("missing document");
      return deleteStockRevaluation(documentId);
    },
    onError: (err) => {
      notification.error({
        title: t("srvDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: () => {
      invalidateLedger();
      message.success(t("srvDeleteSuccess"));
      onDeleted?.();
      onClose?.();
    },
  });

  return {
    saveMutation,
    postMutation,
    deleteMutation,
    reverseMutation,
    submitting: saveMutation.isPending || postMutation.isPending || reverseMutation.isPending || deleteMutation.isPending,
  };
}
