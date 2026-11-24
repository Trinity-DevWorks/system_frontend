"use client";

import { useCentralAuthMe } from "@/lib/central-auth-me";
import { useCentralResourceAccess } from "@/lib/central-permissions";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { getCentralUserTableColumns } from "../components/CentralUserTable/getCentralUserTableColumns";
import { useCentralUsersDelete } from "../queries/useUsersDelete";
import { useCentralUsersTableQuery } from "../queries/useUsersTableQuery";

function CentralUsersTable() {
  const t = useTranslations("CentralUsers");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const access = useCentralResourceAccess("users");
  const { me } = useCentralAuthMe();
  const currentUserId = me && typeof me === "object" ? /** @type {{ id?: string | number }} */ (me).id ?? null : null;
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useCentralUsersTableQuery({
    t,
    tApiErrors,
    notification,
  });

  const { openCreateDrawer, openEditDrawer, openViewDrawer, closeDrawer, getOpenRecordId } =
    usePageDrawer("centralUsers");

  const { requestDeleteUser, openBulkDeleteConfirm, bulkDeletePending } = useCentralUsersDelete({
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
      getCentralUserTableColumns(t, {
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onView: access.canView ? openViewDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteUser : undefined,
        currentUserId,
      }),
    [t, access.canEdit, access.canView, access.canDelete, openEditDrawer, openViewDrawer, requestDeleteUser, currentUserId],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="central-users"
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
                getCheckboxProps: (record) => ({
                  disabled: currentUserId != null && String(record?.id) === String(currentUserId),
                }),
              }
            : false
        }
        showSelectionBar={access.canDelete}
        onBulkDelete={access.canDelete ? openBulkDeleteConfirm : undefined}
        bulkDeleteLoading={bulkDeletePending}
        stickyHeader
        scrollX={1100}
        enableColumnDrag
        pagination={pagination}
      />
    </div>
  );
}

export default function CentralUsersPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <CentralUsersTable />
      </Suspense>
    </div>
  );
}
