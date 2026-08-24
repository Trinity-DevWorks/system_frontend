"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { useResourceAccess } from "@/lib/permissions";
import { parseNumericEntityId } from "@/lib/entityId";
import { useRolesDelete } from "../queries/useRolesDelete";
import { useRolesTableQuery } from "../queries/useRolesTableQuery";
import RoleDrawer from "../components/RoleDrawer/RoleDrawer";
import { isOwnerRoleName } from "../utils/roleDrawerUtils";
import { getRoleTableColumns } from "../components/RoleTable/getRoleTableColumns";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";

function RolesTable() {
  const t = useTranslations("Roles");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const access = useResourceAccess("roles");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useRolesTableQuery({
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
    recordId: drawerRoleId,
    tableSeed: drawerEditSeed,
    openCreateDrawer,
    openEditDrawer: openRoleEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated: handleRoleCreated,
    sessionRef: drawerSessionRef,
  } = useResourceDrawerUrl({ parseId: parseNumericEntityId });

  const openEditDrawer = useCallback(
    (record) => {
      // Owner role is immutable — open view instead of edit.
      if (isOwnerRoleName(record?.name)) {
        openViewDrawer(record);
        return;
      }
      openRoleEditDrawer(record);
    },
    [openRoleEditDrawer, openViewDrawer],
  );

  const { requestDeleteRole, openBulkDeleteConfirm, bulkDeletePending } = useRolesDelete({
    t,
    tApiErrors,
    tDataTable,
    notification,
    message,
    modal,
    selectedRowKeys,
    setSelectedRowKeys,
    tableData,
    getOpenDrawerRecordId: () => drawerSessionRef.current.recordId,
    closeDrawer,
  });

  const columns = useMemo(
    () =>
      getRoleTableColumns(t, {
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onView: access.canView ? openViewDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteRole : undefined,
      }),
    [t, access.canEdit, access.canView, access.canDelete, openEditDrawer, openViewDrawer, requestDeleteRole],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="roles"
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
        scrollX={1100}
        enableColumnDrag
        pagination={pagination}
      />
      <RoleDrawer
        open={drawerOpen}
        mode={drawerMode}
        roleId={drawerRoleId == null ? null : Number(drawerRoleId)}
        editSeedRecord={drawerEditSeed}
        onClose={closeDrawer}
        onCreated={handleRoleCreated}
      />
    </div>
  );
}

export default function RolesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <RolesTable />
      </Suspense>
    </div>
  );
}
