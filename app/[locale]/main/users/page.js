"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { deleteTenantUser, fetchTenantUsers } from "@/services/tenantUsersApi";
import UserDrawer from "./drawer/UserDrawer";
import { getUserStatusLabel, getUserTableColumns } from "./getUserTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function UsersTable() {
  const t = useTranslations("Users");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
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
    queryKey: ["tenant", "users"],
    queryFn: fetchTenantUsers,
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
        role_name: row?.role?.name ?? "",
        active_label: getUserStatusLabel(row?.active, t),
      })),
    [data, t],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(/** @type {"create" | "edit" | "view"} */ ("create"));
  const [drawerUserId, setDrawerUserId] = useState(/** @type {string | null} */ (null));
  const [drawerEditSeed, setDrawerEditSeed] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const drawerSessionRef = useRef({ open: false, userId: /** @type {string | null} */ (null) });
  useEffect(() => {
    drawerSessionRef.current = { open: drawerOpen, userId: drawerUserId };
  }, [drawerOpen, drawerUserId]);

  const openCreateDrawer = useCallback(() => {
    setDrawerEditSeed(null);
    setDrawerMode("create");
    setDrawerUserId(null);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    setDrawerEditSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerUserId(id);
    setDrawerOpen(true);
  }, []);

  const openViewDrawer = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    setDrawerEditSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("view");
    setDrawerUserId(id);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerUserId(null);
    setDrawerEditSeed(null);
  }, []);

  const handleUserCreated = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    setDrawerEditSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerUserId(id);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deleteTenantUser(id),
    onMutate: async (id) => {
      const listKey = ["tenant", "users"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old) =>
        Array.isArray(old) ? old.filter((row) => row.id !== id) : old,
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "users"], context.previous);
      }
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "users", deletedId] });
      const { open, userId } = drawerSessionRef.current;
      if (open && userId === deletedId) {
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
    getOpenRecordId: () => drawerSessionRef.current.userId,
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
        onEdit: openEditDrawer,
        onView: openViewDrawer,
        onDelete: requestDeleteUser,
      }),
    [t, openEditDrawer, openViewDrawer, requestDeleteUser],
  );

  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      const freshData = await fetchTenantUsers();
      queryClient.setQueryData(["tenant", "users"], freshData);
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
        tableId="users"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching || manualRefreshing}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          searchKeys: ["name", "email", "role_name", "active_label"],
          showAdd: true,
          onAdd: openCreateDrawer,
          showRefresh: true,
          onRefresh: handleRefresh,
        }}
        rowSelection={rowSelection}
        showSelectionBar
        onBulkDelete={openBulkDeleteConfirm}
        bulkDeleteLoading={bulkDeletePending}
        stickyHeader
        scrollX={1180}
        enableColumnDrag
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50],
        }}
      />
      <UserDrawer
        open={drawerOpen}
        mode={drawerMode}
        userId={drawerUserId}
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
      <UsersTable />
    </div>
  );
}
