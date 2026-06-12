"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
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
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const { tableData, isPending, refetch, handleRefresh, refreshFetching } = useItemsTableQuery({
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
        onEdit: drawer.openEditDrawer,
        onView: drawer.openViewDrawer,
        onDelete: requestDeleteItem,
      }),
    [t, drawer.openEditDrawer, drawer.openViewDrawer, requestDeleteItem],
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
          searchKeys: ["sku", "item_code", "name", "item_type_label", "category.name", "brand.name", "is_active_label"],
          showAdd: true,
          onAdd: drawer.openCreateDrawer,
          showRefresh: true,
          onRefresh: handleRefresh,
        }}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys, columnWidth: 48 }}
        showSelectionBar
        onBulkDelete={openBulkDeleteConfirm}
        bulkDeleteLoading={bulkDeletePending}
        stickyHeader
        scrollX={1000}
        enableColumnDrag
        pagination={{ mode: "client", pageSize: 20, pageSizeOptions: [10, 20, 50] }}
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
      <ItemsTable />
    </div>
  );
}
