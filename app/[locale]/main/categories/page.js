"use client";

import tenantApiService from "@/API/TenantApiService";
import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { useResourceAccess } from "@/lib/permissions";
import { parseNumericEntityId } from "@/lib/entityId";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { deleteCategory, fetchCategories } from "@/services/categoriesApi";
import CategoryDrawer from "./drawer/CategoryDrawer";
import {
  getCategoryStatusLabel,
  getCategoryTableColumns,
} from "./getCategoryTableColumns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";

function CategoriesTable() {
  const t = useTranslations("Categories");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("categories");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    rows,
    isPending,
    isFetching,
    refetch,
    pagination,
    onSearchChange,
  } = useTenantPaginatedTable({
    queryKey: ["tenant", "categories"],
    queryFn: fetchCategories,
    tableId: "categories",
    t,
    tApiErrors,
    notification,
  });

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        description: typeof row?.description === "string" ? row.description.trim() : null,
        is_active_label: getCategoryStatusLabel(row?.is_active, t),
      })),
    [rows, t],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  /** `tableSeed` is a snapshot row for edit/view from the table (or create response); avoids refetch when it matches `drawerCategoryId`. */
  const {
    open: drawerOpen,
    mode: drawerMode,
    recordId: drawerCategoryId,
    tableSeed: drawerEditSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated: handleCategoryCreated,
    sessionRef: drawerSessionRef,
  } = useResourceDrawerUrl({ parseId: parseNumericEntityId });

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteCategory(id),
    onError: (err) => {
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "categories", deletedId] });
      const { open, recordId } = drawerSessionRef.current;
      if (open && recordId != null && Number(recordId) === Number(deletedId)) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "categories"] });
    },
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ["tenant", "categories"],
    deleteOne: deleteCategory,
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

  const requestDeleteCategory = useCallback(
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
        // Return the promise so Ant Design keeps the OK button in a loading state until the mutation finishes.
        onOk: async () => {
          try {
            await deleteMutation.mutateAsync(Number(id));
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
      getCategoryTableColumns(t, {
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onView: access.canView ? openViewDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteCategory : undefined,
      }),
    [t, access.canEdit, access.canView, access.canDelete, openEditDrawer, openViewDrawer, requestDeleteCategory],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
    <AppDataTable
      tableId="categories"
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
      scrollX={1420}
      enableColumnDrag
      pagination={pagination}
    />
    <CategoryDrawer
      open={drawerOpen}
      mode={drawerMode}
      categoryId={drawerCategoryId == null ? null : Number(drawerCategoryId)}
      editSeedRecord={drawerEditSeed}
      onClose={closeDrawer}
      onCreated={handleCategoryCreated}
    />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <CategoriesTable />
      </Suspense>
    </div>
  );
}
