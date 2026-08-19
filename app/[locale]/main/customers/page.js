"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { useResourceAccess } from "@/lib/permissions";
import { normalizeEntityId } from "@/lib/entityId";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { deleteCustomer, fetchCustomers } from "@/services/customersApi";
import CustomerDrawer from "./drawer/CustomerDrawer";
import { getCustomerStatusLabel, getCustomerTableColumns } from "./getCustomerTableColumns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";

function CustomersTable() {
  const t = useTranslations("Customers");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { message, notification, modal } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("customers");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    rows,
    isPending,
    isFetching,
    refetch,
    pagination,
    onSearchChange,
  } = useTenantPaginatedTable({
    queryKey: ["tenant", "customers"],
    queryFn: fetchCustomers,
    tableId: "customers",
    t,
    tApiErrors,
    notification,
  });

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        status_label: getCustomerStatusLabel(row?.status, t),
      })),
    [rows, t],
  );

  const {
    open: drawerOpen,
    mode: drawerMode,
    recordId: drawerCustomerId,
    tableSeed: drawerTableSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated: handleCustomerCreated,
    sessionRef: drawerSessionRef,
  } = useResourceDrawerUrl();

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deleteCustomer(id),
    onError: (err) => {
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "customers", deletedId] });
      const { open, recordId } = drawerSessionRef.current;
      if (open && recordId != null && String(recordId) === String(deletedId)) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "customers"] });
    },
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ["tenant", "customers"],
    deleteOne: deleteCustomer,
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

  const requestDeleteCustomer = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      const name = typeof record?.name === "string" ? record.name : id;
      modal.confirm({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent", { name }),
        okText: t("deleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("deleteConfirmCancel"),
        onOk: async () => {
          try {
            await deleteMutation.mutateAsync(id);
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
      getCustomerTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteCustomer : undefined,
      }),
    [t, access.canView, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer, requestDeleteCustomer],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="customers"
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
        scrollX={1280}
        enableColumnDrag
        pagination={pagination}
      />
      <CustomerDrawer
        open={drawerOpen}
        mode={drawerMode}
        customerId={drawerCustomerId == null ? null : String(drawerCustomerId)}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleCustomerCreated}
      />
    </div>
  );
}

export default function CustomersPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <CustomersTable />
      </Suspense>
    </div>
  );
}
