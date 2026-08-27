"use client";

import {
  PRODUCTION_DETAIL_QUERY_PREFIX,
  PRODUCTIONS_QUERY_KEY,
  STOCK_BALANCES_QUERY_KEY,
  STOCK_LOTS_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
  invalidatePurchasingAlertsQueries,
} from "./stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  createProduction,
  deleteProduction,
  fetchProduction,
  postProduction,
  syncProductionLines,
  updateProduction,
} from "../api/productions.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  getPersistablePrdLines,
  getValidPrdLines,
  prdHeaderToPayload,
} from "../utils/productionDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   documentId: string | null;
 *   lines: import("../utils/productionDrawerUtils").PrdLineFormRow[];
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onPosted?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 *   onClose?: () => void;
 * }} args
 */
export function useProductionDrawerMutations({
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
    queryClient.invalidateQueries({ queryKey: PRODUCTIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_LOTS_QUERY_KEY });
    invalidatePurchasingAlertsQueries(queryClient);
  }, [queryClient]);

  const cacheDetail = useCallback(
    (id, record) => {
      if (id == null || !record) return;
      queryClient.setQueryData([...PRODUCTION_DETAIL_QUERY_PREFIX, id], record);
    },
    [queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ values }) => {
      const persistable = getPersistablePrdLines(lines);
      if (documentId == null) {
        return createProduction({
          ...prdHeaderToPayload(values),
          ...(persistable.length > 0 ? { lines: persistable } : {}),
        });
      }
      await updateProduction(documentId, prdHeaderToPayload(values));
      if (persistable.length > 0) {
        await syncProductionLines(documentId, { lines: persistable });
      }
      return fetchProduction(documentId);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("prdSaveError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      const id = normalizeEntityId(record?.id);
      cacheDetail(id, record);
      invalidateLedger();
      if (documentId == null) {
        message.success(t("prdCreateSuccess"));
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      } else {
        message.success(t("prdUpdateSuccess"));
        onSaved?.(/** @type {Record<string, unknown>} */ (record));
      }
    },
  });

  const postMutation = useMutation({
    mutationFn: async ({ values }) => {
      const validLines = getValidPrdLines(lines);
      let id = documentId;
      if (id == null) {
        const created = await createProduction({
          ...prdHeaderToPayload(values),
          lines: validLines,
        });
        id = normalizeEntityId(created?.id);
        if (id == null) throw new Error("Missing document id after create");
        await syncProductionLines(id, { lines: validLines });
      } else {
        await updateProduction(id, prdHeaderToPayload(values));
        await syncProductionLines(id, { lines: validLines });
      }
      return postProduction(id);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("prdPostError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      cacheDetail(normalizeEntityId(record?.id), record);
      invalidateLedger();
      message.success(t("prdPostSuccess"));
      if (documentId == null) {
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      }
      onPosted?.(/** @type {Record<string, unknown>} */ (record));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (documentId == null) throw new Error("missing document");
      return deleteProduction(documentId);
    },
    onError: (err) => {
      notification.error({
        title: t("prdDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: () => {
      invalidateLedger();
      message.success(t("prdDeleteSuccess"));
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
