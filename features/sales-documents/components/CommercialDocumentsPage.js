"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern, formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { fetchCustomerNames } from "@/features/customers/index";
import { CUSTOMERS_LIST_QUERY_KEY } from "@/features/customers";
import {
  formatStockFilterDateRange,
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "@/features/stock/components/StockTableFilters/StockTableFilters";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import {
  CarOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FilePdfOutlined,
  LockOutlined,
  MoreOutlined,
  PrinterOutlined,
  SendOutlined,
  StopOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, DatePicker, Dropdown, Form, Select, Spin, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";
import { commercialStatusColor } from "../utils/commercialDocumentUtils";
import { useDocumentBranchColumns } from "@/shared/components/document-branch/useDocumentBranchColumns";
import { useDocumentPdfDownload } from "@/shared/hooks/useDocumentPdfDownload";
import { isDocumentPdfPrintable } from "@/shared/utils/documentPdf";

/**
 * @param {{
 *   config: {
 *     kind?: "quotation" | "order";
 *     featureId: string;
 *     tableId: string;
 *     translationNs: string;
 *     permission: string;
 *     listKey: readonly unknown[];
 *     numberField: string;
 *     dateField: string;
 *     extraDateField: string | null;
 *     statuses: string[];
 *     api: { list: Function; downloadPdf: (id: string, documentNumber: string | undefined, options: { locale?: string }) => Promise<void>; remove: (id: string) => Promise<unknown>; action: (id: string, action: string) => Promise<unknown> };
 *   };
 * }} props
 */
function CommercialDocumentsTable({ config }) {
  const t = useTranslations(config.translationNs);
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess(config.permission);
  const invoiceAccess = useResourceAccess("sales_invoices");
  const deliveryAccess = useResourceAccess("delivery_notes");
  const { openDrawer } = useGlobalDrawer();
  const { openCreateDrawer, openEditDrawer, openViewDrawer } = usePageDrawer(config.featureId);
  const [statusFilter, setStatusFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [customerFilter, setCustomerFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs, import("dayjs").Dayjs] | null} */ (null),
  );

  const extraParams = useMemo(
    () => ({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(customerFilter ? { customer_id: customerFilter } : {}),
      ...(dateRange?.[0] ? { from: dateRange[0].format("YYYY-MM-DD") } : {}),
      ...(dateRange?.[1] ? { to: dateRange[1].format("YYYY-MM-DD") } : {}),
    }),
    [customerFilter, dateRange, statusFilter],
  );

  const { rows: rawTableData, isPending, isFetching, refetch, pagination, onSearchChange } = useTenantPaginatedTable({
    queryKey: config.listKey,
    queryFn: (params) => config.api.list(params),
    extraParams,
    tableId: config.tableId,
    staleTime: QUERY_STALE_TIME.default,
    t,
    tApiErrors,
    notification,
    loadErrorKey: "loadError",
  });

  const customersQuery = useQuery({
    queryKey: CUSTOMERS_LIST_QUERY_KEY,
    queryFn: fetchCustomerNames,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => config.api.remove(id),
    onSuccess: () => {
      message.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: config.listKey });
    },
    onError: (err) => {
      notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const actionMutation = useMutation({
    mutationFn: (/** @type {{ id: string; action: string }} */ payload) => config.api.action(payload.id, payload.action),
    onSuccess: () => {
      message.success(t("actionSuccess"));
      queryClient.invalidateQueries({ queryKey: config.listKey });
    },
    onError: (err) => {
      notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const { downloadPdf, printPdf } = useDocumentPdfDownload({
    download: config.api.downloadPdf,
    errorTitle: t("pdfError"),
  });

  const runAction = useCallback(
    (record, /** @type {string} */ action) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      actionMutation.mutate({ id, action });
    },
    [actionMutation],
  );

  // Same flow as the drawer: create the invoice from the order, then open it.
  const invoiceMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => config.api.action(id, "invoice"),
    onSuccess: (invoice) => {
      message.success(t("invoiceSuccess"));
      queryClient.invalidateQueries({ queryKey: config.listKey });
      const id = invoice && typeof invoice === "object" && "id" in invoice ? invoice.id : null;
      if (id != null) openDrawer({ featureId: "salesInvoices", id: String(id), mode: "edit" });
    },
    onError: (err) => {
      notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const handleCreateInvoice = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id != null) invoiceMutation.mutate(id);
    },
    [invoiceMutation],
  );

  const handleCreateDeliveryNote = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      openDrawer({ featureId: "deliveryNotes", mode: "create", extras: { fromSalesOrderId: String(id) } });
    },
    [openDrawer],
  );

  const handleCancelOrder = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      modal.confirm({
        title: t("cancelConfirmTitle"),
        content: t("cancelConfirmContent"),
        okText: t("actionCancelOrder"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(actionMutation.mutateAsync({ id, action: "cancel" })),
      });
    },
    [actionMutation, modal, t],
  );

  const handleCloseOrder = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      modal.confirm({
        title: t("closeConfirmTitle"),
        content: t("closeConfirmContent"),
        okText: t("actionCloseOrder"),
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(actionMutation.mutateAsync({ id, action: "close" })),
      });
    },
    [actionMutation, modal, t],
  );

  const handleDelete = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null || record?.status !== "draft") return;
      modal.confirm({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent"),
        okText: t("actionDelete"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(deleteMutation.mutateAsync(id)),
      });
    },
    [deleteMutation, modal, t],
  );

  const tableData = useMemo(
    () =>
      rawTableData.map((row) => ({
        ...row,
        customer_name: row?.customer?.name ?? "",
      })),
    [rawTableData],
  );

  const baseColumns = useMemo(
    () => [
      {
        title: t("colNumber"),
        dataIndex: config.numberField,
        key: "number",
        width: 140,
        render: (value) => (value ? <Typography.Text code>{value}</Typography.Text> : "\u2014"),
      },
      {
        title: t("colDate"),
        dataIndex: config.dateField,
        key: "date",
        width: 130,
        render: (value) => formatTenantDate(value) || "\u2014",
      },
      ...(config.extraDateField
        ? [
            {
              title: t("colValidUntil"),
              dataIndex: config.extraDateField,
              key: "extra",
              width: 130,
              render: (value) => formatTenantDate(value) || "\u2014",
            },
          ]
        : []),
      { title: t("colCustomer"), dataIndex: "customer_name", key: "customer", ellipsis: true },
      {
        title: t("colStatus"),
        dataIndex: "status",
        key: "status",
        width: 160,
        render: (value) => <Tag color={commercialStatusColor(String(value ?? ""))}>{t(`status_${value}`)}</Tag>,
      },
      {
        title: t("colGrandTotal"),
        dataIndex: "grand_total",
        key: "total",
        width: 150,
        align: "right",
        render: (value, record) => formatTenantMoneyWithSymbol(value, record?.currency?.symbol) || "\u2014",
      },
      {
        title: "",
        key: "actions",
        width: 64,
        render: (_, record) => {
          const status = String(record.status ?? "");
          const quotationActions = config.kind === "quotation" && access.canEdit;
          const isOrder = config.kind === "order";
          const orderOpen = isOrder && (status === "confirmed" || status === "partially_invoiced");
          const items = [
            access.canView ? { key: "view", icon: <EyeOutlined />, label: t("actionView"), onClick: () => openViewDrawer(record) } : null,
            access.canEdit && status === "draft"
              ? { key: "edit", icon: <EditOutlined />, label: t("actionEdit"), onClick: () => openEditDrawer(record) }
              : null,
            quotationActions && status === "draft"
              ? { key: "send", icon: <SendOutlined />, label: t("actionSend"), onClick: () => runAction(record, "send") }
              : null,
            quotationActions && status === "sent"
              ? { key: "accept", icon: <CheckOutlined />, label: t("actionAccept"), onClick: () => runAction(record, "accept") }
              : null,
            quotationActions && status === "sent"
              ? { key: "reject", icon: <CloseOutlined />, danger: true, label: t("actionReject"), onClick: () => runAction(record, "reject") }
              : null,
            quotationActions && status === "accepted"
              ? { key: "convert", icon: <SwapOutlined />, label: t("actionConvert"), onClick: () => runAction(record, "convert") }
              : null,
            orderOpen && invoiceAccess.canAdd
              ? { key: "invoice", icon: <FileDoneOutlined />, label: t("actionCreateInvoice"), onClick: () => handleCreateInvoice(record) }
              : null,
            orderOpen && deliveryAccess.canAdd
              ? { key: "delivery", icon: <CarOutlined />, label: t("actionCreateDeliveryNote"), onClick: () => handleCreateDeliveryNote(record) }
              : null,
            orderOpen && access.canEdit
              ? { key: "close", icon: <LockOutlined />, label: t("actionCloseOrder"), onClick: () => handleCloseOrder(record) }
              : null,
            isOrder && (status === "draft" || status === "confirmed") && access.canEdit
              ? { key: "cancel", icon: <StopOutlined />, danger: true, label: t("actionCancelOrder"), onClick: () => handleCancelOrder(record) }
              : null,
            access.canPrint && isDocumentPdfPrintable(config.kind === "quotation" ? "sales_quotation" : "sales_order", status)
              ? {
                  key: "print",
                  icon: <PrinterOutlined />,
                  label: t("actionPrint"),
                  onClick: () => printPdf(normalizeEntityId(record?.id), record?.[config.numberField]),
                }
              : null,
            access.canPrint && isDocumentPdfPrintable(config.kind === "quotation" ? "sales_quotation" : "sales_order", status)
              ? {
                  key: "pdf",
                  icon: <FilePdfOutlined />,
                  label: t("actionDownloadPdf"),
                  onClick: () => downloadPdf(normalizeEntityId(record?.id), record?.[config.numberField]),
                }
              : null,
            access.canDelete && status === "draft"
              ? { key: "delete", icon: <DeleteOutlined />, danger: true, label: t("actionDelete"), onClick: () => handleDelete(record) }
              : null,
          ].filter(Boolean);
          return (
            <Dropdown menu={{ items }} trigger={["click"]}>
              <Button type="text" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
            </Dropdown>
          );
        },
      },
    ],
    [
      access.canDelete,
      access.canEdit,
      access.canPrint,
      access.canView,
      config.dateField,
      config.extraDateField,
      config.kind,
      config.numberField,
      deliveryAccess.canAdd,
      downloadPdf,
      handleCancelOrder,
      handleCloseOrder,
      handleCreateDeliveryNote,
      handleCreateInvoice,
      handleDelete,
      invoiceAccess.canAdd,
      openEditDrawer,
      openViewDrawer,
      printPdf,
      runAction,
      t,
    ],
  );
  const columns = useDocumentBranchColumns(baseColumns);

  const statusOptions = [
    { value: "", label: t("filterAllStatuses") },
    ...config.statuses.map((value) => ({ value, label: t(`status_${value}`) })),
  ];
  const customerOptions = [
    { value: "", label: t("filterAllCustomers") },
    ...(customersQuery.data ?? []).map((row) => ({ value: row.id, label: String(row.name ?? row.id) })),
  ];
  const dateLabel = formatStockFilterDateRange(dateRange?.[0], dateRange?.[1]);
  const summary = [
    ...(customerFilter ? [{ label: t("filterCustomer"), value: customerOptions.find((row) => row.value === customerFilter)?.label ?? customerFilter }] : []),
    ...(statusFilter ? [{ label: t("filterStatus"), value: t(`status_${statusFilter}`) }] : []),
    ...(dateLabel ? [{ label: t("filterDateRange"), value: dateLabel }] : []),
  ];
  const { toggle, filterBar } = useStockTableFilters({
    activeCount: summary.length,
    summary,
    onClearAll: () => {
      setStatusFilter(undefined);
      setCustomerFilter(undefined);
      setDateRange(null);
    },
    children: (
      <div className={stockFilterFieldRowClassName}>
        <Form.Item label={t("filterCustomer")}>
          <Select
            className="w-full"
            showSearch
            optionFilterProp="label"
            value={customerFilter ?? ""}
            options={customerOptions}
            onChange={(value) => setCustomerFilter(value === "" ? undefined : String(value))}
          />
        </Form.Item>
        <Form.Item label={t("filterStatus")}>
          <Select
            className="w-full"
            value={statusFilter ?? ""}
            options={statusOptions}
            onChange={(value) => setStatusFilter(value === "" ? undefined : String(value))}
          />
        </Form.Item>
        <Form.Item label={t("filterDateRange")}>
          <DatePicker.RangePicker
            className="w-full"
            value={dateRange}
            format={dayjsDatePattern()}
            onChange={(range) => setDateRange(range ?? null)}
          />
        </Form.Item>
      </div>
    ),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId={config.tableId}
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
          showRefresh: true,
          onRefresh: () => refetch(),
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          addLabel: t("toolbarNew"),
          extra: toggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1100}
        pagination={pagination}
      />
    </div>
  );
}

/**
 * @param {{ config: import("react").ComponentProps<typeof CommercialDocumentsTable>["config"] }} props
 */
export default function CommercialDocumentsPage({ config }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Spin /></div>}>
        <CommercialDocumentsTable config={config} />
      </Suspense>
    </div>
  );
}
