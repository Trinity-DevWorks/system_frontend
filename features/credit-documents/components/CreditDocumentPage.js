"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern, formatTenantDate, formatTenantDateTime, formatTenantMoney } from "@/lib/tenant-format";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import {
  formatStockFilterDateRange,
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "@/features/stock/components/StockTableFilters/StockTableFilters";
import { DeleteOutlined, EditOutlined, EyeOutlined, FilePdfOutlined, MoreOutlined, PrinterOutlined, RollbackOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, DatePicker, Dropdown, Form, Select, Spin, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";
import {
  CREDIT_DOCUMENT_STATUS_VALUES,
  CREDIT_DOCUMENT_TYPE_VALUES,
  creditDocumentStatusTagColor,
  getCreditDocumentStatusLabel,
  getCreditDocumentTypeLabel,
  isCreditDocumentDraft,
} from "../creditDocumentUtils";
import { useDocumentBranchColumns } from "@/shared/components/document-branch/useDocumentBranchColumns";
import { useDocumentPdfDownload } from "@/shared/hooks/useDocumentPdfDownload";
import { isDocumentPdfPrintable } from "@/shared/utils/documentPdf";

/**
 * @param {{ config: Record<string, any> }} props
 */
export default function CreditDocumentPage({ config }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Spin /></div>}>
        <CreditDocumentTable config={config} />
      </Suspense>
    </div>
  );
}

/**
 * @param {{ config: Record<string, any> }} props
 */
