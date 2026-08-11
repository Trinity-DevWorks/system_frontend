"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess } from "@/lib/permissions";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { deletePaymentTerm, fetchPaymentTerms } from "@/services/paymentTermsApi";
import PaymentTermDrawer from "./drawer/PaymentTermDrawer";
import {
  getPaymentTermDefaultLabel,
  getPaymentTermStatusLabel,
  getPaymentTermTableColumns,
} from "./getPaymentTermTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function PaymentTermsTable() {
  const t = useTranslations("PaymentTerms");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("payment_terms");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    data = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant", "payment-terms"],
    queryFn: fetchPaymentTerms,
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
        is_active_label: getPaymentTermStatusLabel(row?.is_active, t),
        is_default_label: getPaymentTermDefaultLabel(row?.is_default, t),
      })),
    [data, t],
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(/** @type {"create" | "edit" | "view"} */ ("create"));
  const [drawerPaymentTermId, setDrawerPaymentTermId] = useState(/** @type {number | null} */ (null));
  const [drawerTableSeed, setDrawerTableSeed] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const drawerSessionRef = useRef({ open: false, paymentTermId: /** @type {number | null} */ (null) });
  useEffect(() => {
    drawerSessionRef.current = { open: drawerOpen, paymentTermId: drawerPaymentTermId };
  }, [drawerOpen, drawerPaymentTermId]);

  const openCreateDrawer = useCallback(() => {
    setDrawerTableSeed(null);
    setDrawerMode("create");
    setDrawerPaymentTermId(null);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerPaymentTermId(Number(id));
    setDrawerOpen(true);
  }, []);

  const openViewDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("view");
    setDrawerPaymentTermId(Number(id));
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerPaymentTermId(null);
    setDrawerTableSeed(null);
  }, []);

  const handlePaymentTermCreated = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerPaymentTermId(Number(id));
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deletePaymentTerm(id),
    onMutate: async (id) => {
      const listKey = ["tenant", "payment-terms"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old) => (Array.isArray(old) ? old.filter((row) => row.id !== id) : old));
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "payment-terms"], context.previous);
      }
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "payment-terms", deletedId] });
      const { open, paymentTermId } = drawerSessionRef.current;
      if (open && paymentTermId === deletedId) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "payment-terms"] });
    },
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ["tenant", "payment-terms"],
    deleteOne: deletePaymentTerm,
    message,
    notification,
    modal,
    tDataTable,
    tEntity: t,
    tApiErrors,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenRecordId: () => drawerSessionRef.current.paymentTermId,
    closeDrawer,
  });

  const requestDeletePaymentTerm = useCallback(
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
      getPaymentTermTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? requestDeletePaymentTerm : undefined,
      }),
    [t, access.canView, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer, requestDeletePaymentTerm],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="payment-terms"
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
            "due_days",
            "description",
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
        scrollX={1280}
        enableColumnDrag
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50],
        }}
      />
      <PaymentTermDrawer
        open={drawerOpen}
        mode={drawerMode}
        paymentTermId={drawerPaymentTermId}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handlePaymentTermCreated}
      />
    </div>
  );
}

export default function PaymentTermsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <PaymentTermsTable />
    </div>
  );
}
