"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { normalizeEntityId } from "@/lib/entityId";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createTreasuryTransfer,
  deleteTreasuryTransfer,
  postTreasuryTransfer,
  reverseTreasuryTransfer,
  updateTreasuryTransfer,
} from "../api/treasuryTransfers.api";
import { treasuryTransferFormValuesToPayload } from "../utils/treasuryTransferDrawerUtils";
import { TREASURY_TRANSFERS_LIST_QUERY_KEY, treasuryTransferDetailQueryKey } from "./treasuryTransfersQueryKeys";

/**
 * Save / post / reverse / delete for the cash/bank transfer drawer (same flow as the other documents).
 *
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   transferId: string | number | null;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onPosted?: (record: Record<string, unknown>) => void;
 *   onReversed?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 * }} args
 */
export function useTreasuryTransferDrawerMutations({
  form,
  message,
  notification,
  t,
  tApiErrors,
  transferId,
  onCreated,
  onSaved,
  onPosted,
  onReversed,
  onDeleted,
}) {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    invalidateTenantListQueries(queryClient, TREASURY_TRANSFERS_LIST_QUERY_KEY);
    // Posting moves money between cash boxes / bank accounts.
    queryClient.invalidateQueries({ queryKey: ["tenant", "cash-bank-accounts"] });
  }, [queryClient]);

  const cacheDetail = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id != null) queryClient.setQueryData(treasuryTransferDetailQueryKey(id), record);
    },
    [queryClient],
  );

  const onError = useCallback(
    (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({ title: t("actionError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
      }
    },
    [form, notification, t, tApiErrors],
  );

  /** Create or update the draft; returns the saved record. */
  const persist = useCallback(
    async (values) => {
      const body = treasuryTransferFormValuesToPayload(values);
      const saved = /** @type {Record<string, any>} */ (
        transferId != null ? await updateTreasuryTransfer(transferId, body) : await createTreasuryTransfer(body)
      );
      cacheDetail(saved);
      if (transferId == null) onCreated?.(saved);
      return saved;
    },
    [transferId, cacheDetail, onCreated],
  );

  const saveMutation = useMutation({
    mutationFn: ({ values }) => persist(values),
    onError,
    onSuccess: (record) => {
      message.success(transferId == null ? t("drawerCreateSuccess") : t("drawerUpdateSuccess"));
      invalidate();
      onSaved?.(record);
    },
  });

  const postMutation = useMutation({
    mutationFn: async ({ values }) => {
      const saved = await persist(values);
      return postTreasuryTransfer(String(saved.id));
    },
    onError,
    onSuccess: (record) => {
      message.success(t("postSuccess"));
      cacheDetail(record);
      invalidate();
      onPosted?.(record);
    },
  });

  const reverseMutation = useMutation({
    mutationFn: () => reverseTreasuryTransfer(String(transferId)),
    onError,
    onSuccess: (record) => {
      message.success(t("reverseSuccess"));
      cacheDetail(record);
      invalidate();
      onReversed?.(record);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTreasuryTransfer(String(transferId)),
    onError,
    onSuccess: () => {
      message.success(t("deleteSuccess"));
      invalidate();
      onDeleted?.();
    },
  });

  const submitting = saveMutation.isPending || postMutation.isPending || reverseMutation.isPending || deleteMutation.isPending;

  return { saveMutation, postMutation, reverseMutation, deleteMutation, submitting };
}
