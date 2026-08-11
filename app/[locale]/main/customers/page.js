"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess } from "@/lib/permissions";
import { normalizeEntityId } from "@/lib/entityId";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { deleteCustomer, fetchCustomers } from "@/services/customersApi";
import CustomerDrawer from "./drawer/CustomerDrawer";
import { getCustomerStatusLabel, getCustomerTableColumns } from "./getCustomerTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function CustomersTable() {
  const t = useTranslations("Customers");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { message, notification, modal } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("customers");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    data = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant", "customers"],
    queryFn: fetchCustomers,
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
        status_label: getCustomerStatusLabel(row?.status, t),
      })),
    [data, t],
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(/** @type {"create" | "edit" | "view"} */ ("create"));
  const [drawerCustomerId, setDrawerCustomerId] = useState(/** @type {string | null} */ (null));
  const [drawerTableSeed, setDrawerTableSeed] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const drawerSessionRef = useRef({
    open: false,
    customerId: /** @type {string | null} */ (null),
  });
  useEffect(() => {
    drawerSessionRef.current = { open: drawerOpen, customerId: drawerCustomerId };
  }, [drawerOpen, drawerCustomerId]);

  const openCreateDrawer = useCallback(() => {
    setDrawerTableSeed(null);
    setDrawerMode("create");
    setDrawerCustomerId(null);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    setDrawerTableSeed(null);
    setDrawerMode("edit");
    setDrawerCustomerId(id);
    setDrawerOpen(true);
  }, []);

  const openViewDrawer = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    setDrawerTableSeed(null);
    setDrawerMode("view");
    setDrawerCustomerId(id);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerCustomerId(null);
    setDrawerTableSeed(null);
  }, []);

  const handleCustomerCreated = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerCustomerId(id);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deleteCustomer(id),
    onMutate: async (id) => {
      const listKey = ["tenant", "customers"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old) => (Array.isArray(old) ? old.filter((row) => row.id !== id) : old));
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "customers"], context.previous);
      }
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "customers", deletedId] });
      const { open, customerId } = drawerSessionRef.current;
      if (open && customerId === deletedId) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "customers"] });
    },
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ["tenant", "customers"],
    deleteOne: deleteCustomer,
    message,
    notification,
    modal,
    tDataTable,
    tEntity: t,
    tApiErrors,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenRecordId: () => drawerSessionRef.current.customerId,
    closeDrawer,
  });

  const requestDeleteCustomer = useCallback(
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
            // onError on mutation already shows feedback; resolve so confirm closes.
          }
        },
      });
    },
    [deleteMutation, modal, t],
  );

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
          searchKeys: [
            "customer_code",
            "name",
            "customer_group.name",
            "phone",
            "email",
            "status_label",
          ],
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
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50],
        }}
      />
      <CustomerDrawer
        open={drawerOpen}
        mode={drawerMode}
        customerId={drawerCustomerId}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleCustomerCreated}
      />
    </div>
  );
}

export default function CustomersPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <CustomersTable />
    </div>
  );
}
