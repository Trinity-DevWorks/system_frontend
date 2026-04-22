"use client";

import {
  ColumnHeightOutlined,
  ExportOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  ImportOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  loadHiddenColumnKeys,
  loadTableDensity,
  saveHiddenColumnKeys,
  saveTableDensity,
} from "@/lib/table-prefs-storage";
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Dropdown,
  Input,
  Pagination,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_SCROLL_X = 1000;
const DEFAULT_TABLE_SCROLL_Y = "calc(100dvh - 320px)";
const PICKER_SKIP = new Set(["actions"]);

/**
 * Reusable list shell: toolbar, filters, density, column visibility, selection bar,
 * sticky table + horizontal scroll, footer (summary / pager / page size).
 *
 * @param {object} props
 * @param {string} props.tableId Stable id for localStorage (per screen).
 * @param {import("antd/es/table").ColumnsType<any>} props.columns
 * @param {any[]} props.dataSource
 * @param {string | ((row: any) => string)} props.rowKey
 * @param {boolean} [props.loading] Table loading overlay (e.g. initial `isPending`).
 * @param {boolean} [props.refreshFetching] Spin refresh icon until false (e.g. TanStack `isFetching` while refetching).
 * @param {Error | null} [props.fetchError]
 * @param {() => void} [props.onRetry]
 * @param {string} [props.emptyText]
 * @param {{
 *   showSearch?: boolean,
 *   searchKeys?: string[],
 *   showAdd?: boolean,
 *   onAdd?: () => void,
 *   showRefresh?: boolean,
 *   onRefresh?: () => void,
 *   showExportExcel?: boolean,
 *   onExportExcel?: () => void,
 *   showExportPdf?: boolean,
 *   onExportPdf?: () => void,
 *   showImportExcel?: boolean,
 *   onImportExcel?: () => void,
 *   enableClientSearch?: boolean,
 *   extra?: import("react").ReactNode,
 * }} [props.toolbar]
 * @param {import("antd/es/table/interface").TableRowSelection<any> | false} [props.rowSelection]
 * @param {boolean} [props.showSelectionBar]
 * @param {boolean} [props.stickyHeader]
 * @param {number} [props.scrollX]
 * @param {string} [props.tableBodyScrollY]
 * @param {false | {
 *   mode: "client" | "server" | "placeholder",
 *   pageSize?: number,
 *   pageSizeOptions?: number[],
 *   current?: number,
 *   total?: number,
 *   onPageChange?: (page: number, pageSize: number) => void,
 *   summaryRange?: { start: number; end: number; total: number } | null,
 *   disabled?: boolean,
 * }} [props.pagination] For server mode, pass summaryRange from API meta (1-based inclusive).
 */
