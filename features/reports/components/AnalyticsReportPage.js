"use client";

import { useReportBranch } from "@/features/accounting/useReportBranch";
import { fetchWarehouseNames } from "@/features/warehouses/api/warehouses.api";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCompanySettings } from "@/lib/company-settings";
import { getLocaleFromPathname } from "@/lib/locale-path";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { dayjsDatePattern, formatTenantDate, formatTenantMoneyWithSymbol, formatTenantNumber } from "@/lib/tenant-format";
import { SALE_ITEM_OPTIONS_QUERY_KEY, fetchSaleItemOptionsPage } from "@/shared/components/selects/ItemPickers";
import ServerSearchSelect from "@/shared/components/selects/ServerSearchSelect";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { SOURCE_DOCUMENT_FEATURE } from "@/features/accounting/accountingUtils";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import {
  formatStockFilterDateRange,
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "@/features/stock/components/StockTableFilters/StockTableFilters";
import TableExportMenu from "@/shared/components/tables/TableExportMenu";
import { useQuery } from "@tanstack/react-query";
import { Alert, App, Checkbox, DatePicker, Form, Input, InputNumber, Select, Space, Spin, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { REPORTS_QUERY_KEY, downloadAnalyticsReport, fetchAnalyticsReport } from "../api/reports.api";

/** Columns whose values are codes the page translates (e.g. cash flow categories, movement types). */
const TRANSLATED = { category: "val_", type: "val_", description: "val_" };

/**
 * @typedef {"dateRange" | "branch" | "groupBy" | "warehouse" | "days" | "includeExpired" | "item" | "accountRange"} ReportFilter
 *
 * @typedef {{
 *   name: string;
 *   titleKey: string;
 *   permission: "business_reports" | "accounting_reports";
 *   filters: ReportFilter[];
 *   defaults?: Record<string, string>;
 *   needs?: string[];
 *   serverTable?: boolean;
 * }} AnalyticsReportConfig
 *
 * serverTable: search, sort and pagination run on the backend (large grouped reports).
 */

const SERVER_PAGE_SIZES = [20, 50, 100];

/**
 * Link-styled cell that opens a drawer in view mode (same as the account ledger).
 *
 * @param {{ onOpen: () => void; children: import("react").ReactNode }} props
 */
function DrawerLink({ onOpen, children }) {
  return (
    <Typography.Link
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      {children}
    </Typography.Link>
  );
}

/** @param {{ config: AnalyticsReportConfig }} props */
function AnalyticsReportView({ config }) {
  const t = useTranslations("AnalyticsReports");
  const tApiErrors = useTranslations("ApiErrors");
  const tSelector = useTranslations("SalesInvoices");
  const { settings } = useCompanySettings();
  const symbol = settings.primaryCurrencySymbol;
  const { notification } = App.useApp();
  const access = useResourceAccess(config.permission);
  const { openDrawer } = useGlobalDrawer();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [exporting, setExporting] = useState(false);
  const has = (/** @type {ReportFilter} */ f) => config.filters.includes(f);

  const get = (key) => searchParams.get(key) ?? config.defaults?.[key] ?? undefined;
  const branchFromUrl = Number(searchParams.get("branch") ?? "") || undefined;
  const branch = useReportBranch(branchFromUrl);

  const setParams = useCallback(
    (/** @type {Record<string, string | undefined>} */ patch) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value != null && value !== "") next.set(key, value);
        else next.delete(key);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const params = useMemo(() => {
    /** @type {Record<string, string | number | undefined>} */
    const out = {};
    for (const key of ["from", "to", "group_by", "warehouse_id", "days", "include_expired", "item_id", "account_from", "account_to"]) {
      const v = get(key);
      if (v != null && v !== "") out[key] = v;
    }
    if (has("branch") && branch.selectedBranchId != null) out.branch_id = branch.selectedBranchId;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, branch.selectedBranchId]);

  const ready = (config.needs ?? []).every((key) => params[key] != null) && (!has("branch") || branch.isFetched);

  // Server table state. Page goes back to 1 whenever the filters, search or sort change.
  const serverTable = config.serverTable === true;
  // Set by the shared table's search box (it already waits for typing to stop).
  const [search, setSearch] = useState("");
  const onSearchChange = useCallback((value) => setSearch(String(value ?? "").trim()), []);
  const [table, setTable] = useState(
    /** @type {{ resetKey: string; page: number; perPage: number; sort?: string; dir?: "asc" | "desc" }} */ ({
      resetKey: "",
      page: 1,
      perPage: SERVER_PAGE_SIZES[0],
    }),
  );
  const resetKey = JSON.stringify([params, search]);
  const page = table.resetKey === resetKey ? table.page : 1;
  const listParams = useMemo(
    () => (serverTable ? { search: search || undefined, sort: table.sort, dir: table.dir } : {}),
    [search, serverTable, table.dir, table.sort],
  );
  const queryParams = useMemo(
    () => (serverTable ? { ...params, ...listParams, page, per_page: table.perPage } : params),
    [listParams, page, params, serverTable, table.perPage],
  );

  const query = useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "analytics", config.name, queryParams],
    queryFn: () => fetchAnalyticsReport(config.name, queryParams),
    enabled: ready,
    staleTime: QUERY_STALE_TIME.ledger,
    placeholderData: serverTable ? (previous) => previous : undefined,
  });
  const report = query.data && typeof query.data === "object" ? query.data : null;
  const reportRows = report?.rows;
  const rows = useMemo(() => {
    const list = Array.isArray(reportRows) ? reportRows : [];
    return list.map((row, index) => ({ ...row, key: `row-${index}` }));
  }, [reportRows]);

  const warehousesQuery = useQuery({
    queryKey: ["tenant", "warehouses", "names"],
    queryFn: () => fetchWarehouseNames(),
    enabled: has("warehouse"),
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const runExport = useCallback(
    async (/** @type {"xlsx" | "pdf"} */ format) => {
      if (exporting) return;
      setExporting(true);
      try {
        // Export keeps the search and sort but includes every row.
        await downloadAnalyticsReport(config.name, { ...params, ...listParams, format, locale: getLocaleFromPathname(window.location.pathname) });
      } catch (error) {
        notification.error({ title: t("exportError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
      } finally {
        setExporting(false);
      }
    },
    [config.name, exporting, listParams, notification, params, t, tApiErrors],
  );

  const render = useCallback(
    (type, key, value) => {
      if (value == null || value === "") return "";
      if (TRANSLATED[key] && t.has(`${TRANSLATED[key]}${value}`)) return t(`${TRANSLATED[key]}${value}`);
      switch (type) {
        case "money":
          return formatTenantMoneyWithSymbol(value, symbol);
        case "qty":
          return formatTenantNumber(value, { decimals: 3, trimTrailingZeros: true });
        case "date":
          return formatTenantDate(value);
        case "percent":
          return `${value}%`;
        default:
          return String(value);
      }
    },
    [symbol, t],
  );

  const serverPagination = report?.pagination ?? null;
  const sortableKeys = serverPagination?.sortable;
  const sortable = useMemo(() => (Array.isArray(sortableKeys) ? sortableKeys : []), [sortableKeys]);
  const activeSort = table.sort ?? serverPagination?.sort ?? null;
  const activeDir = table.sort ? table.dir : serverPagination?.dir;

  // Reports for one item (item movement) send its base unit; quantity headers show it.
  const uom = typeof report?.meta?.uom === "string" && report.meta.uom !== "" ? report.meta.uom : null;
  const columns = useMemo(
    () =>
      (report?.columns ?? []).map((/** @type {{ key: string; type: string }} */ c) => ({
        title: uom && c.type === "qty" ? `${t(`col_${c.key}`)} (${uom})` : t(`col_${c.key}`),
        dataIndex: c.key,
        key: c.key,
        align: ["money", "qty", "int", "percent"].includes(c.type) ? "right" : undefined,
        render: (value, row) => {
          const text = render(c.type, c.key, value);
          // Ledger rows: the entry number opens the journal entry, the document number opens its document.
          if (c.key === "entry" && text && row?.entry_id) {
            return <DrawerLink onOpen={() => openDrawer({ featureId: "journalEntries", id: String(row.entry_id), mode: "view" })}>{text}</DrawerLink>;
          }
          const docFeature = c.key === "document" && row?.source_id ? SOURCE_DOCUMENT_FEATURE[String(row.source_type)] : null;
          if (docFeature && text) {
            return <DrawerLink onOpen={() => openDrawer({ featureId: docFeature, id: String(row.source_id), mode: "view" })}>{text}</DrawerLink>;
          }
          return text;
        },
        // The backend lists the sortable columns and the sort in use (its default until you click a header).
        ...(serverTable && sortable.includes(c.key)
          ? {
              sorter: true,
              sortOrder: activeSort === c.key ? (activeDir === "asc" ? "ascend" : "descend") : null,
            }
          : {}),
      })),
    [activeDir, activeSort, openDrawer, report?.columns, render, serverTable, sortable, t, uom],
  );
  // Column header click: new sort, back to page 1.
  const onSortChange = useCallback(
    (_pagination, _filters, sorter) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const sort = s?.order ? String(s.columnKey) : undefined;
      const dir = s?.order === "ascend" ? "asc" : s?.order === "descend" ? "desc" : undefined;
      if (sort === table.sort && dir === table.dir) return;
      setTable({ resetKey, sort, dir, perPage: table.perPage, page: 1 });
    },
    [resetKey, table.dir, table.perPage, table.sort],
  );
  const onPageChange = useCallback(
    (nextPage, nextSize) => {
      setTable((prev) => ({ ...prev, resetKey, perPage: nextSize, page: nextSize !== prev.perPage ? 1 : nextPage }));
    },
    [resetKey],
  );

  const reportColumns = report?.columns;
  const reportTotals = report?.totals;
  const renderTotals = useCallback(
    () =>
      reportTotals ? (
        <Table.Summary.Row>
          {(reportColumns ?? []).map((c, index) => (
            <Table.Summary.Cell key={c.key} index={index} align={["money", "qty", "int", "percent"].includes(c.type) ? "right" : undefined}>
              <strong>{index === 0 ? t("totals") : render(c.type, c.key, reportTotals[c.key])}</strong>
            </Table.Summary.Cell>
          ))}
        </Table.Summary.Row>
      ) : null,
    [render, reportColumns, reportTotals, t],
  );

  const range = get("from") || get("to") ? [get("from") ? dayjs(get("from")) : null, get("to") ? dayjs(get("to")) : null] : report?.meta?.from && report?.meta?.to ? [dayjs(report.meta.from), dayjs(report.meta.to)] : null;
  const branchOptions = branch.accessibleBranches.map((b) => ({ value: Number(b.id), label: String(b.name ?? b.id) }));
  const warehouseOptions = (Array.isArray(warehousesQuery.data) ? warehousesQuery.data : []).map((w) => ({ value: String(w.id), label: w.name }));

  const dateRangeEl = has("dateRange") ? (
    <DatePicker.RangePicker
      className={serverTable ? "w-full" : undefined}
      value={range}
      onChange={(r) => setParams({ from: r?.[0]?.format("YYYY-MM-DD"), to: r?.[1]?.format("YYYY-MM-DD") })}
      allowEmpty={[true, true]}
      format={dayjsDatePattern()}
    />
  ) : null;
  const groupByEl = has("groupBy") ? (
    <Select
      className="w-40"
      value={get("group_by") ?? "item"}
      onChange={(v) => setParams({ group_by: v })}
      options={["item", "customer", "salesman", "branch", "category"].map((g) => ({ value: g, label: t(`group_${g}`) }))}
    />
  ) : null;
  const branchEl = has("branch") ? (
    <Select
      className={serverTable ? "w-full" : "min-w-40"}
      allowClear={branch.lockedBranchId == null}
      disabled={branch.lockedBranchId != null}
      placeholder={t("branchAll")}
      value={branch.selectedBranchId}
      onChange={(v) => setParams({ branch: v != null ? String(v) : undefined })}
      options={branchOptions}
      loading={branch.isPending}
    />
  ) : null;

  const warehouseEl = has("warehouse") ? (
    <Select
      className={serverTable ? "w-full" : "min-w-40"}
      allowClear
      placeholder={t("warehouseAll")}
      value={get("warehouse_id")}
      onChange={(v) => setParams({ warehouse_id: v })}
      options={warehouseOptions}
      loading={warehousesQuery.isPending}
    />
  ) : null;
  const daysEl = has("days") ? (
    serverTable ? (
      <InputNumber className="w-full" min={0} value={Number(get("days") ?? 0)} onChange={(v) => setParams({ days: v != null ? String(v) : undefined })} />
    ) : (
      <Space.Compact>
        <Input
          readOnly
          tabIndex={-1}
          value={t("days")}
          className="!w-auto shrink-0"
          styles={{ input: { width: "auto", pointerEvents: "none" } }}
        />
        <InputNumber min={0} value={Number(get("days") ?? 0)} onChange={(v) => setParams({ days: v != null ? String(v) : undefined })} />
      </Space.Compact>
    )
  ) : null;
  const includeExpiredEl = has("includeExpired") ? (
    <Checkbox checked={get("include_expired") === "1"} onChange={(e) => setParams({ include_expired: e.target.checked ? "1" : undefined })}>
      {t("includeExpired")}
    </Checkbox>
  ) : null;
  const accountRangeEl = has("accountRange") ? (
    <Space.Compact className={serverTable ? "w-full" : undefined}>
      <Input className={serverTable ? "w-1/2" : "w-32"} placeholder={t("accountFrom")} defaultValue={get("account_from")} onBlur={(e) => setParams({ account_from: e.target.value.trim() })} />
      <Input className={serverTable ? "w-1/2" : "w-32"} placeholder={t("accountTo")} defaultValue={get("account_to")} onBlur={(e) => setParams({ account_to: e.target.value.trim() })} />
    </Space.Compact>
  ) : null;

  // Server-table reports: every filter goes in the filter panel (like the other list pages), with chips.
  // Group by stays visible in the toolbar because it changes the columns, it does not filter rows.
  const dateChip = has("dateRange") ? formatStockFilterDateRange(get("from") ? dayjs(get("from")) : null, get("to") ? dayjs(get("to")) : null) : null;
  const branchChip =
    has("branch") && branchFromUrl != null && branch.lockedBranchId == null
      ? (branchOptions.find((o) => o.value === branchFromUrl)?.label ?? String(branchFromUrl))
      : null;
  const warehouseChip = has("warehouse") && get("warehouse_id") ? (warehouseOptions.find((o) => o.value === get("warehouse_id"))?.label ?? get("warehouse_id")) : null;
  // Days always has a value (the report default), so it only counts once changed in the URL.
  const daysChip = has("days") && searchParams.get("days") != null ? String(get("days")) : null;
  const accountChip = has("accountRange") && (get("account_from") || get("account_to")) ? `${get("account_from") ?? "…"} – ${get("account_to") ?? "…"}` : null;
  const filterSummary = [
    ...(dateChip ? [{ label: t("filterDateRange"), value: dateChip }] : []),
    ...(branchChip ? [{ label: t("filterBranch"), value: branchChip }] : []),
    ...(warehouseChip ? [{ label: t("filterWarehouse"), value: warehouseChip }] : []),
    ...(daysChip ? [{ label: t("days"), value: daysChip }] : []),
    ...(has("includeExpired") && get("include_expired") === "1" ? [{ label: t("includeExpired"), value: "✓" }] : []),
    ...(accountChip ? [{ label: t("filterAccounts"), value: accountChip }] : []),
  ];
  const { toggle: filterToggle, filterBar } = useStockTableFilters({
    activeCount: filterSummary.length,
    summary: filterSummary,
    onClearAll: () =>
      setParams({
        from: undefined,
        to: undefined,
        warehouse_id: undefined,
        days: undefined,
        include_expired: undefined,
        account_from: undefined,
        account_to: undefined,
        ...(branch.lockedBranchId == null ? { branch: undefined } : {}),
      }),
    children: (
      // Remount on clear so the account inputs (uncontrolled) empty too.
      <div key={`${get("account_from") ?? ""}|${get("account_to") ?? ""}`} className={stockFilterFieldRowClassName}>
        {dateRangeEl ? <Form.Item label={t("filterDateRange")}>{dateRangeEl}</Form.Item> : null}
        {branchEl ? <Form.Item label={t("filterBranch")}>{branchEl}</Form.Item> : null}
        {warehouseEl ? <Form.Item label={t("filterWarehouse")}>{warehouseEl}</Form.Item> : null}
        {daysEl ? <Form.Item label={t("days")}>{daysEl}</Form.Item> : null}
        {accountRangeEl ? <Form.Item label={t("filterAccounts")}>{accountRangeEl}</Form.Item> : null}
        {includeExpiredEl ? <Form.Item label=" ">{includeExpiredEl}</Form.Item> : null}
      </div>
    ),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      {serverTable ? null : (
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {dateRangeEl}
          {groupByEl}
          {branchEl}
          {warehouseEl}
          {has("item") ? (
            <div className="w-72">
              <ServerSearchSelect
                value={get("item_id")}
                onChange={(v) => setParams({ item_id: v ? String(v) : undefined })}
                fetchPage={fetchSaleItemOptionsPage}
                queryKey={SALE_ITEM_OPTIONS_QUERY_KEY}
                recentKind="report-item"
                placeholder={t("itemPlaceholder")}
                allowClear
                recentLabel={tSelector("selectorRecent")}
                clearRecentLabel={tSelector("selectorClearRecent")}
                resultsLabel={tSelector("selectorResults")}
                loadMoreLabel={tSelector("selectorLoadMore")}
                emptyLabel={tSelector("selectorEmpty")}
                typeToSearchLabel={tSelector("selectorTypeToSearch")}
              />
            </div>
          ) : null}
          {daysEl}
          {includeExpiredEl}
          {accountRangeEl}
        </div>
        {access.canExport && ready ? <TableExportMenu loading={exporting} onExportExcel={() => runExport("xlsx")} onExportPdf={() => runExport("pdf")} /> : null}
      </div>
      )}

      {!ready && (config.needs ?? []).length > 0 ? <Alert type="info" showIcon title={t("chooseItem")} /> : null}
      {query.isError ? <Alert type="error" showIcon title={t("reportLoadError")} description={getLocalizedApiErrorMessage(tApiErrors, query.error)} /> : null}

      {ready && serverTable ? (
        // Same shared table as the other list pages: search, refresh, columns, export and the pagination footer.
        <AppDataTable
          tableId={`report-${config.name}`}
          columns={columns}
          dataSource={rows}
          rowKey="key"
          loading={query.isPending}
          refreshFetching={query.isFetching}
          onRetry={() => query.refetch()}
          emptyText={t("reportEmpty")}
          toolbar={{
            showSearch: true,
            enableClientSearch: false,
            onSearchChange,
            showRefresh: true,
            onRefresh: () => query.refetch(),
            showImportExcel: false,
            showExportExcel: access.canExport,
            onExportExcel: () => runExport("xlsx"),
            showExportPdf: access.canExport,
            onExportPdf: () => runExport("pdf"),
            extra: (
              <>
                {groupByEl}
                {filterToggle}
              </>
            ),
            filterBar,
          }}
          onTableChange={onSortChange}
          summary={renderTotals}
          rowClassName={(row) => (row?.row_kind ? "font-semibold bg-neutral-50 dark:bg-neutral-800/40" : "")}
          stickyHeader
          scrollX={Math.max(800, columns.length * 140)}
          pagination={{
            mode: "server",
            current: serverPagination?.page ?? page,
            pageSize: table.perPage,
            total: serverPagination?.total ?? 0,
            pageSizeOptions: SERVER_PAGE_SIZES,
            onPageChange,
            summaryRange:
              serverPagination?.from != null && serverPagination?.to != null
                ? { start: serverPagination.from, end: serverPagination.to, total: serverPagination.total }
                : serverPagination?.total === 0
                  ? null
                  : undefined,
          }}
        />
      ) : null}
      {ready && !serverTable ? (
        <Table
          size="small"
          rowKey="key"
          loading={query.isPending}
          columns={columns}
          dataSource={rows}
          pagination={rows.length > 200 ? { pageSize: 200, showSizeChanger: false } : false}
          scroll={{ x: Math.max(800, columns.length * 140) }}
          locale={{ emptyText: t("reportEmpty") }}
          rowClassName={(row) => (row?.row_kind ? "font-semibold bg-neutral-50 dark:bg-neutral-800/40" : "")}
          summary={renderTotals}
        />
      ) : null}
    </div>
  );
}

/** @param {{ config: AnalyticsReportConfig }} props */
export default function AnalyticsReportPage({ config }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Spin /></div>}>
        <AnalyticsReportView config={config} />
      </Suspense>
    </div>
  );
}
