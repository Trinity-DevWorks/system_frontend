"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { downloadAuditsCsv } from "@/services/auditsApi";
import { DownloadOutlined } from "@ant-design/icons";
import { App, Button, DatePicker, Form, Input, Select, Space } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import AuditLogDetailDrawer from "./AuditLogDetailDrawer";
import {
  AUDIT_AUDITABLE_TYPE_VALUES,
  AUDIT_EVENT_VALUES,
  getAuditEventLabel,
  getAuditableTypeLabel,
} from "./auditLogLabels";
import {
  auditFilterFieldRowClassName,
  formatAuditFilterDateRange,
  useAuditLogFilters,
} from "./AuditLogFilters";
import { getAuditLogTableColumns } from "./getAuditLogTableColumns";
import { useAuditLogTableQuery } from "./useAuditLogTableQuery";

function AuditLogTable() {
  const t = useTranslations("AuditLog");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const access = useResourceAccess("audits");

  const [eventFilter, setEventFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [auditableTypeFilter, setAuditableTypeFilter] = useState(
    /** @type {string | undefined} */ (undefined),
  );
  const [auditableIdFilter, setAuditableIdFilter] = useState("");
  const [tagsFilter, setTagsFilter] = useState("");
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs, import("dayjs").Dayjs] | null} */ (null),
  );
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [detailRecord, setDetailRecord] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [exporting, setExporting] = useState(false);

  const fromIso = dateRange?.[0]?.startOf("day").toISOString();
  const toIso = dateRange?.[1]?.endOf("day").toISOString();
  const auditableId = auditableIdFilter.trim() || undefined;
  const tags = tagsFilter.trim() || undefined;

  const { rows, total, from, to, isPending, isFetching, refetch } = useAuditLogTableQuery({
    t,
    tApiErrors,
    notification,
    event: eventFilter,
    auditableType: auditableTypeFilter,
    auditableId,
    tags,
    from: fromIso,
    to: toIso,
    page,
    perPage,
  });

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        event_label: getAuditEventLabel(t, /** @type {string} */ (row?.event)),
        user_label: row?.user?.name || row?.user?.email || "",
        auditable_type_label: getAuditableTypeLabel(t, row?.auditable?.type),
        auditable_id_label: row?.auditable?.id != null ? String(row.auditable.id) : "",
      })),
    [rows, t],
  );

  const eventFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllEvents") },
      ...AUDIT_EVENT_VALUES.map((value) => ({
        value,
        label: getAuditEventLabel(t, value),
      })),
    ],
    [t],
  );

  const auditableTypeOptions = useMemo(
    () => [
      { value: "", label: t("filterAllAuditableTypes") },
      ...AUDIT_AUDITABLE_TYPE_VALUES.map((value) => ({
        value,
        label: getAuditableTypeLabel(t, value),
      })),
    ],
    [t],
  );

  const resetPage = useCallback(() => setPage(1), []);

  const clearAllFilters = useCallback(() => {
    setEventFilter(undefined);
    setAuditableTypeFilter(undefined);
    setAuditableIdFilter("");
    setTagsFilter("");
    setDateRange(null);
    setPage(1);
  }, []);

  const filterSummary = useMemo(() => {
    /** @type {{ label: string; value: string }[]} */
    const lines = [];
    if (eventFilter) {
      lines.push({ label: t("filterEvent"), value: getAuditEventLabel(t, eventFilter) });
    }
    if (auditableTypeFilter) {
      lines.push({
        label: t("filterAuditableType"),
        value: getAuditableTypeLabel(t, auditableTypeFilter),
      });
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
        onView: access.canView ? (record) => setDetailRecord(record) : undefined,
      }),
    [t, access.canView],
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
            showSearch
            optionFilterProp="label"
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
    }),
    [auditableId, auditableTypeFilter, eventFilter, fromIso, tags, toIso],
  );

  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      await downloadAuditsCsv(exportFilters);
      notification.success({ title: t("exportSuccess") });
    } catch (error) {
      notification.error({
        title: t("exportError"),
        description: getLocalizedApiErrorMessage(tApiErrors, error),
      });
    } finally {
      setExporting(false);
    }
  }, [exportFilters, notification, t, tApiErrors]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="audit-log"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching || exporting}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          searchKeys: [
            "event_label",
            "user_label",
            "auditable_type_label",
            "auditable_id_label",
            "ip_address",
            "tags",
          ],
          enableClientSearch: true,
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
                <Button
                  icon={<DownloadOutlined />}
                  loading={exporting}
                  onClick={handleExportCsv}
                >
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
          onPageChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPerPage(nextSize);
          },
          summaryRange:
            from != null && to != null
              ? { start: from, end: to, total }
              : total === 0
                ? null
                : undefined,
        }}
      />
      <AuditLogDetailDrawer
        open={detailRecord != null}
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
      />
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <AuditLogTable />
    </div>
  );
}
