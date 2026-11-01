"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { useDeliveryNotesDelete } from "../queries/useDeliveryNotesDelete";
import { useDeliveryNotesTableQuery } from "../queries/useDeliveryNotesTableQuery";
import { getDeliveryNoteTableColumns } from "../components/DeliveryNoteTable/getDeliveryNoteTableColumns";
import { App, Spin } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { createInvoiceFromDeliveryNote, deliveryNotePdfUrl, postDeliveryNote, reverseDeliveryNote } from "../api/deliveryNotes.api";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { printPdf } from "@/shared/api/downloadPdf";
import { FileDoneOutlined, PrinterOutlined } from "@ant-design/icons";
import { DELIVERY_NOTES_LIST_QUERY_KEY } from "../queries/deliveryNotesQueryKeys";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";

function DeliveryNotesTable() {
  const t = useTranslations("DeliveryNotes");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const access = useResourceAccess("delivery_notes");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useDeliveryNotesTableQuery({
    t,
    tApiErrors,
    notification,
  });

  const { openCreateDrawer, openEditDrawer, openViewDrawer, closeDrawer, getOpenRecordId } = usePageDrawer("deliveryNotes");

  const { requestDeleteDeliveryNote, openBulkDeleteConfirm, bulkDeletePending } = useDeliveryNotesDelete({
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

  const queryClient = useQueryClient();
  const { openDrawer } = useGlobalDrawer();
  const invoiceAccess = useResourceAccess("sales_invoices");
  const invoiceMutation = useMutation({
    mutationFn: (id) => createInvoiceFromDeliveryNote(id),
    onSuccess: (invoice) => {
      invalidateTenantListQueries(queryClient, DELIVERY_NOTES_LIST_QUERY_KEY);
      if (invoice?.id != null)
        openDrawer({
          featureId: "salesInvoices",
          id: String(invoice.id),
          mode: "edit",
        });
    },
    onError: (err) => {
      notification.error({
        title: t("actionError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });
  const actionMutation = useMutation({
    mutationFn: ({ id, action }) => (action === "post" ? postDeliveryNote(id) : reverseDeliveryNote(id)),
    onSuccess: (_data, { action }) => {
      message.success(action === "post" ? t("postSuccess") : t("reverseSuccess"));
      invalidateTenantListQueries(queryClient, DELIVERY_NOTES_LIST_QUERY_KEY);
      queryClient.invalidateQueries({
        queryKey: ["tenant", "cash-bank-accounts"],
      });
    },
    onError: (err) => {
      notification.error({
        title: t("actionError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });
  const confirmAction = (record, action) =>
    modal.confirm({
      title: action === "post" ? t("postConfirmTitle") : t("reverseConfirmTitle"),
      content: action === "post" ? t("postConfirmContent") : t("reverseConfirmContent"),
      okText: action === "post" ? t("actionPost") : t("actionReverse"),
      okButtonProps: action === "reverse" ? { danger: true } : undefined,
      cancelText: t("drawerCancel"),
      onOk: () => actionMutation.mutateAsync({ id: String(record.id), action }),
    });

  const columns = useMemo(
    () =>
      getDeliveryNoteTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteDeliveryNote : undefined,
        onPost: access.canEdit ? (record) => confirmAction(record, "post") : undefined,
        onReverse: access.canReverse ? (record) => confirmAction(record, "reverse") : undefined,
        extra: (record) => [
          {
            key: "invoice",
            label: t("actionCreateInvoice"),
            icon: <FileDoneOutlined />,
            disabled: !invoiceAccess.canAdd || record?.status !== "posted" || record?.invoicing_status === "invoiced",
            onClick: () => invoiceMutation.mutate(String(record.id)),
          },
          {
            key: "print",
            label: t("actionPrint"),
            icon: <PrinterOutlined />,
            disabled: !access.canPrint || record?.status === "draft",
            onClick: () =>
              printPdf(deliveryNotePdfUrl(String(record.id))).catch((err) =>
                notification.error({
                  title: t("actionError"),
                  description: getLocalizedApiErrorMessage(tApiErrors, err),
                }),
              ),
          },
        ],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      t,
      access.canView,
      access.canEdit,
      access.canDelete,
      access.canReverse,
      access.canPrint,
      invoiceAccess.canAdd,
      openViewDrawer,
      openEditDrawer,
      requestDeleteDeliveryNote,
    ],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="delivery-notes"
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
        scrollX={1080}
        enableColumnDrag
        pagination={pagination}
      />
    </div>
  );
}

export default function DeliveryNotesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <DeliveryNotesTable />
      </Suspense>
    </div>
  );
}
