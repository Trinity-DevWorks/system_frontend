"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { getCustomerTableColumns } from "../components/CustomerTable/getCustomerTableColumns";
import { useCustomersDelete } from "../queries/useCustomersDelete";
import { useCustomersTableQuery } from "../queries/useCustomersTableQuery";

function CustomersTable() {
  const t = useTranslations("Customers");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { message, notification, modal } = App.useApp();
  const access = useResourceAccess("customers");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useCustomersTableQuery({
    t,
    tApiErrors,
    notification,
  });

  const {
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    getOpenRecordId,
  } = usePageDrawer("customers");

  const { requestDeleteCustomer, openBulkDeleteConfirm, bulkDeletePending } = useCustomersDelete({
    t,
    tApiErrors,
    tDataTable,
    notification,
    message,
    modal,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenDrawerRecordId: getOpenRecordId,
    closeDrawer,
  });

  const columns = useMemo(
    () =>
      getCustomerTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteCustomer : undefined,
      }),
    [t, access.canView, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer, requestDeleteCustomer],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
    getCheckboxProps: (record) => ({ disabled: Boolean(record?.is_system) }),
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="customers"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange,
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          showRefresh: true,
          onRefresh: () => refetch(),
        }}
        rowSelection={access.canDelete ? rowSelection : false}
        showSelectionBar={access.canDelete}
        onBulkDelete={access.canDelete ? openBulkDeleteConfirm : undefined}
        bulkDeleteLoading={bulkDeletePending}
        stickyHeader
        scrollX={1280}
        enableColumnDrag
        pagination={pagination}
      />
    </div>
  );
}

export default function CustomersPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <CustomersTable />
      </Suspense>
    </div>
  );
}
