"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { deleteBrand, fetchBrands } from "@/services/brandsApi";
import BrandDrawer from "./drawer/BrandDrawer";
import { getBrandStatusLabel, getBrandTableColumns } from "./getBrandTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function BrandsTable() {
  const t = useTranslations("Brands");
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
    queryKey: ["tenant", "brands"],
    queryFn: fetchBrands,
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
        is_active_label: getBrandStatusLabel(row?.is_active, t),
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
  const [drawerBrandId, setDrawerBrandId] = useState(/** @type {number | null} */ (null));
  const [drawerEditSeed, setDrawerEditSeed] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const drawerSessionRef = useRef({ open: false, brandId: /** @type {number | null} */ (null) });
  useEffect(() => {
    drawerSessionRef.current = { open: drawerOpen, brandId: drawerBrandId };
  }, [drawerOpen, drawerBrandId]);

  const openCreateDrawer = useCallback(() => {
    setDrawerEditSeed(null);
    setDrawerMode("create");
    setDrawerBrandId(null);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerEditSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerBrandId(Number(id));
    setDrawerOpen(true);
  }, []);

  const openViewDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerEditSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("view");
    setDrawerBrandId(Number(id));
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerBrandId(null);
    setDrawerEditSeed(null);
  }, []);

  const handleBrandCreated = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerEditSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerBrandId(Number(id));
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteBrand(id),
    onMutate: async (id) => {
      const listKey = ["tenant", "brands"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old) =>
        Array.isArray(old) ? old.filter((row) => row.id !== id) : old,
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "brands"], context.previous);
      }
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "brands", deletedId] });
      const { open, brandId } = drawerSessionRef.current;
      if (open && brandId === deletedId) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "brands"] });
    },
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ["tenant", "brands"],
    deleteOne: deleteBrand,
    message,
    notification,
    modal,
    tDataTable,
    tEntity: t,
    tApiErrors,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenRecordId: () => drawerSessionRef.current.brandId,
    closeDrawer,
  });

  const requestDeleteBrand = useCallback(
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
      getBrandTableColumns(t, {
        onEdit: openEditDrawer,
        onView: openViewDrawer,
        onDelete: requestDeleteBrand,
      }),
    [t, openEditDrawer, openViewDrawer, requestDeleteBrand],
  );

  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      const freshData = await fetchBrands({ refresh: true });
      queryClient.setQueryData(["tenant", "brands"], freshData);
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
        tableId="brands"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching || manualRefreshing}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          searchKeys: ["code", "name", "id", "is_active_label"],
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
        scrollX={1200}
        enableColumnDrag
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50],
        }}
      />
      <BrandDrawer
        open={drawerOpen}
        mode={drawerMode}
        brandId={drawerBrandId}
        editSeedRecord={drawerEditSeed}
        onClose={closeDrawer}
        onCreated={handleBrandCreated}
      />
    </div>
  );
}

export default function BrandsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <BrandsTable />
    </div>
  );
}
