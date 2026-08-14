"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { useResourceAccess } from "@/lib/permissions";
import { parseNumericEntityId } from "@/lib/entityId";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { deleteRole, fetchRoles } from "@/services/rolesApi";
import RoleDrawer from "./drawer/RoleDrawer";
import { isOwnerRoleName, isSystemRoleName } from "./drawer/roleDrawerUtils";
import { getRoleStatusLabel, getRoleTableColumns } from "./getRoleTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function RolesTable() {
  const t = useTranslations("Roles");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("roles");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const {
    data = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant", "roles"],
    queryFn: fetchRoles,
    staleTime: 5 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!isError || !error) return;
    notification.error({
      title: t("loadError"),
      description: getLocalizedApiErrorMessage(tApiErrors, error),
    });
  }, [isError, error, notification, t, tApiErrors]);

  const tableData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        active_label: getRoleStatusLabel(row?.is_active, t),
      })),
    [data, t],
  );

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

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteRole(id),
    onMutate: async (id) => {
      const listKey = ["tenant", "roles"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old) =>
        Array.isArray(old) ? old.filter((row) => row.id !== id) : old,
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "roles"], context.previous);
      }
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "roles", deletedId] });
      const { open, recordId } = drawerSessionRef.current;
      if (open && recordId != null && Number(recordId) === Number(deletedId)) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "roles"] });
    },
  });

  const { openBulkDeleteConfirm: openBulkDeleteConfirmBase, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ["tenant", "roles"],
    deleteOne: deleteRole,
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

  const openBulkDeleteConfirm = useCallback(() => {
    const hasProtected = selectedRowKeys.some((key) => {
      const row = tableData.find((r) => Number(r.id) === Number(key));
      return row && isSystemRoleName(row.name);
    });
    if (hasProtected) {
      message.warning(t("bulkDeleteSystemProtected"));
      return;
    }
    openBulkDeleteConfirmBase();
  }, [selectedRowKeys, tableData, message, t, openBulkDeleteConfirmBase]);

  const requestDeleteRole = useCallback(
    (record) => {
      const id = record?.id;
      if (id == null || isSystemRoleName(record?.name)) return;
      const name = typeof record?.name === "string" ? record.name : String(id);
      modal.confirm({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent", { name }),
        okText: t("deleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("deleteConfirmCancel"),
        onOk: async () => {
          try {
            await deleteMutation.mutateAsync(Number(id));
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
      getRoleTableColumns(t, {
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onView: access.canView ? openViewDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteRole : undefined,
      }),
    [t, access.canEdit, access.canView, access.canDelete, openEditDrawer, openViewDrawer, requestDeleteRole],
  );

  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      const freshData = await fetchRoles();
      queryClient.setQueryData(["tenant", "roles"], freshData);
    } catch (err) {
      notification.error({
        title: t("loadError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
      return { isError: true };
    } finally {
      setManualRefreshing(false);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="roles"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching || manualRefreshing}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          searchKeys: ["name", "description", "id", "active_label"],
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          showRefresh: true,
          onRefresh: handleRefresh,
        }}
        rowSelection={access.canDelete ? rowSelection : false}
        showSelectionBar={access.canDelete}
        onBulkDelete={access.canDelete ? openBulkDeleteConfirm : undefined}
        bulkDeleteLoading={bulkDeletePending}
        stickyHeader
        scrollX={1100}
        enableColumnDrag
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50],
        }}
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
