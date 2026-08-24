"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { useResourceAccess } from "@/lib/permissions";
import { parseNumericEntityId } from "@/lib/entityId";
import { useCategoriesDelete } from "../queries/useCategoriesDelete";
import { useCategoriesTableQuery } from "../queries/useCategoriesTableQuery";
import CategoryDrawer from "../components/CategoryDrawer/CategoryDrawer";
import { getCategoryTableColumns } from "../components/CategoryTable/getCategoryTableColumns";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";

function CategoriesTable() {
  const t = useTranslations("Categories");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const access = useResourceAccess("categories");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useCategoriesTableQuery({
    t,
    tApiErrors,
    notification,
  });

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

  const { requestDeleteCategory, openBulkDeleteConfirm, bulkDeletePending } = useCategoriesDelete({
    t,
    tApiErrors,
    tDataTable,
    notification,
    message,
    modal,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenDrawerRecordId: () => drawerSessionRef.current.recordId,
    closeDrawer,
  });

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
