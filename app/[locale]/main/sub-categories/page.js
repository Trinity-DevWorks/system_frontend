"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { deleteSubCategory, fetchSubCategories } from "@/services/subCategoriesApi";
import SubCategoryDrawer from "./drawer/SubCategoryDrawer";
import { getSubCategoryTableColumns } from "./getSubCategoryTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function getCategoryName(row) {
  const name = row?.category?.name;
  return typeof name === "string" ? name.trim() : "";
}

function SubCategoriesTable() {
  const t = useTranslations("SubCategories");
  const tApiErrors = useTranslations("ApiErrors");
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
    queryKey: ["tenant", "sub-categories"],
    queryFn: fetchSubCategories,
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
        category_name: getCategoryName(row),
      })),
    [data],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(/** @type {"create" | "edit" | "view"} */ ("create"));
  const [drawerSubCategoryId, setDrawerSubCategoryId] = useState(/** @type {number | null} */ (null));
  const [drawerTableSeed, setDrawerTableSeed] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const drawerSessionRef = useRef({ open: false, subCategoryId: /** @type {number | null} */ (null) });
  useEffect(() => {
    drawerSessionRef.current = { open: drawerOpen, subCategoryId: drawerSubCategoryId };
  }, [drawerOpen, drawerSubCategoryId]);

  const openCreateDrawer = useCallback(() => {
    setDrawerTableSeed(null);
    setDrawerMode("create");
    setDrawerSubCategoryId(null);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerSubCategoryId(Number(id));
    setDrawerOpen(true);
  }, []);

  const openViewDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("view");
    setDrawerSubCategoryId(Number(id));
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerSubCategoryId(null);
    setDrawerTableSeed(null);
  }, []);

  const handleSubCategoryCreated = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerSubCategoryId(Number(id));
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteSubCategory(id),
    onMutate: async (id) => {
      const listKey = ["tenant", "sub-categories"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old) =>
        Array.isArray(old) ? old.filter((row) => row.id !== id) : old,
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "sub-categories"], context.previous);
      }
      notification.error({
        message: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "sub-categories", deletedId] });
      const { open, subCategoryId } = drawerSessionRef.current;
      if (open && subCategoryId === deletedId) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "sub-categories"] });
    },
  });

  const requestDeleteSubCategory = useCallback(
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
      getSubCategoryTableColumns(t, {
        onView: openViewDrawer,
        onEdit: openEditDrawer,
        onDelete: requestDeleteSubCategory,
      }),
    [t, openViewDrawer, openEditDrawer, requestDeleteSubCategory],
  );

  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      const freshData = await fetchSubCategories();
      queryClient.setQueryData(["tenant", "sub-categories"], freshData);
    } catch (err) {
      notification.error({
        message: t("loadError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    } finally {
      setManualRefreshing(false);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="sub-categories"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching || manualRefreshing}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          searchKeys: ["name", "id", "category_id", "category_name"],
          showAdd: true,
          onAdd: openCreateDrawer,
          showRefresh: true,
          onRefresh: handleRefresh,
        }}
        rowSelection={rowSelection}
        showSelectionBar
        stickyHeader
        scrollX={1180}
        enableColumnDrag
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50],
        }}
      />
      <SubCategoryDrawer
        open={drawerOpen}
        mode={drawerMode}
        subCategoryId={drawerSubCategoryId}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleSubCategoryCreated}
      />
    </div>
  );
}

export default function SubCategoriesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <SubCategoriesTable />
    </div>
  );
}
