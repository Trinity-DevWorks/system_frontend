"use client";

import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { useTenantListRowDelete } from "@/lib/tables/useTenantListRowDelete";
import { useCallback } from "react";
import { deleteRole } from "../api/roles.api";
import { isSystemRoleName } from "../utils/roleDrawerUtils";
import { ROLES_LIST_QUERY_KEY } from "./rolesQueryKeys";

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
 *   tableData: Record<string, unknown>[];
 *   getOpenDrawerRecordId: () => string | number | null;
 *   closeDrawer: () => void;
 * }} args
 */
export function useRolesDelete({
  t,
  tApiErrors,
  tDataTable,
  notification,
  message,
  modal,
  selectedRowKeys,
  setSelectedRowKeys,
  tableData,
  getOpenDrawerRecordId,
  closeDrawer,
}) {
  const { requestDelete: requestDeleteRole } = useTenantListRowDelete({
    listQueryKey: ROLES_LIST_QUERY_KEY,
    deleteOne: deleteRole,
    t,
    tApiErrors,
    notification,
    message,
    modal,
    getOpenRecordId: getOpenDrawerRecordId,
    closeDrawer,
  });

  const { openBulkDeleteConfirm: openBulkDeleteConfirmBase, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ROLES_LIST_QUERY_KEY,
    deleteOne: deleteRole,
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

  const openBulkDeleteConfirm = useCallback(() => {
    const hasProtected = selectedRowKeys.some((key) => {
      const row = tableData.find((r) => Number(r.id) === Number(key));
      return row && isSystemRoleName(row.name);
    });
    if (hasProtected) {
      message.warning(t("bulkDeleteSystemProtected"));
      return;
    }
    openBulkDeleteConfirmBase();
  }, [selectedRowKeys, tableData, message, t, openBulkDeleteConfirmBase]);

  return { requestDeleteRole, openBulkDeleteConfirm, bulkDeletePending };
}
