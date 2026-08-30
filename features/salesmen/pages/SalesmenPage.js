"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { getSalesmanTableColumns } from "../components/SalesmanTable/getSalesmanTableColumns";
import { useSalesmenDelete } from "../queries/useSalesmenDelete";
import { useSalesmenTableQuery } from "../queries/useSalesmenTableQuery";

function SalesmenTable() {
  const t = useTranslations("Salesmen");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const access = useResourceAccess("salesmen");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useSalesmenTableQuery({
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
  } = usePageDrawer("salesmen");

  const { requestDeleteSalesman, openBulkDeleteConfirm, bulkDeletePending } = useSalesmenDelete({
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
      getSalesmanTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteSalesman : undefined,
      }),
    [t, access.canView, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer, requestDeleteSalesman],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="salesmen"
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
        scrollX={1460}
        enableColumnDrag
        pagination={pagination}
      />
    </div>
  );
}

export default function SalesmenPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <SalesmenTable />
      </Suspense>
    </div>
  );
}
