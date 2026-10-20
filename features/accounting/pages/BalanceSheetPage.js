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
import { Alert, App, Button, DatePicker, Select, Spin, Table, Typography } from "antd";
import TableExportMenu from "@/shared/components/tables/TableExportMenu";
import dayjs from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import { accountDisplayName } from "../accountingUtils";
import { Suspense, useCallback, useMemo, useState } from "react";
import { downloadBalanceSheet, fetchBalanceSheet } from "../api/accounting.api";
import { ACCOUNTING_REPORTS_QUERY_KEY } from "../queries/accountingQueryKeys";

/**
 * @param {unknown} value
 * @param {string | null} symbol
 */
function money(value, symbol) {
  if (value == null || value === "") return "";
  return formatTenantMoneyWithSymbol(value, symbol);
}

function isOff(value) {
  if (value == null || value === "") return false;
  return Math.abs(Number(value)) > 0.00005;
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

function BalanceSheetTable() {
  const t = useTranslations("FinancialReports");
  const locale = useLocale();
  const tApiErrors = useTranslations("ApiErrors");
  const { settings } = useCompanySettings();
  const currencySymbol = settings.primaryCurrencySymbol;
  const { notification } = App.useApp();
  const access = useResourceAccess("accounting_reports");
  const router = useRouter();
  const [asOf, setAsOf] = useState(/** @type {import("dayjs").Dayjs | null} */ (null));
  const [compareAsOf, setCompareAsOf] = useState(/** @type {import("dayjs").Dayjs | null} */ (null));
  const [level, setLevel] = useState(/** @type {number | undefined} */ (undefined));
  const [exporting, setExporting] = useState(false);

  const params = useMemo(
    () => ({
      as_of: asOf?.format("YYYY-MM-DD"),
      compare_as_of: compareAsOf?.format("YYYY-MM-DD"),
      level,
    }),
    [asOf, compareAsOf, level],
  );

  const query = useQuery({
    queryKey: [...ACCOUNTING_REPORTS_QUERY_KEY, "balance-sheet", params],
    queryFn: () => fetchBalanceSheet(params),
    staleTime: QUERY_STALE_TIME.ledger,
  });

  const report = query.data && typeof query.data === "object" ? query.data : null;
  const comparing = Boolean(report?.compare_as_of);
  const asOfValue = asOf ?? (report?.as_of ? dayjs(report.as_of) : null);
  const unclassified = Array.isArray(report?.unclassified?.rows) ? report.unclassified.rows : [];

  const runExport = useCallback(
    async (/** @type {"xlsx" | "pdf"} */ format) => {
      if (exporting) return;
      setExporting(true);
      try {
        await downloadBalanceSheet({ ...params, format, locale: getLocaleFromPathname(window.location.pathname) });
      } catch (error) {
        notification.error({ title: t("exportError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
      } finally {
        setExporting(false);
      }
    },
    [exporting, notification, params, t, tApiErrors],
  );

  const openLedger = useCallback(
    (accountId) => {
      if (!accountId) return;
      const search = new URLSearchParams({ account: String(accountId) });
      const to = params.as_of || report?.as_of;
      if (to) search.set("to", to);
      router.push(`${ROUTES.accountLedger}?${search.toString()}`);
    },
    [params.as_of, report, router],
  );

  const columns = useMemo(() => {
    /** @type {Array<Record<string, unknown>>} */
    const cols = [
      {
        title: t("colDescription"),
        dataIndex: "label",
        key: "label",
        render: (value, row) => (
          <span style={{ paddingInlineStart: row.kind === "account" || row.kind === "computed" ? Math.max(0, Number(row.depth ?? 1) - 1) * 16 : 0 }}>
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
      cols.push({
        title: t("colCompare"),
        dataIndex: "compare_amount",
        key: "compare_amount",
        width: 180,
        align: "right",
        render: (value, row) => (row.kind === "account" ? money(value, currencySymbol) : <strong>{money(value, currencySymbol)}</strong>),
      });
    }
    return cols;
  }, [comparing, currencySymbol, t]);

  const checks = report?.checks ?? {};
  const warnings = [];
  if (checks.inventory && isOff(checks.inventory.difference)) {
    warnings.push({ key: "inventory", accountId: checks.inventory.account_id, text: t("inventoryCheck", { difference: money(checks.inventory.difference, currencySymbol) }) });
  }
  if (checks.receivables && isOff(checks.receivables.difference)) {
    warnings.push({ key: "receivables", accountId: checks.receivables.account_id, text: t("receivablesCheck", { difference: money(checks.receivables.difference, currencySymbol) }) });
  }
  if (checks.payables && isOff(checks.payables.difference)) {
    warnings.push({ key: "payables", accountId: checks.payables.account_id, text: t("payablesCheck", { difference: money(checks.payables.difference, currencySymbol) }) });
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
        <DatePicker value={asOfValue} onChange={(value) => setAsOf(value)} format={dayjsDatePattern()} placeholder={t("asOf")} />
        <DatePicker value={compareAsOf} onChange={(value) => setCompareAsOf(value)} format={dayjsDatePattern()} placeholder={t("compareAsOf")} allowClear />
        <Select
          className="w-40"
          value={level ?? 0}
          onChange={(value) => setLevel(value === 0 ? undefined : Number(value))}
          options={[
            { value: 0, label: t("levelPosting") },
            ...[1, 2, 3, 4].map((value) => ({ value, label: t("levelN", { level: value }) })),
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
      {report && isOff(report.difference) ? (
        <Alert type="error" showIcon title={t("differenceBanner", { difference: money(report.difference, currencySymbol) })} />
      ) : null}
      {warnings.map((warning) => (
        <Alert
          key={warning.key}
          type="warning"
          showIcon
          title={warning.text}
          action={<Button size="small" onClick={() => openLedger(warning.accountId)}>{t("openLedger")}</Button>}
        />
      ))}
      {unclassified.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          title={t("unclassifiedWarning")}
          description={unclassified.map((row) => `${row.code} ${accountDisplayName(row, locale)}`).join(", ")}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <SideBlock
          title={t("assets")}
          total={report?.total_assets}
          compareTotal={report?.compare_total_assets}
          comparing={comparing}
          rows={flattenSections(report?.assets?.sections ?? [], (key) => t(`sections.${key}`), locale)}
          columns={columns}
          currencySymbol={currencySymbol}
          loading={query.isPending}
          emptyText={t("reportEmpty")}
          totalLabel={t("totalAssets")}
          onRow={openLedger}
        />
        <SideBlock
          title={t("equityAndLiabilities")}
          total={report?.total_equity_and_liabilities}
          compareTotal={report?.compare_total_equity_and_liabilities}
          comparing={comparing}
          rows={flattenSections(report?.equity_and_liabilities?.sections ?? [], (key) => t(`sections.${key}`), locale)}
          columns={columns}
          currencySymbol={currencySymbol}
          loading={query.isPending}
          emptyText={t("reportEmpty")}
          totalLabel={t("totalEquityAndLiabilities")}
          onRow={openLedger}
        />
      </div>
    </div>
  );
}

function SideBlock({ title, total, compareTotal, comparing, rows, columns, currencySymbol, loading, emptyText, totalLabel, onRow }) {
  return (
    <div className="min-w-0">
      <Typography.Title level={5} className="!mb-2">{title}</Typography.Title>
      <Table
        size="small"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText }}
        onRow={(row) => ({
          onClick: () => onRow(row.account_id),
          style: { cursor: row.account_id ? "pointer" : "default" },
        })}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}><strong>{totalLabel}</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><strong>{money(total, currencySymbol)}</strong></Table.Summary.Cell>
            {comparing ? <Table.Summary.Cell index={2} align="right"><strong>{money(compareTotal, currencySymbol)}</strong></Table.Summary.Cell> : null}
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}

export default function BalanceSheetPage() {
  return (
    <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Spin /></div>}>
      <BalanceSheetTable />
    </Suspense>
  );
}
