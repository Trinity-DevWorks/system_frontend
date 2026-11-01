"use client";

import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { getItemAttributeTableColumns } from "../components/ItemAttributeTable/getItemAttributeTableColumns";
import { useItemAttributesDelete } from "../queries/useItemAttributesDelete";
import { useItemAttributesTableQuery } from "../queries/useItemAttributesTableQuery";

function ItemAttributesTable() {
  const t = useTranslations("ItemAttributes");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const access = useResourceAccess("item_attributes");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useItemAttributesTableQuery({
    t,
    tApiErrors,
    notification,
  });

  const { openCreateDrawer, openEditDrawer, openViewDrawer, closeDrawer, getOpenRecordId } = usePageDrawer("itemAttributes");

  const { requestDeleteItemAttribute, openBulkDeleteConfirm, bulkDeletePending } = useItemAttributesDelete({
    t,
    tApiErrors,
    tDataTable,
    notification,
    message,
    modal,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenDrawerRecordId: getOpenRecordId,
    closeDrawer,
  });

  const columns = useMemo(
    () =>
      getItemAttributeTableColumns(t, {
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onView: access.canView ? openViewDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteItemAttribute : undefined,
      }),
    [t, access.canEdit, access.canView, access.canDelete, openEditDrawer, openViewDrawer, requestDeleteItemAttribute],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="itemAttributes"
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
        rowSelection={access.canDelete ? { selectedRowKeys, onChange: setSelectedRowKeys, columnWidth: 48 } : false}
        showSelectionBar={access.canDelete}
        onBulkDelete={access.canDelete ? openBulkDeleteConfirm : undefined}
        bulkDeleteLoading={bulkDeletePending}
        stickyHeader
        scrollX={1200}
        enableColumnDrag
        pagination={pagination}
      />
    </div>
  );
}

/** Master data: attributes (Size, Color...) and their values, used by the item variant generator. */
export default function ItemAttributesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <ItemAttributesTable />
      </Suspense>
    </div>
  );
}
