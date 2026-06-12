"use client";

/**
 * Stock transfer drawer mutations — save draft, post, cancel, delete.
 */

import {
  invalidatePurchasingAlertsQueries,
  STOCK_BALANCES_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
  STOCK_TRANSFER_DETAIL_QUERY_PREFIX,
  STOCK_TRANSFERS_QUERY_KEY,
} from "@/components/stock/stockQueryCache";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  cancelStockTransfer,
  createStockTransfer,
  deleteStockTransfer,
  fetchStockTransfer,
  postStockTransfer,
  syncStockTransferLines,
  updateStockTransfer,
} from "@/services/stockTransfersApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  getValidTransferLines,
  transferCreatePayload,
  transferHeaderToPayload,
} from "./stockTransferDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   transferId: string | null;
 *   lines: import("./stockTransferDrawerUtils").TransferLineFormRow[];
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onPosted?: (record: Record<string, unknown>) => void;
 *   onCancelled?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 *   onClose?: () => void;
 * }} args
 */
export function useStockTransferDrawerMutations({
  form,
  message,
  notification,
  t,
  tApiErrors,
  transferId,
  lines,
  onCreated,
  onSaved,
  onPosted,
  onCancelled,
  onDeleted,
  onClose,
}) {
  const queryClient = useQueryClient();

  const invalidateStockLedger = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_TRANSFERS_QUERY_KEY });
    invalidatePurchasingAlertsQueries(queryClient);
  }, [queryClient]);

  const cacheTransferDetail = useCallback(
    (id, record) => {
      if (id == null || !record) return;
      queryClient.setQueryData([...STOCK_TRANSFER_DETAIL_QUERY_PREFIX, id], record);
    },
    [queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ values }) => {
      const validLines = getValidTransferLines(lines);
      if (transferId == null) {
        return createStockTransfer(transferCreatePayload(values, lines));
      }
      await updateStockTransfer(transferId, transferHeaderToPayload(values));
      await syncStockTransferLines(transferId, { lines: validLines });
      return fetchStockTransfer(transferId);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("transferSaveError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      invalidateStockLedger();
      const id = normalizeEntityId(record?.id ?? transferId);
      if (transferId == null) {
        message.success(t("drawerCreateSuccess"));
        if (id != null) cacheTransferDetail(id, record);
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      } else {
        message.success(t("drawerUpdateSuccess"));
        if (id != null) cacheTransferDetail(id, record);
        onSaved?.(/** @type {Record<string, unknown>} */ (record));
      }
    },
  });

  const postMutation = useMutation({
    mutationFn: async ({ values }) => {
      let id = transferId;
      if (id == null) {
        const created = await createStockTransfer(transferCreatePayload(values, lines));
        id = normalizeEntityId(created?.id);
        if (id == null) throw new Error("Missing transfer id after create");
      } else {
        await updateStockTransfer(id, transferHeaderToPayload(values));
        await syncStockTransferLines(id, { lines: getValidTransferLines(lines) });
      }
      return postStockTransfer(id);
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({
          title: t("transferPostError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    onSuccess: (record) => {
      message.success(t("transferPostSuccess"));
      invalidateStockLedger();
      const id = normalizeEntityId(record?.id ?? transferId);
      if (id != null) cacheTransferDetail(id, record);
      if (transferId == null) {
        onCreated?.(/** @type {Record<string, unknown>} */ (record));
      }
      onPosted?.(/** @type {Record<string, unknown>} */ (record));
      onClose?.();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (transferId == null) throw new Error("Missing transfer id");
      return cancelStockTransfer(transferId);
    },
    onError: (err) => {
      notification.error({
        title: t("transferCancelError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (record) => {
      message.success(t("transferCancelSuccess"));
      invalidateStockLedger();
      cacheTransferDetail(transferId, record);
      onCancelled?.(/** @type {Record<string, unknown>} */ (record));
      onClose?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (transferId == null) throw new Error("Missing transfer id");
      return deleteStockTransfer(transferId);
    },
    onError: (err) => {
      notification.error({
        title: t("transferDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: () => {
      message.success(t("transferDeleteSuccess"));
      invalidateStockLedger();
      onDeleted?.();
      onClose?.();
    },
  });

  const submitting =
    saveMutation.isPending ||
    postMutation.isPending ||
    cancelMutation.isPending ||
    deleteMutation.isPending;

  return {
    saveMutation,
    postMutation,
    cancelMutation,
    deleteMutation,
    submitting,
  };
}
