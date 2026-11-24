"use client";

import { CENTRAL_OVERVIEW_QUERY_KEY } from "@/features/central/overview/queries/overviewQueryKeys";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { useTenantListRowDelete } from "@/lib/tables/useTenantListRowDelete";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { deleteCentralPlan } from "../api/plans.api";
import { CENTRAL_PLANS_LIST_QUERY_KEY } from "./plansQueryKeys";

/**
 * Plans with tenants are refused by the API (409 PLAN_IN_USE); the shared delete hooks show that error.
 *
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
export function useCentralPlansDelete({
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
  const queryClient = useQueryClient();
  const deleteOne = useCallback(
    async (id) => {
      const result = await deleteCentralPlan(id);
      queryClient.invalidateQueries({ queryKey: CENTRAL_OVERVIEW_QUERY_KEY });
      return result;
    },
    [queryClient],
  );

  const { requestDelete: requestDeletePlan } = useTenantListRowDelete({
    listQueryKey: CENTRAL_PLANS_LIST_QUERY_KEY,
    deleteOne,
    t,
    tApiErrors,
    notification,
    message,
    modal,
    getOpenRecordId: getOpenDrawerRecordId,
    closeDrawer,
  });

  const { openBulkDeleteConfirm: openBulkDeleteConfirmBase, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: CENTRAL_PLANS_LIST_QUERY_KEY,
    deleteOne,
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

  // Plans with tenants cannot be deleted: say so up front instead of failing row by row.
  const openBulkDeleteConfirm = useCallback(() => {
    const inUse = selectedRowKeys.some(
      (key) => Number(tableData.find((r) => Number(r.id) === Number(key))?.tenants_count ?? 0) > 0,
    );
    if (inUse) {
      message.warning(t("bulkDeleteInUse"));
      return;
    }
    openBulkDeleteConfirmBase();
  }, [selectedRowKeys, tableData, message, t, openBulkDeleteConfirmBase]);

  return { requestDeletePlan, openBulkDeleteConfirm, bulkDeletePending };
}
