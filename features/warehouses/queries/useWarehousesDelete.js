"use client";

import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { useTenantListRowDelete } from "@/lib/tables/useTenantListRowDelete";
import { deleteWarehouse } from "../api/warehouses.api";
import { WAREHOUSES_LIST_QUERY_KEY } from "./warehousesQueryKeys";

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
 *   getOpenDrawerRecordId: () => string | number | null;
 *   closeDrawer: () => void;
 * }} args
 */
export function useWarehousesDelete({
  t,
  tApiErrors,
  tDataTable,
  notification,
  message,
  modal,
  selectedRowKeys,
  setSelectedRowKeys,
  getOpenDrawerRecordId,
  closeDrawer,
}) {
  const { requestDelete: requestDeleteWarehouse } = useTenantListRowDelete({
    listQueryKey: WAREHOUSES_LIST_QUERY_KEY,
    deleteOne: deleteWarehouse,
    t,
    tApiErrors,
    notification,
    message,
    modal,
    getOpenRecordId: getOpenDrawerRecordId,
    closeDrawer,
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: WAREHOUSES_LIST_QUERY_KEY,
    deleteOne: deleteWarehouse,
    message,
    notification,
    modal,
    tDataTable,
    tEntity: t,
    tApiErrors,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenRecordId: getOpenDrawerRecordId,
    closeDrawer,
  });

  return { requestDeleteWarehouse, openBulkDeleteConfirm, bulkDeletePending };
}
