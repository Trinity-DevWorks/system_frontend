/**
 * Single-row delete, bulk delete, and cache cleanup for the items list page.
 *
 * Used by:
 * - app/[locale]/main/items/page.js
 */

import { ITEMS_LIST_QUERY_KEY, removeItemsFromListCache } from "@/components/items/itemsQueryCache";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { deleteItem } from "@/services/itemsApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   tDataTable: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   message: ReturnType<typeof import("antd").App.useApp>["message"];
 *   modal: ReturnType<typeof import("antd").App.useApp>["modal"];
 *   selectedRowKeys: import("react").Key[];
 *   setSelectedRowKeys: (keys: import("react").Key[]) => void;
 *   getOpenDrawerItemId: () => number | null;
 *   isDrawerViewingItem: (id: number) => boolean;
 *   closeDrawer: () => void;
 * }} args
 */
export function useItemsDelete({
  t,
  tApiErrors,
  tDataTable,
  notification,
  message,
  modal,
  selectedRowKeys,
  setSelectedRowKeys,
  getOpenDrawerItemId,
  isDrawerViewingItem,
  closeDrawer,
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteItem(id),
    onError: (err) => {
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      removeItemsFromListCache(queryClient, [deletedId]);
      queryClient.removeQueries({ queryKey: ["tenant", "items", deletedId] });
      if (isDrawerViewingItem(deletedId)) closeDrawer();
    },
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ITEMS_LIST_QUERY_KEY,
    deleteOne: deleteItem,
    message,
    notification,
    modal,
    tDataTable,
    tEntity: t,
    tApiErrors,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenRecordId: getOpenDrawerItemId,
    closeDrawer,
  });

  const requestDeleteItem = useCallback(
    (record) => {
      const id = record?.id;
      if (id == null) return;
      const name = typeof record?.name === "string" ? record.name : String(id);
      modal.confirm({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent", { name }),
        okText: t("deleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("deleteConfirmCancel"),
        onOk: () => deleteMutation.mutateAsync(Number(id)),
      });
    },
    [deleteMutation, modal, t],
  );

  return {
    requestDeleteItem,
    openBulkDeleteConfirm,
    bulkDeletePending,
  };
}
