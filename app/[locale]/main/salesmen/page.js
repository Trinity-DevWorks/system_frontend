"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess } from "@/lib/permissions";
import { normalizeEntityId } from "@/lib/entityId";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { deleteSalesman, fetchSalesmen } from "@/services/salesmenApi";
import SalesmanDrawer from "./drawer/SalesmanDrawer";
import { getSalesmanStatusLabel, getSalesmanTableColumns } from "./getSalesmanTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function SalesmenTable() {
  const t = useTranslations("Salesmen");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("salesmen");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    data = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant", "salesmen"],
    queryFn: fetchSalesmen,
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
        is_active_label: getSalesmanStatusLabel(row?.is_active, t),
      })),
    [data, t],
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(/** @type {"create" | "edit" | "view"} */ ("create"));
  const [drawerSalesmanId, setDrawerSalesmanId] = useState(/** @type {string | null} */ (null));
  const [drawerTableSeed, setDrawerTableSeed] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const drawerSessionRef = useRef({ open: false, salesmanId: /** @type {string | null} */ (null) });
  useEffect(() => {
    drawerSessionRef.current = { open: drawerOpen, salesmanId: drawerSalesmanId };
  }, [drawerOpen, drawerSalesmanId]);

  const openCreateDrawer = useCallback(() => {
    setDrawerTableSeed(null);
    setDrawerMode("create");
    setDrawerSalesmanId(null);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerSalesmanId(id);
    setDrawerOpen(true);
  }, []);

  const openViewDrawer = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("view");
    setDrawerSalesmanId(id);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerSalesmanId(null);
    setDrawerTableSeed(null);
  }, []);

  const handleSalesmanCreated = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerSalesmanId(id);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deleteSalesman(id),
    onMutate: async (id) => {
      const listKey = ["tenant", "salesmen"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old) => (Array.isArray(old) ? old.filter((row) => row.id !== id) : old));
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "salesmen"], context.previous);
      }
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "salesmen", deletedId] });
      const { open, salesmanId } = drawerSessionRef.current;
      if (open && salesmanId === deletedId) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "salesmen"] });
    },
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ["tenant", "salesmen"],
    deleteOne: deleteSalesman,
    message,
    notification,
    modal,
    tDataTable,
    tEntity: t,
    tApiErrors,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenRecordId: () => drawerSessionRef.current.salesmanId,
    closeDrawer,
  });

  const requestDeleteSalesman = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      const name =
        typeof record?.full_name === "string" && record.full_name.trim()
          ? record.full_name
          : id;
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
            /* mutation onError */
          }
        },
      });
    },
    [deleteMutation, modal, t],
  );

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
          searchKeys: [
            "salesman_code",
            "full_name",
            "branch_name",
            "phone",
            "email",
            "warehouse_name",
            "commission_type",
            "is_active_label",
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
        scrollX={1460}
        enableColumnDrag
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50],
        }}
      />
      <SalesmanDrawer
        open={drawerOpen}
        mode={drawerMode}
        salesmanId={drawerSalesmanId}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleSalesmanCreated}
      />
    </div>
  );
}

export default function SalesmenPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <SalesmenTable />
    </div>
  );
}
