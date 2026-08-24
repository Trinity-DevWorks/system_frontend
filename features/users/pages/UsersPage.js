"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { useResourceAccess } from "@/lib/permissions";
import { useUsersDelete } from "../queries/useUsersDelete";
import { useUsersTableQuery } from "../queries/useUsersTableQuery";
import UserDrawer from "../components/UserDrawer/UserDrawer";
import { getUserTableColumns } from "../components/UserTable/getUserTableColumns";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";

function UsersTable() {
  const t = useTranslations("Users");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const access = useResourceAccess("users");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useUsersTableQuery({
    t,
    tApiErrors,
    notification,
  });

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  const {
    open: drawerOpen,
    mode: drawerMode,
    recordId: drawerUserId,
    tableSeed: drawerEditSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated: handleUserCreated,
    sessionRef: drawerSessionRef,
  } = useResourceDrawerUrl();

  const { requestDeleteUser, openBulkDeleteConfirm, bulkDeletePending } = useUsersDelete({
    t,
    tApiErrors,
    tDataTable,
    notification,
    message,
    modal,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenDrawerRecordId: () => drawerSessionRef.current.recordId,
    closeDrawer,
  });

  const columns = useMemo(
    () =>
      getUserTableColumns(t, {
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onView: access.canView ? openViewDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteUser : undefined,
      }),
    [t, access.canEdit, access.canView, access.canDelete, openEditDrawer, openViewDrawer, requestDeleteUser],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="users"
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
        scrollX={1360}
        enableColumnDrag
        pagination={pagination}
      />
      <UserDrawer
        open={drawerOpen}
        mode={drawerMode}
        userId={
          typeof drawerUserId === "string" || typeof drawerUserId === "number"
            ? String(drawerUserId)
            : null
        }
        editSeedRecord={drawerEditSeed}
        onClose={closeDrawer}
        onCreated={handleUserCreated}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <UsersTable />
      </Suspense>
    </div>
  );
}
