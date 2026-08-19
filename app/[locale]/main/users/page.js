"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { useResourceAccess } from "@/lib/permissions";
import { normalizeEntityId } from "@/lib/entityId";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { deleteTenantUser, fetchTenantUsers } from "@/services/tenantUsersApi";
import UserDrawer from "./drawer/UserDrawer";
import { getUserStatusLabel, getUserTableColumns } from "./getUserTableColumns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";

function UsersTable() {
  const t = useTranslations("Users");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("users");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    rows,
    isPending,
    isFetching,
    refetch,
    pagination,
    onSearchChange,
  } = useTenantPaginatedTable({
    queryKey: ["tenant", "users"],
    queryFn: fetchTenantUsers,
    tableId: "users",
    t,
    tApiErrors,
    notification,
  });

  const tableData = useMemo(
    () =>
      rows.map((row) => {
        const branches = Array.isArray(row?.branches) ? row.branches : [];
        const roleNames = [
          ...new Set(
            branches
              .map((branch) => {
                if (typeof branch?.role?.name === "string" && branch.role.name.trim()) {
                  return branch.role.name.trim();
                }
                return "";
              })
              .filter(Boolean),
          ),
        ];
        const sharedRoleName =
          typeof row?.role?.name === "string" && row.role.name.trim() ? row.role.name.trim() : "";

        return {
          ...row,
          role_name: sharedRoleName || (roleNames.length > 0 ? roleNames.join(", ") : ""),
          branches_label: branches
            .map((branch) => {
              const name = typeof branch?.name === "string" ? branch.name.trim() : "";
              const roleName = typeof branch?.role?.name === "string" ? branch.role.name.trim() : "";
              if (!name) return "";
              return roleName ? `${name} (${roleName})` : name;
            })
            .filter(Boolean)
            .join(", "),
          active_label: getUserStatusLabel(row?.is_active, t),
        };
      }),
    [rows, t],
  );

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

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deleteTenantUser(id),
    onError: (err) => {
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "users", deletedId] });
      const { open, recordId } = drawerSessionRef.current;
      if (open && recordId != null && String(recordId) === String(deletedId)) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "users"] });
    },
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ["tenant", "users"],
    deleteOne: deleteTenantUser,
    message,
    notification,
    modal,
    tDataTable,
    tEntity: t,
    tApiErrors,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenRecordId: () => drawerSessionRef.current.recordId,
    closeDrawer,
  });

  const requestDeleteUser = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      const name = typeof record?.name === "string" ? record.name : id;
      modal.confirm({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent", { name }),
        okText: t("deleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("deleteConfirmCancel"),
        onOk: async () => {
          try {
            await deleteMutation.mutateAsync(id);
          } catch {
            /* onError handles feedback */
          }
        },
      });
    },
    [deleteMutation, modal, t],
  );

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
