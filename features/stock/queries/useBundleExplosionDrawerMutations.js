"use client";

import {
  BUNDLE_EXPLOSION_DETAIL_QUERY_PREFIX,
  BUNDLE_EXPLOSIONS_QUERY_KEY,
  STOCK_BALANCES_QUERY_KEY,
  STOCK_LOTS_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
  invalidatePurchasingAlertsQueries,
} from "./stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  createBundleExplosion,
  deleteBundleExplosion,
  fetchBundleExplosion,
  postBundleExplosion,
  syncBundleExplosionLines,
  updateBundleExplosion,
} from "../api/bundleExplosions.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  bexHeaderToPayload,
  getPersistableBexLines,
  getValidBexLines,
} from "../utils/bundleExplosionDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   documentId: string | null;
 *   lines: import("../utils/bundleExplosionDrawerUtils").BexLineFormRow[];
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onPosted?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 *   onClose?: () => void;
 * }} args
 */
export function useBundleExplosionDrawerMutations({
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
    queryClient.invalidateQueries({ queryKey: BUNDLE_EXPLOSIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_LOTS_QUERY_KEY });
    invalidatePurchasingAlertsQueries(queryClient);
  }, [queryClient]);

  const cacheDetail = useCallback(
    (id, record) => {
      if (id == null || !record) return;
      queryClient.setQueryData([...BUNDLE_EXPLOSION_DETAIL_QUERY_PREFIX, id], record);
    },
    [queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ values }) => {
      const persistable = getPersistableBexLines(lines);
      if (documentId == null) {
        return createBundleExplosion({
          ...bexHeaderToPayload(values),
          ...(persistable.length > 0 ? { lines: persistable } : {}),
        });
      }
      await updateBundleExplosion(documentId, bexHeaderToPayload(values));
      if (persistable.length > 0) {
        await syncBundleExplosionLines(documentId, { lines: persistable });
      }
      return fetchBundleExplosion(documentId);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("bexSaveError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      const id = normalizeEntityId(record?.id);
      cacheDetail(id, record);
      invalidateLedger();
      if (documentId == null) {
        message.success(t("bexCreateSuccess"));
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      } else {
        message.success(t("bexUpdateSuccess"));
        onSaved?.(/** @type {Record<string, unknown>} */ (record));
      }
    },
  });

  const postMutation = useMutation({
    mutationFn: async ({ values }) => {
      const validLines = getValidBexLines(lines);
      let id = documentId;
      if (id == null) {
        const created = await createBundleExplosion({
          ...bexHeaderToPayload(values),
          lines: validLines,
        });
        id = normalizeEntityId(created?.id);
        if (id == null) throw new Error("Missing document id after create");
        await syncBundleExplosionLines(id, { lines: validLines });
      } else {
        await updateBundleExplosion(id, bexHeaderToPayload(values));
        await syncBundleExplosionLines(id, { lines: validLines });
      }
      return postBundleExplosion(id);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("bexPostError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      cacheDetail(normalizeEntityId(record?.id), record);
      invalidateLedger();
      message.success(t("bexPostSuccess"));
      if (documentId == null) {
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      }
      onPosted?.(/** @type {Record<string, unknown>} */ (record));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (documentId == null) throw new Error("missing document");
      return deleteBundleExplosion(documentId);
    },
    onError: (err) => {
      notification.error({
        title: t("bexDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: () => {
      invalidateLedger();
      message.success(t("bexDeleteSuccess"));
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
