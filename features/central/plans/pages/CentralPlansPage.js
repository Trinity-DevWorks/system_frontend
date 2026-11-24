"use client";

import { useCentralResourceAccess } from "@/lib/central-permissions";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { getPlanTableColumns } from "../components/PlanTable/getPlanTableColumns";
import { useCentralPlansDelete } from "../queries/usePlansDelete";
import { useCentralPlansTableQuery } from "../queries/usePlansTableQuery";

function CentralPlansTable() {
  const t = useTranslations("CentralPlans");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const access = useCentralResourceAccess("plans");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useCentralPlansTableQuery({
    t,
    tApiErrors,
    notification,
  });

  const { openCreateDrawer, openEditDrawer, openViewDrawer, closeDrawer, getOpenRecordId } =
    usePageDrawer("centralPlans");

  const { requestDeletePlan, openBulkDeleteConfirm, bulkDeletePending } = useCentralPlansDelete({
    t,
    tApiErrors,
    tDataTable,
    notification,
    message,
    modal,
    selectedRowKeys,
    setSelectedRowKeys,
    tableData,
    getOpenDrawerRecordId: getOpenRecordId,
    closeDrawer,
  });

  const columns = useMemo(
    () =>
      getPlanTableColumns(t, {
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onView: access.canView ? openViewDrawer : undefined,
        onDelete: access.canDelete ? requestDeletePlan : undefined,
      }),
    [t, access.canEdit, access.canView, access.canDelete, openEditDrawer, openViewDrawer, requestDeletePlan],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="central-plans"
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
          showExportExcel: false,
          showExportPdf: false,
          showImportExcel: false,
        }}
        rowSelection={
          access.canDelete
            ? {
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                columnWidth: 48,
                getCheckboxProps: (record) => ({ disabled: Number(record?.tenants_count ?? 0) > 0 }),
              }
            : false
        }
        showSelectionBar={access.canDelete}
        onBulkDelete={access.canDelete ? openBulkDeleteConfirm : undefined}
        bulkDeleteLoading={bulkDeletePending}
        stickyHeader
        scrollX={1050}
        enableColumnDrag
        pagination={pagination}
      />
    </div>
  );
}

export default function CentralPlansPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <CentralPlansTable />
      </Suspense>
    </div>
  );
}
