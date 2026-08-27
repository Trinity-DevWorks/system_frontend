/**
 * Single-row delete, bulk delete, and cache cleanup for the items list page.
 *
 * Used by:
 * - app/[locale]/main/items/page.js
 */

import { ITEMS_LIST_QUERY_KEY } from "./itemsQueryKeys";
import { normalizeEntityId } from "@/lib/entityId";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { useTenantListRowDelete } from "@/lib/tables/useTenantListRowDelete";
import { deleteItem } from "../api/items.api";

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
 *   getOpenDrawerItemId: () => string | null;
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
  closeDrawer,
}) {
  const { requestDelete: requestDeleteItem } = useTenantListRowDelete({
    listQueryKey: ITEMS_LIST_QUERY_KEY,
    deleteOne: deleteItem,
    t,
    tApiErrors,
    notification,
    message,
    modal,
    getOpenRecordId: getOpenDrawerItemId,
    closeDrawer,
    toId: (record) => normalizeEntityId(record?.id),
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

  return {
    requestDeleteItem,
    openBulkDeleteConfirm,
    bulkDeletePending,
  };
}
