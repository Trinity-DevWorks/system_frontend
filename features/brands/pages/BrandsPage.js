"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { useResourceAccess } from "@/lib/permissions";
import { parseNumericEntityId } from "@/lib/entityId";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import BrandDrawer from "../components/BrandDrawer/BrandDrawer";
import { getBrandTableColumns } from "../components/BrandTable/getBrandTableColumns";
import { useBrandsDelete } from "../queries/useBrandsDelete";
import { useBrandsTableQuery } from "../queries/useBrandsTableQuery";

function BrandsTable() {
  const t = useTranslations("Brands");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const access = useResourceAccess("brands");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useBrandsTableQuery({
    t,
    tApiErrors,
    notification,
  });

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  const {
    open: drawerOpen,
    mode: drawerMode,
    recordId: drawerBrandId,
    tableSeed: drawerEditSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated: handleBrandCreated,
    sessionRef: drawerSessionRef,
  } = useResourceDrawerUrl({ parseId: parseNumericEntityId });

  const { requestDeleteBrand, openBulkDeleteConfirm, bulkDeletePending } = useBrandsDelete({
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
      getBrandTableColumns(t, {
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onView: access.canView ? openViewDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteBrand : undefined,
      }),
    [t, access.canEdit, access.canView, access.canDelete, openEditDrawer, openViewDrawer, requestDeleteBrand],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="brands"
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
        scrollX={1200}
        enableColumnDrag
        pagination={pagination}
      />
      <BrandDrawer
        open={drawerOpen}
        mode={drawerMode}
        brandId={drawerBrandId == null ? null : Number(drawerBrandId)}
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
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <BrandsTable />
      </Suspense>
    </div>
  );
}