function CreditDocumentTable({ config }) {
  const t = useTranslations(config.i18n);
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess(config.resource);
  const [statusFilter, setStatusFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [typeFilter, setTypeFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [partyFilter, setPartyFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [dateRange, setDateRange] = useState(/** @type {[import("dayjs").Dayjs, import("dayjs").Dayjs] | null} */ (null));

  const extraParams = useMemo(
    () => ({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(partyFilter ? { [config.partyField]: partyFilter } : {}),
      ...(dateRange?.[0] ? { from: dateRange[0].format("YYYY-MM-DD") } : {}),
      ...(dateRange?.[1] ? { to: dateRange[1].format("YYYY-MM-DD") } : {}),
    }),
    [config.partyField, dateRange, partyFilter, statusFilter, typeFilter],
  );

  const table = useTenantPaginatedTable({
    queryKey: config.queryKey,
    queryFn: config.api.list,
    extraParams,
    defaultPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    staleTime: QUERY_STALE_TIME.ledger,
    tableId: config.tableId,
    t,
    tApiErrors,
    notification,
  });

  const partiesQuery = useQuery({
    queryKey: config.party.queryKey,
    queryFn: config.party.fetchNames,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const partyOptions = useMemo(
    () => [
      { value: "", label: t("filterAllParties") },
      ...(partiesQuery.data ?? []).map((row) => ({ value: row.id, label: String(row.name ?? row.id) })),
    ],
    [partiesQuery.data, t],
  );

  const tableData = useMemo(
    () =>
      table.rows.map((row) => ({
        ...row,
        party_name: row?.[config.partyRelation]?.name ?? "",
        invoice_number: row?.[config.invoiceRelation]?.invoice_number ?? "",
      })),
    [config.invoiceRelation, config.partyRelation, table.rows],
  );

  const { openCreateDrawer, openEditDrawer, openViewDrawer } = usePageDrawer(config.featureId);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: config.queryKey });
    queryClient.invalidateQueries({ queryKey: config.detailPrefix });
    for (const key of config.extraQueryKeys ?? []) queryClient.invalidateQueries({ queryKey: key });
  }, [config.detailPrefix, config.extraQueryKeys, config.queryKey, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => config.api.remove(id),
    onSuccess: () => {
      message.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
    onError: (err) => notification.error({ title: t("deleteError"), description: getLocalizedApiErrorMessage(tApiErrors, err) }),
  });

  const reverseMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => config.api.reverse(id),
    onSuccess: () => {
      message.success(t("reverseSuccess"));
      invalidate();
    },
    onError: (err) => notification.error({ title: t("reverseError"), description: getLocalizedApiErrorMessage(tApiErrors, err) }),
  });

  const handleDelete = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      modal.confirm({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent", { name: String(record[config.numberField] ?? id) }),
        okText: t("deleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(deleteMutation.mutateAsync(id)),
      });
    },
    [config.numberField, deleteMutation, modal, t],
  );

  const { downloadPdf, printPdf } = useDocumentPdfDownload({
    download: config.api.downloadPdf,
    errorTitle: t("pdfError"),
  });

  const handleReverse = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      modal.confirm({
        title: t("reverseConfirmTitle"),
        content: t("reverseConfirmContent"),
        okText: t("actionReverse"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(reverseMutation.mutateAsync(id)),
      });
    },
    [modal, reverseMutation, t],
  );

  const baseColumns = useMemo(
    () => [
      {
        title: t("colNumber"),
        dataIndex: config.numberField,
        width: 140,
        render: (value) => (value ? <Typography.Text code className="text-xs">{value}</Typography.Text> : "\u2014"),
      },
      { title: t("colDate"), dataIndex: config.dateField, width: 120, render: (value) => formatTenantDate(value) || "\u2014" },
      { title: t("colParty"), dataIndex: "party_name", ellipsis: true },
      { title: t("colInvoice"), dataIndex: "invoice_number", width: 140, ellipsis: true },
      { title: t("colType"), dataIndex: "type", width: 120, render: (value) => getCreditDocumentTypeLabel(t, value) },
      {
        title: t("colStatus"),
        dataIndex: "status",
        width: 120,
        render: (value) => <Tag color={creditDocumentStatusTagColor(value)}>{getCreditDocumentStatusLabel(t, value)}</Tag>,
      },
      { title: t("colGrandTotal"), dataIndex: "grand_total", width: 140, align: "right", render: (value) => formatTenantMoney(value) || "\u2014" },
      { title: t("colOpenCredit"), dataIndex: "open_credit", width: 140, align: "right", render: (value) => formatTenantMoney(value) || "\u2014" },
      { title: t("colCreatedAt"), dataIndex: "created_at", width: 170, render: (value) => formatTenantDateTime(value) || "\u2014" },
      {
        title: t("colActions"),
        key: "actions",
        width: 72,
        fixed: "right",
        render: (_, record) => {
          const items = [
            access.canView ? { key: "view", icon: <EyeOutlined />, label: t("actionView"), onClick: () => openViewDrawer(record) } : null,
            isCreditDocumentDraft(record?.status) && access.canEdit
              ? { key: "edit", icon: <EditOutlined />, label: t("actionEdit"), onClick: () => openEditDrawer(record) }
              : null,
            access.canPrint && isDocumentPdfPrintable(config.documentKey, record?.status)
              ? { key: "print", icon: <PrinterOutlined />, label: t("actionPrint"), onClick: () => printPdf(normalizeEntityId(record?.id), record?.[config.numberField]) }
              : null,
            access.canPrint && isDocumentPdfPrintable(config.documentKey, record?.status)
              ? { key: "pdf", icon: <FilePdfOutlined />, label: t("actionDownloadPdf"), onClick: () => downloadPdf(normalizeEntityId(record?.id), record?.[config.numberField]) }
              : null,
            isCreditDocumentDraft(record?.status) && access.canDelete
              ? { key: "delete", icon: <DeleteOutlined />, danger: true, label: t("actionDelete"), onClick: () => handleDelete(record) }
              : null,
            record?.status === "posted" && access.canReverse
              ? { key: "reverse", icon: <RollbackOutlined />, danger: true, label: t("actionReverse"), onClick: () => handleReverse(record) }
              : null,
          ].filter(Boolean);
          return (
            <Dropdown menu={{ items }} trigger={["click"]}>
              <Button type="text" icon={<MoreOutlined />} aria-label={t("actionMenu")} onClick={(e) => e.stopPropagation()} />
            </Dropdown>
          );
        },
      },
    ],
    [access.canDelete, access.canEdit, access.canPrint, access.canReverse, access.canView, config.dateField, config.documentKey, config.numberField, downloadPdf, printPdf, handleDelete, handleReverse, openEditDrawer, openViewDrawer, t],
  );
  const columns = useDocumentBranchColumns(baseColumns);

  const dateRangeLabel = formatStockFilterDateRange(dateRange?.[0], dateRange?.[1]);
  const filterSummary = [
    partyFilter ? { label: t("filterParty"), value: partyOptions.find((row) => row.value === partyFilter)?.label ?? partyFilter } : null,
    typeFilter ? { label: t("filterType"), value: getCreditDocumentTypeLabel(t, typeFilter) } : null,
    statusFilter ? { label: t("filterStatus"), value: getCreditDocumentStatusLabel(t, statusFilter) } : null,
    dateRangeLabel ? { label: t("filterDateRange"), value: dateRangeLabel } : null,
  ].filter(Boolean);

  const { toggle: filterToggle, filterBar } = useStockTableFilters({
    activeCount: filterSummary.length,
    summary: filterSummary,
    onClearAll: () => {
      setStatusFilter(undefined);
      setTypeFilter(undefined);
      setPartyFilter(undefined);
      setDateRange(null);
    },
    children: (
      <div className="flex flex-col gap-1">
        <div className={stockFilterFieldRowClassName}>
          <Form.Item label={t("filterParty")}>
            <Select className="w-full" value={partyFilter ?? ""} options={partyOptions} loading={partiesQuery.isPending} showSearch optionFilterProp="label" onChange={(value) => setPartyFilter(value === "" ? undefined : String(value))} />
          </Form.Item>
          <Form.Item label={t("filterType")}>
            <Select
              className="w-full"
              value={typeFilter ?? ""}
              options={[{ value: "", label: t("filterAllTypes") }, ...CREDIT_DOCUMENT_TYPE_VALUES.map((value) => ({ value, label: getCreditDocumentTypeLabel(t, value) }))]}
              onChange={(value) => setTypeFilter(value === "" ? undefined : String(value))}
            />
          </Form.Item>
          <Form.Item label={t("filterStatus")}>
            <Select
              className="w-full"
              value={statusFilter ?? ""}
              options={[{ value: "", label: t("filterAllStatuses") }, ...CREDIT_DOCUMENT_STATUS_VALUES.map((value) => ({ value, label: getCreditDocumentStatusLabel(t, value) }))]}
              onChange={(value) => setStatusFilter(value === "" ? undefined : String(value))}
            />
          </Form.Item>
        </div>
        <div className={stockFilterFieldRowClassName}>
          <Form.Item label={t("filterDateRange")}>
            <DatePicker.RangePicker className="w-full" value={dateRange} onChange={(range) => setDateRange(range ?? null)} allowEmpty={[true, true]} format={dayjsDatePattern()} />
          </Form.Item>
        </div>
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
        loading={table.isPending}
        refreshFetching={table.isFetching}
        onRetry={() => table.refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange: table.onSearchChange,
          showRefresh: true,
          onRefresh: () => table.refetch(),
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          addLabel: t("toolbarNew"),
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1100}
        pagination={table.pagination}
      />
    </div>
  );
}
