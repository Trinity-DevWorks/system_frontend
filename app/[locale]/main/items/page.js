"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { useResourceAccess } from "@/lib/permissions";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import ItemDrawer from "./drawer/ItemDrawer";
import { getItemTableColumns } from "./getItemTableColumns";
import { useItemsDelete } from "./useItemsDelete";
import { useItemsPageDrawerState } from "./useItemsPageDrawerState";
import { useItemsTableQuery } from "./useItemsTableQuery";

function ItemsTable() {
  const t = useTranslations("Items");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const access = useResourceAccess("items");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const { tableData, isPending, refetch, handleRefresh, refreshFetching, pagination, onSearchChange } = useItemsTableQuery({
    t,
    tApiErrors,
    notification,
  });

  const drawer = useItemsPageDrawerState();

  const { requestDeleteItem, openBulkDeleteConfirm, bulkDeletePending } = useItemsDelete({
    t,
    tApiErrors,
    tDataTable,
    notification,
    message,
    modal,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenDrawerItemId: drawer.getOpenDrawerItemId,
    isDrawerViewingItem: drawer.isDrawerViewingItem,
    closeDrawer: drawer.closeDrawer,
  });

  const columns = useMemo(
    () =>
      getItemTableColumns(t, {
        onEdit: access.canEdit ? drawer.openEditDrawer : undefined,
        onView: access.canView ? drawer.openViewDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteItem : undefined,
      }),
    [t, access.canEdit, access.canView, access.canDelete, drawer.openEditDrawer, drawer.openViewDrawer, requestDeleteItem],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="items"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={refreshFetching}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange,
          showAdd: access.canAdd,
          onAdd: drawer.openCreateDrawer,
          showRefresh: true,
          onRefresh: handleRefresh,
        }}
        rowSelection={
          access.canDelete
            ? { selectedRowKeys, onChange: setSelectedRowKeys, columnWidth: 48 }
            : false
        }
        showSelectionBar={access.canDelete}
        onBulkDelete={access.canDelete ? openBulkDeleteConfirm : undefined}
        bulkDeleteLoading={bulkDeletePending}
        stickyHeader
        scrollX={1000}
        enableColumnDrag
        pagination={pagination}
      />
      <ItemDrawer
        open={drawer.drawerOpen}
        mode={drawer.drawerMode}
        itemId={drawer.drawerItemId}
        editSeedRecord={drawer.drawerEditSeed}
        onClose={drawer.closeDrawer}
        onCreated={drawer.handleItemCreated}
        onSaveAndNew={drawer.openCreateDrawer}
      />
    </div>
  );
}

export default function ItemsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <ItemsTable />
      </Suspense>
    </div>
  );
}
