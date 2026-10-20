"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { getLocaleFromPathname } from "@/lib/locale-path";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { ROUTES } from "@/features/registry";
import { useRouter } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { Alert, App, DatePicker, Select, Spin, Table } from "antd";
import TableExportMenu from "@/shared/components/tables/TableExportMenu";
import dayjs from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import { accountDisplayName } from "../accountingUtils";
import { Suspense, useCallback, useMemo, useState } from "react";
import { downloadIncomeStatement, fetchIncomeStatement } from "../api/accounting.api";
import { ACCOUNTING_REPORTS_QUERY_KEY } from "../queries/accountingQueryKeys";
import { useReportBranch } from "../useReportBranch";

/**
 * @param {unknown} value
 * @param {string | null} symbol
 */
function money(value, symbol) {
  if (value == null || value === "") return "";
  return formatTenantMoneyWithSymbol(value, symbol);
}

/**
 * @param {Array<Record<string, unknown>>} sections
 * @param {(key: string) => string} sectionLabel
 */
function flattenSections(sections, sectionLabel, locale = "en") {
  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  for (const section of sections) {
    const key = String(section.key);
    if (section.is_total) {
      rows.push({
        id: key,
        kind: "total",
        label: sectionLabel(key),
        amount: section.amount,
        compare_amount: section.compare_amount,
        change: section.change,
      });
      continue;
    }
    rows.push({
      id: `section-${key}`,
      kind: "section",
      label: sectionLabel(key),
      amount: section.amount,
      compare_amount: section.compare_amount,
      change: section.change,
    });
    const lines = Array.isArray(section.rows) ? section.rows : [];
    for (const line of lines) {
      const computed = Boolean(line.computed);
      rows.push({
        id: computed ? String(line.key) : `account-${line.account_id}`,
        kind: computed ? "computed" : "account",
        label: computed ? sectionLabel(String(line.key)) : `${line.code}  ${accountDisplayName(line, locale)}`,
        depth: Number(line.depth ?? 1),
        account_id: line.account_id ?? null,
        amount: line.amount,
        compare_amount: line.compare_amount,
        change: line.change,
      });
    }
  }
  return rows;
}

