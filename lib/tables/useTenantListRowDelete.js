"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId, parseNumericEntityId } from "@/lib/entityId";
import {
  removeIdsFromTenantListCache,
  restoreTenantListCache,
  snapshotTenantListCache,
  cancelTenantListQueries,
} from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * @param {unknown} record
 * @returns {string | number | null}
 */
function defaultToId(record) {
  const numeric = parseNumericEntityId(/** @type {{ id?: unknown }} */ (record)?.id);
  if (numeric != null) return numeric;
  return normalizeEntityId(/** @type {{ id?: unknown }} */ (record)?.id);
}

/**
 * Single-row list delete: row leaves the table on confirm, cache rolls back on error.
 *
 * @param {{
 *   listQueryKey: readonly unknown[];
 *   deleteOne: (id: string | number) => Promise<unknown>;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: import("antd").NotificationInstance;
 *   message: import("antd").MessageInstance;
 *   modal: import("antd").ModalStaticFunctions;
 *   getOpenRecordId?: () => string | number | null | undefined;
 *   closeDrawer?: () => void;
 *   toId?: (record: Record<string, unknown>) => string | number | null;
 * }} args
 */
export function useTenantListRowDelete({
  listQueryKey,
  deleteOne,
  t,
  tApiErrors,
  notification,
  message,
  modal,
  getOpenRecordId,
  closeDrawer,
  toId = defaultToId,
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string | number} */ id) => deleteOne(id),
    onMutate: async (id) => {
      await cancelTenantListQueries(queryClient, listQueryKey);
      const previous = snapshotTenantListCache(queryClient, listQueryKey);
      removeIdsFromTenantListCache(queryClient, listQueryKey, [id]);
      const openId = typeof getOpenRecordId === "function" ? getOpenRecordId() : null;
      if (openId != null && String(openId) === String(id) && typeof closeDrawer === "function") {
        closeDrawer();
      }
      return { previous };
    },
    onError: (err, _id, context) => {
      restoreTenantListCache(queryClient, context?.previous);
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, id) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: [...listQueryKey, id] });
    },
  });

  const requestDelete = useCallback(
    (record) => {
      const id = toId(record);
      if (id == null) return;
      const name =
        typeof record?.name === "string" && record.name.trim() ? record.name.trim() : String(id);
      modal.confirm({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent", { name }),
        okText: t("deleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("deleteConfirmCancel"),
        onOk: () => {
          deleteMutation.mutate(id);
        },
      });
    },
    [deleteMutation, modal, t, toId],
  );

  return {
    requestDelete,
    deletePending: deleteMutation.isPending,
  };
}
