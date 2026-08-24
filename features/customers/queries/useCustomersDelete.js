"use client";

import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { useTenantListRowDelete } from "@/lib/tables/useTenantListRowDelete";
import { deleteCustomer } from "../api/customers.api";
import { CUSTOMERS_LIST_QUERY_KEY } from "./customersQueryKeys";

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
export function useCustomersDelete({
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
  const { requestDelete: requestDeleteCustomer } = useTenantListRowDelete({
    listQueryKey: CUSTOMERS_LIST_QUERY_KEY,
    deleteOne: deleteCustomer,
    t,
    tApiErrors,
    notification,
    message,
    modal,
    getOpenRecordId: getOpenDrawerRecordId,
    closeDrawer,
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: CUSTOMERS_LIST_QUERY_KEY,
    deleteOne: deleteCustomer,
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

  return {
    requestDeleteCustomer,
    openBulkDeleteConfirm,
    bulkDeletePending,
  };
}
