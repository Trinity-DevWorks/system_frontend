"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { normalizeEntityId } from "@/lib/entityId";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createExpenseVoucher,
  deleteExpenseVoucher,
  postExpenseVoucher,
  reverseExpenseVoucher,
  updateExpenseVoucher,
} from "../api/expenseVouchers.api";
import { expenseVoucherFormValuesToPayload } from "../utils/expenseVoucherDrawerUtils";
import { EXPENSE_VOUCHERS_LIST_QUERY_KEY, expenseVoucherDetailQueryKey } from "./expenseVouchersQueryKeys";

/**
 * Save / post / reverse / delete for the expense voucher drawer (same flow as the other documents).
 *
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   voucherId: string | number | null;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSaved?: (record: Record<string, unknown>) => void;
 *   onPosted?: (record: Record<string, unknown>) => void;
 *   onReversed?: (record: Record<string, unknown>) => void;
 *   onDeleted?: () => void;
 * }} args
 */
export function useExpenseVoucherDrawerMutations({
  form,
  message,
  notification,
  t,
  tApiErrors,
  voucherId,
  onCreated,
  onSaved,
  onPosted,
  onReversed,
  onDeleted,
}) {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    invalidateTenantListQueries(queryClient, EXPENSE_VOUCHERS_LIST_QUERY_KEY);
    // Posting moves money out of a cash box / bank account.
    queryClient.invalidateQueries({ queryKey: ["tenant", "cash-bank-accounts"] });
  }, [queryClient]);

  const cacheDetail = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id != null) queryClient.setQueryData(expenseVoucherDetailQueryKey(id), record);
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
      const body = expenseVoucherFormValuesToPayload(values);
      const saved = /** @type {Record<string, any>} */ (
        voucherId != null ? await updateExpenseVoucher(voucherId, body) : await createExpenseVoucher(body)
      );
      cacheDetail(saved);
      if (voucherId == null) onCreated?.(saved);
      return saved;
    },
    [voucherId, cacheDetail, onCreated],
  );

  const saveMutation = useMutation({
    mutationFn: ({ values }) => persist(values),
    onError,
    onSuccess: (record) => {
      message.success(voucherId == null ? t("drawerCreateSuccess") : t("drawerUpdateSuccess"));
      invalidate();
      onSaved?.(record);
    },
  });

  const postMutation = useMutation({
    mutationFn: async ({ values }) => {
      const saved = await persist(values);
      return postExpenseVoucher(String(saved.id));
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
    mutationFn: () => reverseExpenseVoucher(String(voucherId)),
    onError,
    onSuccess: (record) => {
      message.success(t("reverseSuccess"));
      cacheDetail(record);
      invalidate();
      onReversed?.(record);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteExpenseVoucher(String(voucherId)),
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
