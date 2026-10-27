"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern, formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import {
  formatStockFilterDateRange,
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "@/features/stock/components/StockTableFilters/StockTableFilters";
import { DeleteOutlined, EditOutlined, EyeOutlined, FilePdfOutlined, MoreOutlined, PrinterOutlined, RollbackOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, DatePicker, Dropdown, Form, Select, Spin, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";
import { deleteJournalEntry, downloadJournalEntryPdf, fetchJournalEntries, reverseJournalEntry } from "../api/accounting.api";
import { useDocumentPdfDownload } from "@/shared/hooks/useDocumentPdfDownload";
import { isDocumentPdfPrintable } from "@/shared/utils/documentPdf";
import {
  JOURNAL_SOURCE_TYPES,
  JOURNAL_STATUS_VALUES,
  SOURCE_DOCUMENT_FEATURE,
  journalStatusTagColor,
} from "../accountingUtils";
import { ACCOUNTS_QUERY_KEY, JOURNAL_ENTRIES_QUERY_KEY } from "../queries/accountingQueryKeys";

function JournalEntriesTable() {
  const t = useTranslations("Accounting");
  const { settings } = useCompanySettings();
  const currencySymbol = settings.primaryCurrencySymbol;
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("journal_entries");
  const { openDrawer } = useGlobalDrawer();
  const { openCreateDrawer, openEditDrawer, openViewDrawer } = usePageDrawer("journalEntries");
  const [statusFilter, setStatusFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [sourceFilter, setSourceFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs | null, import("dayjs").Dayjs | null] | null} */ (null),
  );

  const extraParams = useMemo(
    () => ({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(sourceFilter ? { source_type: sourceFilter } : {}),
      ...(dateRange?.[0] ? { from: dateRange[0].format("YYYY-MM-DD") } : {}),
      ...(dateRange?.[1] ? { to: dateRange[1].format("YYYY-MM-DD") } : {}),
    }),
    [dateRange, sourceFilter, statusFilter],
  );

  const table = useTenantPaginatedTable({
    queryKey: JOURNAL_ENTRIES_QUERY_KEY,
    queryFn: fetchJournalEntries,
    extraParams,
    defaultPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    staleTime: QUERY_STALE_TIME.ledger,
    tableId: "journal-entries",
    t,
    tApiErrors,
    notification,
    loadErrorKey: "entriesLoadError",
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: JOURNAL_ENTRIES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deleteJournalEntry(id),
    onSuccess: () => {
      message.success(t("entryDeleteSuccess"));
      invalidate();
    },
    onError: (err) => {
      notification.error({ title: t("entryDeleteError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const reverseMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => reverseJournalEntry(id),
    onSuccess: () => {
      message.success(t("entryReverseSuccess"));
      invalidate();
    },
    onError: (err) => {
      notification.error({ title: t("entryReverseError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const confirmDelete = useCallback(
    (record) =>
      modal.confirm({
        title: t("entryDeleteConfirmTitle"),
        content: t("entryDeleteConfirmContent", { name: String(record.entry_number) }),
        okText: t("actionDelete"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(deleteMutation.mutateAsync(String(record.id))),
      }),
    [deleteMutation, modal, t],
  );

  const confirmReverse = useCallback(
    (record) =>
      modal.confirm({
        title: t("entryReverseConfirmTitle"),
        content: t("entryReverseConfirmContent"),
        okText: t("actionReverse"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(reverseMutation.mutateAsync(String(record.id))),
      }),
    [modal, reverseMutation, t],
  );

  const openSource = useCallback(
    (record) => {
      const featureId = SOURCE_DOCUMENT_FEATURE[String(record.source_type)];
      if (!featureId || !record.source_id) return;
      openDrawer({ featureId, id: String(record.source_id), mode: "view" });
    },
    [openDrawer],
  );

  const { downloadPdf, printPdf } = useDocumentPdfDownload({
    download: downloadJournalEntryPdf,
    errorTitle: t("pdfError"),
  });

  const columns = useMemo(
    () => [
      {
        title: t("colEntryNumber"),
        dataIndex: "entry_number",
        width: 130,
        render: (value) => (
          <Typography.Text code className="text-xs">
            {value}
          </Typography.Text>
        ),
      },
      {
        title: t("colDate"),
        dataIndex: "entry_date",
        width: 120,
        render: (value) => formatTenantDate(value) || "\u2014",
      },
      {
        title: t("colSource"),
        dataIndex: "source_type",
        width: 230,
        render: (value, record) => {
          const label = t(`source_${value}`);
          const canOpen = Boolean(SOURCE_DOCUMENT_FEATURE[String(value)] && record.source_id);
          const event = record.source_event === "reverse" ? ` (${t("eventReverse")})` : "";
          if (!record.source_number) return `${label}${event}`;
          return (
            <span>
              {label}{" "}
              {canOpen ? (
                <Typography.Link
                  onClick={(e) => {
                    e.stopPropagation();
                    openSource(record);
                  }}
                >
                  {record.source_number}
                </Typography.Link>
              ) : (
                record.source_number
              )}
              {event}
            </span>
          );
        },
      },
      { title: t("colDescription"), dataIndex: "description", ellipsis: true },
      {
        title: t("colStatus"),
        dataIndex: "status",
        width: 110,
        render: (value) => <Tag color={journalStatusTagColor(value)}>{t(`status_${value}`)}</Tag>,
      },
      {
        title: t("colTotal"),
        dataIndex: "total_debit",
        width: 170,
        align: "right",
        render: (value) => formatTenantMoneyWithSymbol(value, currencySymbol) || "\u2014",
      },
      {
        title: t("colActions"),
        key: "actions",
        width: 72,
        fixed: "right",
        render: (_, record) => {
          const editable = record.is_manual && record.status === "draft";
          const items = [
            access.canView ? { key: "view", icon: <EyeOutlined />, label: t("actionView"), onClick: () => openViewDrawer(record) } : null,
            access.canPrint && isDocumentPdfPrintable("journal_entry", record.status)
              ? { key: "print", icon: <PrinterOutlined />, label: t("actionPrint"), onClick: () => printPdf(record.id, record.entry_number) }
              : null,
            access.canPrint && isDocumentPdfPrintable("journal_entry", record.status)
              ? { key: "pdf", icon: <FilePdfOutlined />, label: t("actionDownloadPdf"), onClick: () => downloadPdf(record.id, record.entry_number) }
              : null,
            editable && access.canEdit
              ? { key: "edit", icon: <EditOutlined />, label: t("actionEdit"), onClick: () => openEditDrawer(record) }
              : null,
            editable && access.canDelete
              ? { key: "delete", icon: <DeleteOutlined />, danger: true, label: t("actionDelete"), onClick: () => confirmDelete(record) }
              : null,
            record.is_manual && record.status === "posted" && access.canReverse
              ? { key: "reverse", icon: <RollbackOutlined />, danger: true, label: t("actionReverse"), onClick: () => confirmReverse(record) }
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
    [access.canDelete, access.canEdit, access.canPrint, access.canReverse, access.canView, downloadPdf, printPdf, confirmDelete, confirmReverse, currencySymbol, openEditDrawer, openSource, openViewDrawer, t],
  );

  const statusOptions = [
    { value: "", label: t("filterAllStatuses") },
    ...JOURNAL_STATUS_VALUES.map((value) => ({ value, label: t(`status_${value}`) })),
  ];
  const sourceOptions = [
    { value: "", label: t("filterAllSources") },
    ...JOURNAL_SOURCE_TYPES.map((value) => ({ value, label: t(`source_${value}`) })),
  ];

  const dateRangeLabel = formatStockFilterDateRange(dateRange?.[0], dateRange?.[1]);
  const filterSummary = [
    statusFilter ? { label: t("filterStatus"), value: t(`status_${statusFilter}`) } : null,
    sourceFilter ? { label: t("filterSource"), value: t(`source_${sourceFilter}`) } : null,
    dateRangeLabel ? { label: t("filterDateRange"), value: dateRangeLabel } : null,
  ].filter(Boolean);

  const { toggle: filterToggle, filterBar } = useStockTableFilters({
    activeCount: filterSummary.length,
    summary: /** @type {{ label: string; value: string }[]} */ (filterSummary),
    onClearAll: () => {
      setStatusFilter(undefined);
      setSourceFilter(undefined);
      setDateRange(null);
    },
    children: (
      <div className={stockFilterFieldRowClassName}>
        <Form.Item label={t("filterSource")}>
          <Select
            className="w-full"
            value={sourceFilter ?? ""}
            options={sourceOptions}
            onChange={(value) => setSourceFilter(value === "" ? undefined : String(value))}
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
            onChange={(range) => setDateRange(range ?? null)}
            allowEmpty={[true, true]}
            format={dayjsDatePattern()}
          />
        </Form.Item>
      </div>
    ),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="journal-entries"
        columns={columns}
        dataSource={table.rows}
        rowKey="id"
        loading={table.isPending}
        refreshFetching={table.isFetching}
        onRetry={() => table.refetch()}
        emptyText={t("entriesEmpty")}
        onRow={(record) => ({
          onDoubleClick: () => (access.canView ? openViewDrawer(record) : undefined),
        })}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange: table.onSearchChange,
          showImportExcel: false,
          showExportExcel: false,
          showExportPdf: false,
          showRefresh: true,
          onRefresh: () => table.refetch(),
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          addLabel: t("toolbarNewEntry"),
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1120}
        pagination={table.pagination}
      />
    </div>
  );
}

export default function JournalEntriesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <JournalEntriesTable />
      </Suspense>
    </div>
  );
}
