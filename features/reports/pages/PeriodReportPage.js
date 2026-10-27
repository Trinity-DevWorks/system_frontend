"use client";

import { useReportBranch } from "@/features/accounting/useReportBranch";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { getLocaleFromPathname } from "@/lib/locale-path";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern, formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { Alert, App, DatePicker, Select, Spin, Table } from "antd";
import TableExportMenu from "@/shared/components/tables/TableExportMenu";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import {
  REPORTS_QUERY_KEY,
  downloadPurchasesByPeriod,
  downloadSalesByPeriod,
  fetchPurchasesByPeriod,
  fetchSalesByPeriod,
} from "../api/reports.api";

/**
 * @param {unknown} value
 * @param {string | null} symbol
 */
function money(value, symbol) {
  if (value == null || value === "") return "";
  return formatTenantMoneyWithSymbol(value, symbol);
}

/**
 * @param {"sales" | "purchases"} kind
 */
function PeriodReportTable({ kind }) {
  const t = useTranslations("BusinessReports");
  const tApiErrors = useTranslations("ApiErrors");
  const { settings } = useCompanySettings();
  const currencySymbol = settings.primaryCurrencySymbol;
  const { notification } = App.useApp();
  const access = useResourceAccess("business_reports");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [exporting, setExporting] = useState(false);

  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const groupBy = searchParams.get("group_by") || "month";
  const branchFromUrl = Number(searchParams.get("branch") ?? "") || undefined;
  const { accessibleBranches, lockedBranchId, selectedBranchId, isPending: branchesPending, isFetched: branchesFetched } = useReportBranch(branchFromUrl);

  const setParams = useCallback(
    (/** @type {Record<string, string | undefined>} */ patch) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const params = useMemo(
    () => ({
      from,
      to,
      group_by: groupBy,
      branch_id: selectedBranchId,
    }),
    [from, groupBy, selectedBranchId, to],
  );

  const query = useQuery({
    queryKey: [...REPORTS_QUERY_KEY, kind, params],
    queryFn: () => (kind === "sales" ? fetchSalesByPeriod(params) : fetchPurchasesByPeriod(params)),
    enabled: branchesFetched,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  const report = query.data && typeof query.data === "object" ? query.data : null;
  const rows = Array.isArray(report?.rows) ? report.rows : [];
  const pickerValue = from || to
    ? [from ? dayjs(from) : null, to ? dayjs(to) : null]
    : report?.from && report?.to
      ? [dayjs(report.from), dayjs(report.to)]
      : null;

  const runExport = useCallback(
    async (/** @type {"xlsx" | "pdf"} */ format) => {
      if (exporting) return;
      setExporting(true);
      try {
        const download = kind === "sales" ? downloadSalesByPeriod : downloadPurchasesByPeriod;
        await download({ ...params, format, locale: getLocaleFromPathname(window.location.pathname) });
      } catch (error) {
        notification.error({ title: t("exportError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
      } finally {
        setExporting(false);
      }
    },
    [exporting, kind, notification, params, t, tApiErrors],
  );

  const columns = useMemo(
    () => [
      {
        title: t("period"),
        dataIndex: "period",
        key: "period",
        render: (value) => formatTenantDate(value),
      },
      { title: t("documents"), dataIndex: "document_count", key: "document_count", width: 120, align: "right" },
      { title: t("gross"), dataIndex: "gross", key: "gross", width: 150, align: "right", render: (value) => money(value, currencySymbol) },
      { title: t("tax"), dataIndex: "tax", key: "tax", width: 140, align: "right", render: (value) => money(value, currencySymbol) },
      { title: t("net"), dataIndex: "net", key: "net", width: 150, align: "right", render: (value) => money(value, currencySymbol) },
      {
        title: kind === "sales" ? t("creditNotes") : t("debitNotes"),
        dataIndex: "credit_note_total",
        key: "credit_note_total",
        width: 150,
        align: "right",
        render: (value) => money(value, currencySymbol),
      },
      {
        title: kind === "sales" ? t("netSales") : t("netPurchases"),
        dataIndex: "net_sales",
        key: "net_sales",
        width: 160,
        align: "right",
        render: (value) => money(value, currencySymbol),
      },
    ],
    [currencySymbol, kind, t],
  );

  const branchOptions = accessibleBranches
    .map((branch) => {
      const id = Number(branch.id);
      if (!Number.isFinite(id)) return null;
      return { value: id, label: String(branch.name ?? id) };
    })
    .filter(Boolean);

  const totals = report?.totals;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <DatePicker.RangePicker
            value={pickerValue}
            onChange={(range) => setParams({
              from: range?.[0]?.format("YYYY-MM-DD"),
              to: range?.[1]?.format("YYYY-MM-DD"),
            })}
            allowEmpty={[true, true]}
            format={dayjsDatePattern()}
          />
          <Select
            className="w-36"
            value={groupBy}
            onChange={(value) => setParams({ group_by: value })}
            options={[
              { value: "day", label: t("groupDay") },
              { value: "week", label: t("groupWeek") },
              { value: "month", label: t("groupMonth") },
            ]}
          />
          <Select
            className="min-w-40"
            allowClear={lockedBranchId == null}
            disabled={lockedBranchId != null}
            placeholder={t("branchAll")}
            value={selectedBranchId}
            onChange={(value) => setParams({ branch: value != null ? String(value) : undefined })}
            options={branchOptions}
            loading={branchesPending}
          />
        </div>
        {access.canExport ? (
          <TableExportMenu
            loading={exporting}
            onExportExcel={() => runExport("xlsx")}
            onExportPdf={() => runExport("pdf")}
          />
        ) : null}
      </div>

      {query.isError ? (
        <Alert type="error" showIcon title={t("reportLoadError")} description={getLocalizedApiErrorMessage(tApiErrors, query.error)} />
      ) : null}

      <Table
        size="small"
        rowKey="period"
        loading={query.isPending}
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 980 }}
        locale={{ emptyText: t("reportEmpty") }}
        summary={() => totals ? (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}><strong>{t("totals")}</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><strong>{totals.document_count}</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><strong>{money(totals.gross, currencySymbol)}</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right"><strong>{money(totals.tax, currencySymbol)}</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right"><strong>{money(totals.net, currencySymbol)}</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="right"><strong>{money(totals.credit_note_total, currencySymbol)}</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={6} align="right"><strong>{money(totals.net_sales, currencySymbol)}</strong></Table.Summary.Cell>
          </Table.Summary.Row>
        ) : null}
      />
    </div>
  );
}

/** @param {{ kind: "sales" | "purchases" }} props */
export default function PeriodReportPage({ kind }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Spin /></div>}>
        <PeriodReportTable kind={kind} />
      </Suspense>
    </div>
  );
}