export default function AppDataTable({
  tableId,
  columns,
  dataSource,
  rowKey,
  loading = false,
  refreshFetching = false,
  fetchError = null,
  onRetry,
  emptyText,
  toolbar = {},
  rowSelection,
  showSelectionBar = true,
  stickyHeader = true,
  scrollX = DEFAULT_SCROLL_X,
  tableBodyScrollY = DEFAULT_TABLE_SCROLL_Y,
  pagination = false,
}) {
  const t = useTranslations("DataTable");
  const {
    showSearch = true,
    searchKeys = ["name"],
    showAdd = false,
    onAdd,
    showRefresh = true,
    onRefresh,
    showExportExcel = true,
    onExportExcel,
    showExportPdf = true,
    onExportPdf,
    showImportExcel = true,
    onImportExcel,
    enableClientSearch = true,
    extra,
  } = toolbar;

  const paginationMode = pagination ? pagination.mode : false;
  const serverSummary = pagination?.summaryRange;
  const pageSizeOptions = pagination?.pageSizeOptions ?? [10, 20, 50];

  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hiddenKeys, setHiddenKeys] = useState([]);
  const [density, setDensity] = useState("comfortable");
  const [prefsReady, setPrefsReady] = useState(false);
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);

  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(
    () => (pagination?.mode === "client" && pagination.pageSize ? pagination.pageSize : 20),
  );

  useEffect(() => {
    queueMicrotask(() => {
      setHiddenKeys(loadHiddenColumnKeys(tableId));
      setDensity(loadTableDensity(tableId));
      setPrefsReady(true);
    });
  }, [tableId]);

  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchDraft.trim()), 300);
    return () => clearTimeout(id);
  }, [searchDraft]);

  useEffect(() => {
    queueMicrotask(() => setClientPage(1));
  }, [searchQuery]);

  const filteredRows = useMemo(() => {
    const rows = dataSource ?? [];
    if (paginationMode === "server" || !enableClientSearch) return rows;
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((row) =>
      searchKeys.some((key) => {
        const v = row?.[key];
        if (v == null) return false;
        return String(v).toLowerCase().includes(q);
      }),
    );
  }, [dataSource, searchKeys, searchQuery, paginationMode, enableClientSearch]);

  const effectiveClientPageSize = clientPageSize;

  const pageCount =
    paginationMode === "client"
      ? Math.max(1, Math.ceil(filteredRows.length / effectiveClientPageSize) || 1)
      : 1;
  const currentClientPage =
    paginationMode === "client" ? Math.min(clientPage, pageCount) : 1;

  const displayedRows = useMemo(() => {
    if (paginationMode === "server") {
      return filteredRows;
    }
    if (paginationMode === "client") {
      const start = (currentClientPage - 1) * effectiveClientPageSize;
      return filteredRows.slice(start, start + effectiveClientPageSize);
    }
    return filteredRows;
  }, [
    filteredRows,
    paginationMode,
    currentClientPage,
    effectiveClientPageSize,
  ]);

  const selectedKeys =
    rowSelection && typeof rowSelection.selectedRowKeys !== "undefined"
      ? rowSelection.selectedRowKeys ?? []
      : [];

  const visibleColumns = useMemo(() => {
    const list = columns ?? [];
    return list.filter((c) => {
      const k = c.key;
      if (k == null) return true;
      if (PICKER_SKIP.has(String(k))) return true;
      return !hiddenKeys.includes(String(k));
    });
  }, [columns, hiddenKeys]);

  const showImportExportCluster =
    showExportExcel || showExportPdf || showImportExcel;

  const importExportMenuItems = useMemo(() => {
    if (!showExportExcel && !showExportPdf && !showImportExcel) return [];
    /** @type {import("antd/es/menu").MenuProps["items"]} */
    const items = [];
    if (showExportExcel) {
      items.push({
        key: "export-excel",
        icon: <FileExcelOutlined />,
        label: t("exportExcel"),
        disabled: !onExportExcel,
        ...(!onExportExcel ? { title: t("transferSoon") } : {}),
      });
    }
    if (showExportPdf) {
      items.push({
        key: "export-pdf",
        icon: <FilePdfOutlined />,
        label: t("exportPdf"),
        disabled: !onExportPdf,
        ...(!onExportPdf ? { title: t("transferSoon") } : {}),
      });
    }
    const hasImport = showImportExcel;
    const hasExportItems = showExportExcel || showExportPdf;
    if (hasExportItems && hasImport) {
      items.push({ type: "divider" });
    }
    if (hasImport) {
      items.push({
        key: "import-excel",
        icon: <ImportOutlined />,
        label: t("importExcel"),
        disabled: !onImportExcel,
        ...(!onImportExcel ? { title: t("transferSoon") } : {}),
      });
    }
    return items;
  }, [showExportExcel, showExportPdf, showImportExcel, onExportExcel, onExportPdf, onImportExcel, t]);

  const handleImportExportMenuClick = useCallback(
    ({ key }) => {
      if (key === "export-excel") onExportExcel?.();
      else if (key === "export-pdf") onExportPdf?.();
      else if (key === "import-excel") onImportExcel?.();
    },
    [onExportExcel, onExportPdf, onImportExcel],
  );

  const columnMenuItems = useMemo(() => {
    const items = (columns ?? [])
      .filter((c) => c.key != null && !PICKER_SKIP.has(String(c.key)))
      .map((c) => {
        const key = String(c.key);
        const label =
          typeof c.title === "string" ? c.title : key;
        const checked = !hiddenKeys.includes(key);
        return {
          key: `col-${key}`,
          label: (
            <Checkbox
              checked={checked}
              onChange={(e) => {
                const next = new Set(hiddenKeys);
                if (e.target.checked) next.delete(key);
                else next.add(key);
                const arr = [...next];
                setHiddenKeys(arr);
                saveHiddenColumnKeys(tableId, arr);
              }}
            >
              {label}
            </Checkbox>
          ),
        };
      });
    return items.length ? items : [{ key: "none", label: t("columnPickerEmpty"), disabled: true }];
  }, [columns, hiddenKeys, tableId, t]);

  const setDensityAndSave = useCallback(
    (next) => {
      setDensity(next);
      saveTableDensity(tableId, next);
    },
    [tableId],
  );

  const paginationSummaryText = useMemo(() => {
    if (paginationMode === "server") {
      const total = pagination?.total ?? 0;
      if (total === 0) return t("paginationEmpty");
      if (serverSummary) {
        const { start, end, total: ttot } = serverSummary;
        return t("paginationTotal", { start, end, total: ttot });
      }
      const cur = pagination?.current ?? 1;
      const ps = pagination?.pageSize ?? 20;
      const start = (cur - 1) * ps + 1;
      const end = Math.min(cur * ps, total);
      return t("paginationTotal", { start, end, total });
    }
    if (paginationMode === "placeholder") {
      if ((pagination.total ?? filteredRows.length) === 0) return t("paginationEmpty");
      return t("paginationTotal", {
        start: 1,
        end: pagination.total ?? filteredRows.length,
        total: pagination.total ?? filteredRows.length,
      });
    }
    if (filteredRows.length === 0) return t("paginationEmpty");
    if (paginationMode === "client") {
      return t("paginationTotal", {
        start: (currentClientPage - 1) * effectiveClientPageSize + 1,
        end: Math.min(currentClientPage * effectiveClientPageSize, filteredRows.length),
        total: filteredRows.length,
      });
    }
    return t("paginationTotal", {
      start: 1,
      end: filteredRows.length,
      total: filteredRows.length,
    });
  }, [
    pagination,
    paginationMode,
    serverSummary,
    filteredRows.length,
    currentClientPage,
    effectiveClientPageSize,
    t,
  ]);

  const pagerCurrent =
    paginationMode === "server" ? pagination.current ?? 1 : currentClientPage;
  const pagerPageSize =
    paginationMode === "server" ? pagination.pageSize ?? 20 : effectiveClientPageSize;
  const pagerTotal =
    paginationMode === "server"
      ? pagination.total ?? 0
      : paginationMode === "client"
        ? filteredRows.length
        : pagination?.total ?? filteredRows.length;

  const pagerDisabled =
    paginationMode === "placeholder" ||
    pagination?.disabled === true ||
    loading;

  const handlePagerChange = (nextPage, nextPageSize) => {
    if (paginationMode === "server" && pagination.onPageChange) {
      pagination.onPageChange(nextPage, nextPageSize);
      rowSelection?.onChange?.([], []);
      return;
    }
    if (paginationMode === "client") {
      rowSelection?.onChange?.([], []);
      setClientPage(nextPage);
      setClientPageSize(nextPageSize);
    }
  };

  const handlePageSizeSelect = (nextSize) => {
    if (paginationMode === "server" && pagination.onPageChange) {
      pagination.onPageChange(1, nextSize);
      rowSelection?.onChange?.([], []);
      return;
    }
    if (paginationMode === "client") {
      rowSelection?.onChange?.([], []);
      setClientPage(1);
      setClientPageSize(nextSize);
    }
  };

  const tableSize = density === "compact" ? "small" : "middle";

  const scroll = useMemo(
    () => ({
      x: scrollX,
      ...(stickyHeader ? { y: tableBodyScrollY } : {}),
    }),
    [scrollX, stickyHeader, tableBodyScrollY],
  );

  const showFooter = pagination !== false;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 w-full flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <Space wrap size="small" className="min-w-0">
          {showSearch && paginationMode !== "server" ? (
            <Input.Search
              allowClear
              placeholder={t("searchPlaceholder")}
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              style={{ minWidth: 200, maxWidth: 320 }}
              aria-label={t("searchAria")}
            />
          ) : null}
          {showRefresh && onRefresh ? (
            <Tooltip title={t("refresh")}>
              <Button
                icon={<ReloadOutlined spin={loading || refreshFetching} />}
                onClick={onRefresh}
                disabled={loading || refreshFetching}
                aria-label={t("refresh")}
              />
            </Tooltip>
          ) : null}
          <Tooltip
            title={density === "compact" ? t("densityComfortable") : t("densityCompact")}
          >
            <Button
              icon={<ColumnHeightOutlined />}
              onClick={() =>
                setDensityAndSave(density === "compact" ? "comfortable" : "compact")
              }
              aria-label={t("densityToggleAria")}
            />
          </Tooltip>
          <Dropdown
            open={columnPickerOpen}
            onOpenChange={(open, info) => {
              if (!open && info?.source === "menu") return;
              setColumnPickerOpen(open);
            }}
            menu={{ items: columnMenuItems }}
            trigger={["click"]}
            disabled={!prefsReady}
          >
            <Button icon={<EyeOutlined />} aria-label={t("columnsAria")}>
              {t("columns")}
            </Button>
          </Dropdown>
          {extra}
        </Space>
        <Space wrap size="small" className="shrink-0 justify-end">
          {showImportExportCluster && importExportMenuItems.length > 0 ? (
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{
                items: importExportMenuItems,
                onClick: handleImportExportMenuClick,
              }}
            >
              <Button icon={<ExportOutlined />} aria-label={t("importExportMenuAria")}>
                {t("importExportMenu")}
              </Button>
            </Dropdown>
          ) : null}
          {showAdd && onAdd ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
              {t("add")}
            </Button>
          ) : null}
        </Space>
      </div>

      {fetchError ? (
        <Alert
          type="error"
          showIcon
          message={t("loadError")}
          description={fetchError instanceof Error ? fetchError.message : String(fetchError)}
          action={
            onRetry ? (
              <Button size="small" onClick={onRetry}>
                {t("retry")}
              </Button>
            ) : null
          }
        />
      ) : null}

      {showSelectionBar && rowSelection && selectedKeys.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.06]">
          <Typography.Text type="secondary">
            {t("selectedCount", { count: selectedKeys.length })}
          </Typography.Text>
          <Space size="small" separator={<Divider orientation="vertical" />}>
            <Button
              type="link"
              size="small"
              onClick={() => rowSelection.onChange?.([], [])}
            >
              {t("clearSelection")}
            </Button>
            <Tooltip title={t("bulkSoon")}>
              <Button type="link" size="small" disabled>
                {t("bulkActions")}
              </Button>
            </Tooltip>
          </Space>
        </div>
      ) : null}

      <div className="app-data-table min-w-0 overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
        <Table
          rowKey={rowKey}
          columns={visibleColumns}
          dataSource={displayedRows}
          loading={loading}
          tableLayout="fixed"
          rowSelection={rowSelection === false ? undefined : rowSelection}
          pagination={false}
          locale={{ emptyText: emptyText ?? t("empty") }}
          size={tableSize}
          sticky={stickyHeader}
          scroll={scroll}
          className="[&_.ant-table]:rounded-none"
        />
        {showFooter ? (
          <div className="grid grid-cols-1 items-center gap-3 border-t border-black/10 bg-black/[0.02] px-3 py-2 sm:grid-cols-[1fr_auto_1fr] dark:border-white/10 dark:bg-white/[0.04]">
            <Typography.Text type="secondary" className="min-w-0 justify-self-start">
              {paginationSummaryText}
            </Typography.Text>
            <div className="flex w-full justify-center justify-self-center sm:w-auto">
              <Pagination
                current={pagerCurrent}
                pageSize={pagerPageSize}
                total={pagerTotal}
                showSizeChanger={false}
                showTotal={false}
                disabled={pagerDisabled}
                hideOnSinglePage={
                  paginationMode === "client" ? false : paginationMode === "server"
                }
                onChange={handlePagerChange}
              />
            </div>
            <Select
              className="min-w-[7rem] justify-self-end"
              value={pagerPageSize}
              disabled={pagerDisabled}
              options={pageSizeOptions.map((n) => ({
                value: n,
                label: t("paginationPerPage", { size: n }),
              }))}
              aria-label={t("paginationPageSizeAria")}
              onChange={handlePageSizeSelect}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
