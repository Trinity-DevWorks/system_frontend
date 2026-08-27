"use client";

import { deleteManyById } from "@/lib/tables/deleteManyById";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import {
  removeIdsFromTenantListCache,
  restoreTenantListCache,
  snapshotTenantListCache,
  cancelTenantListQueries,
} from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Bulk delete for tenant list screens: confirm modal, sequential API calls, cache + drawer cleanup.
 *
 * @param {{
 *   listQueryKey: readonly unknown[];
 *   deleteOne: (id: string) => Promise<unknown>;
 *   message: import("antd").MessageInstance;
 *   notification: import("antd").NotificationInstance;
 *   modal: import("antd").ModalStaticFunctions;
 *   tDataTable: ReturnType<typeof import("next-intl").useTranslations<"DataTable">>;
 *   tEntity: (key: string, values?: Record<string, unknown | string>) => string;
 *   tApiErrors: (key: string) => string;
 *   selectedRowKeys: React.Key[];
 *   setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
 *   getOpenRecordId?: () => string | null;
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
    mutationFn: async (/** @type {string[]} */ ids) => deleteManyById(deleteOne, ids),
    onMutate: async (ids) => {
      await cancelTenantListQueries(queryClient, listQueryKey);
      const previous = snapshotTenantListCache(queryClient, listQueryKey);
      const previousSelected = selectedRowKeys;
      removeIdsFromTenantListCache(queryClient, listQueryKey, ids);
      setSelectedRowKeys([]);
      const openId = typeof getOpenRecordId === "function" ? getOpenRecordId() : null;
      if (
        openId != null &&
        ids.some((id) => String(id) === String(openId)) &&
        typeof closeDrawer === "function"
      ) {
        closeDrawer();
      }
      return { previous, previousSelected };
    },
    onError: (err, _ids, context) => {
      restoreTenantListCache(queryClient, context?.previous);
      if (context?.previousSelected) setSelectedRowKeys(context.previousSelected);
      notification.error({
        title: tDataTable("bulkDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (
      /** @type {{ successfulIds: string[], failures: { id: string, reason: unknown }[] }} */ result,
      _ids,
      context,
    ) => {
      const { successfulIds, failures } = result;

      if (failures.length > 0) {
        restoreTenantListCache(queryClient, context?.previous);
        if (successfulIds.length > 0) {
          removeIdsFromTenantListCache(queryClient, listQueryKey, successfulIds);
        }
        setSelectedRowKeys(failures.map((failure) => failure.id));
      }

      for (const id of successfulIds) {
        queryClient.removeQueries({ queryKey: [...listQueryKey, id] });
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
    },
  });

  const openBulkDeleteConfirm = useCallback(() => {
    const ids = /** @type {string[]} */ (
      selectedRowKeys.map((k) => normalizeEntityId(k)).filter((id) => id != null)
    );
    if (ids.length === 0) return;
    modal.confirm({
      title: tDataTable("bulkDeleteConfirmTitle", { count: ids.length }),
      content: tDataTable("bulkDeleteConfirmContent", { count: ids.length }),
      okText: tEntity("deleteConfirmOk"),
      cancelText: tEntity("deleteConfirmCancel"),
      okButtonProps: { danger: true },
      onOk: () => {
        bulkDeleteMutation.mutate(ids);
      },
    });
  }, [bulkDeleteMutation, modal, selectedRowKeys, tDataTable, tEntity]);

  return {
    openBulkDeleteConfirm,
    bulkDeletePending: bulkDeleteMutation.isPending,
  };
}
