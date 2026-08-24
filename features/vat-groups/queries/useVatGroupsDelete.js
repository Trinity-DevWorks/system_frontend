"use client";

import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { useTenantListRowDelete } from "@/lib/tables/useTenantListRowDelete";
import { deleteVatGroup } from "../api/vatGroups.api";
import { VAT_GROUPS_LIST_QUERY_KEY } from "./vatGroupsQueryKeys";

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
export function useVatGroupsDelete({
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
  const { requestDelete: requestDeleteVatGroup } = useTenantListRowDelete({
    listQueryKey: VAT_GROUPS_LIST_QUERY_KEY,
    deleteOne: deleteVatGroup,
    t,
    tApiErrors,
    notification,
    message,
    modal,
    getOpenRecordId: getOpenDrawerRecordId,
    closeDrawer,
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: VAT_GROUPS_LIST_QUERY_KEY,
    deleteOne: deleteVatGroup,
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

  return { requestDeleteVatGroup, openBulkDeleteConfirm, bulkDeletePending };
}
