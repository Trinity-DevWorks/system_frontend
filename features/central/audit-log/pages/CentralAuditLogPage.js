"use client";

import {
  auditFilterFieldRowClassName,
  formatAuditFilterDateRange,
  useAuditLogFilters,
} from "@/features/audit-log/components/AuditLogTable/AuditLogFilters";
import { getAuditLogTableColumns } from "@/features/audit-log/components/AuditLogTable/getAuditLogTableColumns";
import { useCentralResourceAccess } from "@/lib/central-permissions";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useServerTablePagination } from "@/lib/tables/useServerTablePagination";
import { dayjsDatePattern } from "@/lib/tenant-format";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { DownloadOutlined } from "@ant-design/icons";
import { App, Button, DatePicker, Form, Input, Select, Space, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useCentralAuditLogExport } from "../queries/useAuditLogExport";
import { useCentralAuditLogTableQuery } from "../queries/useAuditLogTableQuery";
import {
  CENTRAL_AUDIT_AUDITABLE_TYPE_VALUES,
  CENTRAL_AUDIT_EVENT_VALUES,
  getCentralAuditEventLabel,
  getCentralAuditableTypeLabel,
} from "../utils/auditLogLabels";

function CentralAuditLogTable() {
  const t = useTranslations("CentralAuditLog");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const access = useCentralResourceAccess("audits");
  const { openViewDrawer } = usePageDrawer("centralAuditLog");

  const [eventFilter, setEventFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [auditableTypeFilter, setAuditableTypeFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [auditableIdFilter, setAuditableIdFilter] = useState("");
  const [tagsFilter, setTagsFilter] = useState("");
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs, import("dayjs").Dayjs] | null} */ (null),
  );
  const { page, perPage, search, onPageChange, onSearchChange, resetPage } = useServerTablePagination({
    tableId: "central-audit-log",
    pageSizeOptions: [10, 25, 50, 100],
    defaultPageSize: 25,
  });

  const fromIso = dateRange?.[0]?.startOf("day").toISOString();
  const toIso = dateRange?.[1]?.endOf("day").toISOString();
  const auditableId = auditableIdFilter.trim() || undefined;
  const tags = tagsFilter.trim() || undefined;

  const { tableData, total, from, to, isPending, isFetching, refetch } = useCentralAuditLogTableQuery({
    t,
    tApiErrors,
    notification,
    event: eventFilter,
    auditableType: auditableTypeFilter,
    auditableId,
    tags,
    from: fromIso,
    to: toIso,
    search,
    page,
    perPage,
  });

  const eventFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllEvents") },
      ...CENTRAL_AUDIT_EVENT_VALUES.map((value) => ({ value, label: getCentralAuditEventLabel(t, value) })),
    ],
    [t],
  );

  const auditableTypeOptions = useMemo(
    () => [
      { value: "", label: t("filterAllAuditableTypes") },
      ...CENTRAL_AUDIT_AUDITABLE_TYPE_VALUES.map((value) => ({
        value,
        label: getCentralAuditableTypeLabel(t, value),
      })),
    ],
    [t],
  );

  const clearAllFilters = useCallback(() => {
    setEventFilter(undefined);
    setAuditableTypeFilter(undefined);
    setAuditableIdFilter("");
    setTagsFilter("");
    setDateRange(null);
    resetPage();
  }, [resetPage]);

  const filterSummary = useMemo(() => {
    /** @type {{ label: string; value: string }[]} */
    const lines = [];
    if (eventFilter) lines.push({ label: t("filterEvent"), value: getCentralAuditEventLabel(t, eventFilter) });
    if (auditableTypeFilter) {
      lines.push({ label: t("filterAuditableType"), value: getCentralAuditableTypeLabel(t, auditableTypeFilter) });
    }
    if (auditableId) lines.push({ label: t("filterAuditableId"), value: auditableId });
    if (tags) lines.push({ label: t("filterTags"), value: tags });
    const dateLabel = formatAuditFilterDateRange(dateRange?.[0], dateRange?.[1]);
    if (dateLabel) lines.push({ label: t("filterDateRange"), value: dateLabel });
    return lines;
  }, [auditableId, auditableTypeFilter, dateRange, eventFilter, t, tags]);

  const columns = useMemo(
    () =>
      getAuditLogTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        eventLabel: getCentralAuditEventLabel,
        auditableTypeLabel: getCentralAuditableTypeLabel,
      }),
    [t, access.canView, openViewDrawer],
  );

  const { toggle: filterToggle, filterBar } = useAuditLogFilters({
    activeCount: filterSummary.length,
    summary: filterSummary,
    onClearAll: clearAllFilters,
    children: (
      <div className={auditFilterFieldRowClassName}>
        <Form.Item label={t("filterEvent")}>
          <Select
            className="w-full"
            value={eventFilter ?? ""}
            options={eventFilterOptions}
            onChange={(v) => {
              setEventFilter(v === "" ? undefined : String(v));
              resetPage();
            }}
          />
        </Form.Item>
        <Form.Item label={t("filterAuditableType")}>
          <Select
            className="w-full"
            value={auditableTypeFilter ?? ""}
            options={auditableTypeOptions}
            onChange={(v) => {
              setAuditableTypeFilter(v === "" ? undefined : String(v));
              resetPage();
            }}
          />
        </Form.Item>
        <Form.Item label={t("filterAuditableId")}>
          <Input
            allowClear
            value={auditableIdFilter}
            placeholder={t("filterAuditableIdPlaceholder")}
            onChange={(e) => {
              setAuditableIdFilter(e.target.value);
              resetPage();
            }}
          />
        </Form.Item>
        <Form.Item label={t("filterTags")}>
          <Input
            allowClear
            value={tagsFilter}
            placeholder={t("filterTagsPlaceholder")}
            onChange={(e) => {
              setTagsFilter(e.target.value);
              resetPage();
            }}
          />
        </Form.Item>
        <Form.Item label={t("filterDateRange")} className="col-span-2">
          <DatePicker.RangePicker
            className="w-full"
            value={dateRange}
            onChange={(range) => {
              setDateRange(range ?? null);
              resetPage();
            }}
            allowEmpty={[true, true]}
            format={dayjsDatePattern()}
          />
        </Form.Item>
      </div>
    ),
  });

  const exportFilters = useMemo(
    () => ({
      ...(eventFilter ? { event: eventFilter } : {}),
      ...(auditableTypeFilter ? { auditable_type: auditableTypeFilter } : {}),
      ...(auditableId ? { auditable_id: auditableId } : {}),
      ...(tags ? { tags } : {}),
      ...(fromIso ? { from: fromIso } : {}),
      ...(toIso ? { to: toIso } : {}),
      ...(search ? { search } : {}),
    }),
    [auditableId, auditableTypeFilter, eventFilter, fromIso, search, tags, toIso],
  );

  const { exportCsv, exporting } = useCentralAuditLogExport({ t, tApiErrors, notification, filters: exportFilters });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="central-audit-log"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching || exporting}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange,
          showRefresh: true,
          onRefresh: () => refetch(),
          showAdd: false,
          showExportExcel: false,
          showExportPdf: false,
          showImportExcel: false,
          extra: (
            <Space size={4} align="center">
              {filterToggle}
              {access.canExport ? (
                <Button icon={<DownloadOutlined />} loading={exporting} onClick={exportCsv}>
                  {t("exportCsv")}
                </Button>
              ) : null}
            </Space>
          ),
          filterBar,
        }}
        stickyHeader
        scrollX={1280}
        pagination={{
          mode: "server",
          current: page,
          pageSize: perPage,
          total,
          pageSizeOptions: [10, 25, 50, 100],
          onPageChange,
          summaryRange:
            from != null && to != null ? { start: from, end: to, total } : total === 0 ? null : undefined,
        }}
      />
    </div>
  );
}

export default function CentralAuditLogPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <CentralAuditLogTable />
      </Suspense>
    </div>
  );
}
