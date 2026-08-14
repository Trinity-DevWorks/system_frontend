"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { useResourceAccess } from "@/lib/permissions";
import { parseNumericEntityId } from "@/lib/entityId";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { deletePaymentMethod, fetchPaymentMethods } from "@/services/paymentMethodsApi";
import PaymentMethodDrawer from "./drawer/PaymentMethodDrawer";
import {
  getPaymentMethodDefaultLabel,
  getPaymentMethodStatusLabel,
  getPaymentMethodTableColumns,
  getPaymentMethodTypeLabel,
} from "./getPaymentMethodTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function PaymentMethodsTable() {
  const t = useTranslations("PaymentMethods");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("payment_methods");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    data = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant", "payment-methods"],
    queryFn: fetchPaymentMethods,
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
        is_active_label: getPaymentMethodStatusLabel(row?.is_active, t),
        is_default_label: getPaymentMethodDefaultLabel(row?.is_default, t),
        type_label: getPaymentMethodTypeLabel(row?.type, t),
      })),
    [data, t],
  );

  const {
    open: drawerOpen,
    mode: drawerMode,
    recordId: drawerPaymentMethodId,
    tableSeed: drawerTableSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated: handlePaymentMethodCreated,
    sessionRef: drawerSessionRef,
  } = useResourceDrawerUrl({ parseId: parseNumericEntityId });

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deletePaymentMethod(id),
    onMutate: async (id) => {
      const listKey = ["tenant", "payment-methods"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old) => (Array.isArray(old) ? old.filter((row) => row.id !== id) : old));
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "payment-methods"], context.previous);
      }
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "payment-methods", deletedId] });
      const { open, recordId } = drawerSessionRef.current;
      if (open && recordId != null && Number(recordId) === Number(deletedId)) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "payment-methods"] });
    },
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ["tenant", "payment-methods"],
    deleteOne: deletePaymentMethod,
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

  const requestDeletePaymentMethod = useCallback(
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
            /* mutation onError */
          }
        },
      });
    },
    [deleteMutation, modal, t],
  );

  const columns = useMemo(
    () =>
      getPaymentMethodTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? requestDeletePaymentMethod : undefined,
      }),
    [t, access.canView, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer, requestDeletePaymentMethod],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="payment-methods"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          searchKeys: [
            "id",
            "code",
            "name",
            "type",
            "type_label",
            "currency_code",
            "is_active_label",
            "is_default_label",
          ],
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
        scrollX={1400}
        enableColumnDrag
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50],
        }}
      />
      <PaymentMethodDrawer
        open={drawerOpen}
        mode={drawerMode}
        paymentMethodId={drawerPaymentMethodId == null ? null : Number(drawerPaymentMethodId)}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handlePaymentMethodCreated}
      />
    </div>
  );
}

export default function PaymentMethodsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <PaymentMethodsTable />
      </Suspense>
    </div>
  );
}
