"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { useResourceAccess } from "@/lib/permissions";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import SupplierDrawer from "../components/SupplierDrawer/SupplierDrawer";
import { getSupplierTableColumns } from "../components/SupplierTable/getSupplierTableColumns";
import { useSuppliersDelete } from "../queries/useSuppliersDelete";
import { useSuppliersTableQuery } from "../queries/useSuppliersTableQuery";

function SuppliersTable() {
  const t = useTranslations("Suppliers");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { message, notification, modal } = App.useApp();
  const access = useResourceAccess("suppliers");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useSuppliersTableQuery({
    t,
    tApiErrors,
    notification,
  });

  const {
    open: drawerOpen,
    mode: drawerMode,
    recordId: drawerSupplierId,
    tableSeed: drawerTableSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated: handleSupplierCreated,
    sessionRef: drawerSessionRef,
  } = useResourceDrawerUrl();

  const { requestDeleteSupplier, openBulkDeleteConfirm, bulkDeletePending } = useSuppliersDelete({
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
      getSupplierTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteSupplier : undefined,
      }),
    [t, access.canView, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer, requestDeleteSupplier],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="suppliers"
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
        scrollX={1560}
        enableColumnDrag
        pagination={pagination}
      />
      <SupplierDrawer
        open={drawerOpen}
        mode={drawerMode}
        supplierId={drawerSupplierId == null ? null : String(drawerSupplierId)}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleSupplierCreated}
      />
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <SuppliersTable />
      </Suspense>
    </div>
  );
}
