"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { deleteWarehouse, fetchWarehouses } from "@/services/warehousesApi";
import WarehouseDrawer from "./drawer/WarehouseDrawer";
import {
  getWarehouseDefaultLabel,
  getWarehouseStatusLabel,
  getWarehouseTableColumns,
} from "./getWarehouseTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function WarehousesTable() {
  const t = useTranslations("Warehouses");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    data = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant", "warehouses"],
    queryFn: fetchWarehouses,
    staleTime: 5 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!isError || !error) return;
    notification.error({
      message: t("loadError"),
      description: getLocalizedApiErrorMessage(tApiErrors, error),
    });
  }, [isError, error, notification, t, tApiErrors]);

  const tableData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        is_active_label: getWarehouseStatusLabel(row?.is_active, t),
        is_default_label: getWarehouseDefaultLabel(row?.is_default, t),
      })),
    [data, t],
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(/** @type {"create" | "edit" | "view"} */ ("create"));
  const [drawerWarehouseId, setDrawerWarehouseId] = useState(/** @type {number | null} */ (null));
  const [drawerTableSeed, setDrawerTableSeed] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const drawerSessionRef = useRef({ open: false, warehouseId: /** @type {number | null} */ (null) });
  useEffect(() => {
    drawerSessionRef.current = { open: drawerOpen, warehouseId: drawerWarehouseId };
  }, [drawerOpen, drawerWarehouseId]);

  const openCreateDrawer = useCallback(() => {
    setDrawerTableSeed(null);
    setDrawerMode("create");
    setDrawerWarehouseId(null);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerWarehouseId(Number(id));
    setDrawerOpen(true);
  }, []);

  const openViewDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("view");
    setDrawerWarehouseId(Number(id));
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerWarehouseId(null);
    setDrawerTableSeed(null);
  }, []);

  const handleWarehouseCreated = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerWarehouseId(Number(id));
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteWarehouse(id),
    onMutate: async (id) => {
      const listKey = ["tenant", "warehouses"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old) => (Array.isArray(old) ? old.filter((row) => row.id !== id) : old));
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "warehouses"], context.previous);
      }
      notification.error({
        message: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "warehouses", deletedId] });
      const { open, warehouseId } = drawerSessionRef.current;
      if (open && warehouseId === deletedId) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "warehouses"] });
    },
  });

  const requestDeleteWarehouse = useCallback(
    (record) => {
      const id = record?.id;
      if (id == null) return;
      const name = typeof record?.name === "string" ? record.name : String(id);
      modal.confirm({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent", { name }),
        okText: t("deleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("deleteConfirmCancel"),
        onOk: () => deleteMutation.mutateAsync(Number(id)),
      });
    },
    [deleteMutation, modal, t],
  );

  const columns = useMemo(
    () =>
      getWarehouseTableColumns(t, {
        onView: openViewDrawer,
        onEdit: openEditDrawer,
        onDelete: requestDeleteWarehouse,
      }),
    [t, openViewDrawer, openEditDrawer, requestDeleteWarehouse],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="warehouses"
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
            "id",
            "name",
            "shortcut_name",
            "is_active_label",
            "is_default_label",
          ],
          showAdd: true,
          onAdd: openCreateDrawer,
          showRefresh: true,
          onRefresh: () => refetch(),
        }}
        rowSelection={rowSelection}
        showSelectionBar
        stickyHeader
        scrollX={1160}
        enableColumnDrag
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50],
        }}
      />
      <WarehouseDrawer
        open={drawerOpen}
        mode={drawerMode}
        warehouseId={drawerWarehouseId}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleWarehouseCreated}
      />
    </div>
  );
}

export default function WarehousesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <WarehousesTable />
    </div>
  );
}
