"use client";

import { useCentralResourceAccess } from "@/lib/central-permissions";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";
import { getCentralRoleTableColumns } from "../components/CentralRoleTable/getCentralRoleTableColumns";
import { useCentralRolesDelete } from "../queries/useRolesDelete";
import { useCentralRolesTableQuery } from "../queries/useRolesTableQuery";
import { isSystemCentralRole } from "../utils/roleDrawerUtils";

function CentralRolesTable() {
  const t = useTranslations("CentralRoles");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const access = useCentralResourceAccess("roles");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useCentralRolesTableQuery({
    t,
    tApiErrors,
    notification,
  });

  const {
    openCreateDrawer,
    openEditDrawer: openRoleEditDrawer,
    openViewDrawer,
    closeDrawer,
    getOpenRecordId,
  } = usePageDrawer("centralRoles");

  const openEditDrawer = useCallback(
    (record) => {
      if (isSystemCentralRole(record)) {
        openViewDrawer(record);
        return;
      }
      openRoleEditDrawer(record);
    },
    [openRoleEditDrawer, openViewDrawer],
  );

  const { requestDeleteRole, openBulkDeleteConfirm, bulkDeletePending } = useCentralRolesDelete({
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
      getCentralRoleTableColumns(t, {
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onView: access.canView ? openViewDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteRole : undefined,
      }),
    [t, access.canEdit, access.canView, access.canDelete, openEditDrawer, openViewDrawer, requestDeleteRole],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="central-roles"
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
                getCheckboxProps: (record) => ({ disabled: isSystemCentralRole(record) }),
              }
            : false
        }
        showSelectionBar={access.canDelete}
        onBulkDelete={access.canDelete ? openBulkDeleteConfirm : undefined}
        bulkDeleteLoading={bulkDeletePending}
        stickyHeader
        scrollX={1000}
        enableColumnDrag
        pagination={pagination}
      />
    </div>
  );
}

export default function CentralRolesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <CentralRolesTable />
      </Suspense>
    </div>
  );
}