function IncomeStatementTable() {
  const t = useTranslations("FinancialReports");
  const locale = useLocale();
  const tApiErrors = useTranslations("ApiErrors");
  const { settings } = useCompanySettings();
  const currencySymbol = settings.primaryCurrencySymbol;
  const { notification } = App.useApp();
  const access = useResourceAccess("accounting_reports");
  const router = useRouter();
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs | null, import("dayjs").Dayjs | null] | null} */ (null),
  );
  const [branchId, setBranchId] = useState(/** @type {number | undefined} */ (undefined));
  const [level, setLevel] = useState(/** @type {number | undefined} */ (undefined));
  const [compare, setCompare] = useState("none");
  const [exporting, setExporting] = useState(false);

  const { accessibleBranches, lockedBranchId, selectedBranchId, isPending: branchesPending, isFetched: branchesFetched } = useReportBranch(branchId);

  const params = useMemo(
    () => ({
      from: dateRange?.[0]?.format("YYYY-MM-DD"),
      to: dateRange?.[1]?.format("YYYY-MM-DD"),
      branch_id: selectedBranchId,
      level,
      compare: compare === "none" ? undefined : compare,
    }),
    [compare, dateRange, level, selectedBranchId],
  );

  const query = useQuery({
    queryKey: [...ACCOUNTING_REPORTS_QUERY_KEY, "income-statement", params],
    queryFn: () => fetchIncomeStatement(params),
    enabled: branchesFetched,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  const report = query.data && typeof query.data === "object" ? query.data : null;
  const comparing = report?.compare && report.compare !== "none";
  const pickerValue =
    dateRange ??
    (report?.period?.from && report?.period?.to
      ? [dayjs(report.period.from), dayjs(report.period.to)]
      : null);

  const rows = useMemo(
    () => flattenSections(Array.isArray(report?.sections) ? report.sections : [], (key) => t(`sections.${key}`), locale),
    [locale, report, t],
  );
  const unclassified = Array.isArray(report?.unclassified?.rows) ? report.unclassified.rows : [];

  const runExport = useCallback(
    async (/** @type {"xlsx" | "pdf"} */ format) => {
      if (exporting) return;
      setExporting(true);
      try {
        await downloadIncomeStatement({ ...params, format, locale: getLocaleFromPathname(window.location.pathname) });
      } catch (error) {
        notification.error({ title: t("exportError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
      } finally {
        setExporting(false);
      }
    },
    [exporting, notification, params, t, tApiErrors],
  );

  const openLedger = useCallback(
    (row) => {
      if (!row.account_id) return;
      const search = new URLSearchParams({ account: String(row.account_id) });
      const from = params.from || report?.period?.from;
      const to = params.to || report?.period?.to;
      if (from) search.set("from", from);
      if (to) search.set("to", to);
      const branch = report?.branch_id ?? selectedBranchId;
      if (branch) search.set("branch", String(branch));
      router.push(`${ROUTES.accountLedger}?${search.toString()}`);
    },
    [params.from, params.to, report, router, selectedBranchId],
  );

  const columns = useMemo(() => {
    /** @type {Array<Record<string, unknown>>} */
    const cols = [
      {
        title: t("colDescription"),
        dataIndex: "label",
        key: "label",
        render: (value, row) => (
          <span style={{ paddingInlineStart: row.kind === "account" ? Math.max(0, Number(row.depth) - 1) * 16 : 0 }}>
            {row.kind === "account" ? value : <strong>{value}</strong>}
          </span>
        ),
      },
      {
        title: t("colAmount"),
        dataIndex: "amount",
        key: "amount",
        width: 180,
        align: "right",
        render: (value, row) => (row.kind === "account" ? money(value, currencySymbol) : <strong>{money(value, currencySymbol)}</strong>),
      },
    ];
    if (comparing) {
      cols.push(
        {
          title: t("colCompare"),
          dataIndex: "compare_amount",
          key: "compare_amount",
          width: 180,
          align: "right",
          render: (value, row) => (row.kind === "account" ? money(value, currencySymbol) : <strong>{money(value, currencySymbol)}</strong>),
        },
        {
          title: t("colChange"),
          dataIndex: "change",
          key: "change",
          width: 180,
          align: "right",
          render: (value, row) => (row.kind === "account" ? money(value, currencySymbol) : <strong>{money(value, currencySymbol)}</strong>),
        },
      );
    }
    return cols;
  }, [comparing, currencySymbol, t]);

  const branchOptions = accessibleBranches
    .map((branch) => {
      const id = Number(branch.id);
      if (!Number.isFinite(id)) return null;
      return { value: id, label: String(branch.name ?? id) };
    })
    .filter(Boolean);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
        <DatePicker.RangePicker
          value={pickerValue}
          onChange={(range) => setDateRange(range ?? null)}
          allowEmpty={[true, true]}
          format={dayjsDatePattern()}
        />
        <Select
          className="min-w-40"
          allowClear={lockedBranchId == null}
          disabled={lockedBranchId != null}
          placeholder={t("branchAll")}
          value={selectedBranchId}
          onChange={(value) => setBranchId(value ?? undefined)}
          options={branchOptions}
          loading={branchesPending}
        />
        <Select
          className="w-40"
          value={level ?? 0}
          onChange={(value) => setLevel(value === 0 ? undefined : Number(value))}
          options={[
            { value: 0, label: t("levelPosting") },
            ...[1, 2, 3, 4].map((value) => ({ value, label: t("levelN", { level: value }) })),
          ]}
        />
        <Select
          className="w-48"
          value={compare}
          onChange={setCompare}
          options={[
            { value: "none", label: t("compareNone") },
            { value: "previous_period", label: t("comparePreviousPeriod") },
            { value: "previous_year", label: t("comparePreviousYear") },
          ]}
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
      {unclassified.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          title={t("unclassifiedWarning")}
          description={unclassified.map((row) => `${row.code} ${accountDisplayName(row, locale)}`).join(", ")}
        />
      ) : null}

      <Table
        size="small"
        rowKey="id"
        loading={query.isPending}
        columns={columns}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: t("reportEmpty") }}
        onRow={(row) => ({
          onClick: () => openLedger(row),
          style: { cursor: row.account_id ? "pointer" : "default" },
        })}
      />
    </div>
  );
}

export default function IncomeStatementPage() {
  return (
    <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Spin /></div>}>
      <IncomeStatementTable />
    </Suspense>
  );
}
