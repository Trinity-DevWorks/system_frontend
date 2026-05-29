"use client";

import { deleteManyById } from "@/lib/tables/deleteManyById";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Bulk delete for tenant list screens: confirm modal, sequential API calls, cache + drawer cleanup.
 *
 * @param {{
 *   listQueryKey: readonly unknown[];
 *   deleteOne: (id: number) => Promise<unknown>;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   modal: import("antd").ModalStaticFunctions;
 *   tDataTable: ReturnType<typeof import("next-intl").useTranslations<"DataTable">>;
 *   tEntity: (key: string, values?: Record<string, unknown | string>) => string;
 *   tApiErrors: (key: string) => string;
 *   selectedRowKeys: React.Key[];
 *   setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
 *   getOpenRecordId?: () => number | null;
 *   closeDrawer?: () => void;
 * }} args
 */
export function useTenantListBulkDelete({
  listQueryKey,
  deleteOne,
  message,
  notification,
  modal,
  tDataTable,
  tEntity,
  tApiErrors,
  selectedRowKeys,
  setSelectedRowKeys,
  getOpenRecordId,
  closeDrawer,
}) {
  const queryClient = useQueryClient();

  const bulkDeleteMutation = useMutation({
    mutationFn: async (/** @type {number[]} */ ids) => deleteManyById(deleteOne, ids),
    onSuccess: (/** @type {{ successfulIds: number[], failures: { id: number, reason: unknown }[] }} */ result) => {
      const { successfulIds, failures } = result;
      for (const id of successfulIds) {
        queryClient.removeQueries({ queryKey: [...listQueryKey, id] });
      }
      if (successfulIds.length > 0) {
        const idSet = new Set(successfulIds);
        queryClient.setQueryData(listQueryKey, (old) => {
          if (!Array.isArray(old)) return old;
          return old.filter((row) => !idSet.has(/** @type {{ id?: number }} */ (row)?.id));
        });
      }

      if (successfulIds.length === 0 && failures.length > 0) {
        notification.error({
          title: tDataTable("bulkDeleteError"),
          description: getLocalizedApiErrorMessage(tApiErrors, failures[0].reason),
        });
        return;
      }

      if (failures.length === 0) {
        message.success(tDataTable("bulkDeleteSuccess", { count: successfulIds.length }));
      } else {
        message.warning(
          tDataTable("bulkDeletePartial", {
            deleted: successfulIds.length,
            failed: failures.length,
          }),
        );
      }

      setSelectedRowKeys([]);
      const openId = typeof getOpenRecordId === "function" ? getOpenRecordId() : null;
      if (openId != null && successfulIds.includes(openId) && typeof closeDrawer === "function") {
        closeDrawer();
      }
    },
  });

  const openBulkDeleteConfirm = useCallback(() => {
    const ids = selectedRowKeys
      .map((k) => Number(k))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) return;
    modal.confirm({
      title: tDataTable("bulkDeleteConfirmTitle", { count: ids.length }),
      content: tDataTable("bulkDeleteConfirmContent", { count: ids.length }),
      okText: tEntity("deleteConfirmOk"),
      cancelText: tEntity("deleteConfirmCancel"),
      okButtonProps: { danger: true },
      onOk: () => bulkDeleteMutation.mutateAsync(ids),
    });
  }, [
    bulkDeleteMutation,
    modal,
    selectedRowKeys,
    tDataTable,
    tEntity,
  ]);

  return {
    openBulkDeleteConfirm,
    bulkDeletePending: bulkDeleteMutation.isPending,
  };
}
