"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { getLocaleFromPathname } from "@/lib/locale-path";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { ROUTES } from "@/features/registry";
import { useRouter } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { App, DatePicker, Select, Spin, Table } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { accountDisplayName } from "../accountingUtils";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { downloadTrialBalance, fetchTrialBalance } from "../api/accounting.api";
import { ACCOUNTING_REPORTS_QUERY_KEY } from "../queries/accountingQueryKeys";
import { useReportBranch } from "../useReportBranch";

/**
 * @param {unknown} value
 * @param {string | null} symbol
 */
function money(value, symbol) {
  return Number(value ?? 0) === 0 ? "" : formatTenantMoneyWithSymbol(value, symbol);
}

function TrialBalanceTable() {
  const t = useTranslations("Accounting");
  const locale = useLocale();
  const { settings } = useCompanySettings();
  const currencySymbol = settings.primaryCurrencySymbol;
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const access = useResourceAccess("accounting_reports");
  const router = useRouter();
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs | null, import("dayjs").Dayjs | null] | null} */ (null),
  );
  const [level, setLevel] = useState(/** @type {number | undefined} */ (undefined));
  const [branchId, setBranchId] = useState(/** @type {number | undefined} */ (undefined));
  const [exporting, setExporting] = useState(false);
  const { accessibleBranches, lockedBranchId, selectedBranchId, isPending: branchesPending, isFetched: branchesFetched } = useReportBranch(branchId);

  const params = useMemo(
    () => ({
      from: dateRange?.[0]?.format("YYYY-MM-DD"),
      to: dateRange?.[1]?.format("YYYY-MM-DD"),
      level,
      branch_id: selectedBranchId,
    }),
    [dateRange, level, selectedBranchId],
  );

  const query = useQuery({
    queryKey: [...ACCOUNTING_REPORTS_QUERY_KEY, "trial-balance", params],
    queryFn: () => fetchTrialBalance(params),
    enabled: branchesFetched,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  useEffect(() => {
    if (!query.isError) return;
    notification.error({ title: t("reportLoadError"), description: getLocalizedApiErrorMessage(tApiErrors, query.error) });
  }, [notification, query.error, query.isError, t, tApiErrors]);

  const runExport = useCallback(
    async (/** @type {"xlsx" | "pdf"} */ format) => {
      if (exporting) return;
      setExporting(true);
      try {
        await downloadTrialBalance({ ...params, format, locale: getLocaleFromPathname(window.location.pathname) });
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
      const search = new URLSearchParams({ account: String(row.account_id) });
      if (params.from) search.set("from", params.from);
      if (params.to) search.set("to", params.to);
      const branch = query.data?.branch_id ?? selectedBranchId;
      if (branch) search.set("branch", String(branch));
      router.push(`${ROUTES.accountLedger}?${search.toString()}`);
    },
    [params.from, params.to, query.data, router, selectedBranchId],
  );

  const showOpening = Boolean(params.from);
  const columns = useMemo(
    () => [
      { title: t("colCode"), dataIndex: "code", key: "code", width: 130, render: (value) => <span className="tabular-nums">{value}</span> },
      {
        title: t("colAccount"),
        dataIndex: "name",
        key: "name",
        ellipsis: true,
        render: (_value, row) => {
          const label = accountDisplayName(row, locale);
          return row.is_group ? <strong>{label}</strong> : label;
        },
      },
      ...(showOpening
        ? [
            { title: t("colOpeningDebit"), dataIndex: "opening_debit", key: "opening_debit", width: 160, align: "right", render: (value) => money(value, currencySymbol) },
            { title: t("colOpeningCredit"), dataIndex: "opening_credit", key: "opening_credit", width: 160, align: "right", render: (value) => money(value, currencySymbol) },
          ]
        : []),
      { title: t("colPeriodDebit"), dataIndex: "period_debit", key: "period_debit", width: 160, align: "right", render: (value) => money(value, currencySymbol) },
      { title: t("colPeriodCredit"), dataIndex: "period_credit", key: "period_credit", width: 160, align: "right", render: (value) => money(value, currencySymbol) },
      { title: t("colClosingDebit"), dataIndex: "closing_debit", key: "closing_debit", width: 160, align: "right", render: (value) => money(value, currencySymbol) },
      { title: t("colClosingCredit"), dataIndex: "closing_credit", key: "closing_credit", width: 160, align: "right", render: (value) => money(value, currencySymbol) },
    ],
    [currencySymbol, locale, showOpening, t],
  );

  const totals = query.data?.totals ?? null;
  const amountKeys = [
    ...(showOpening ? ["opening_debit", "opening_credit"] : []),
    "period_debit",
    "period_credit",
    "closing_debit",
    "closing_credit",
  ];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="trial-balance"
        columns={columns}
        dataSource={query.data?.rows ?? []}
        rowKey="account_id"
        loading={query.isPending}
        refreshFetching={query.isFetching}
        onRetry={() => query.refetch()}
        emptyText={t("reportEmpty")}
        onRow={(row) => ({ onClick: () => openLedger(row), style: { cursor: "pointer" } })}
        toolbar={{
          showSearch: true,
          searchKeys: ["code", "name"],
          showImportExcel: false,
          showExportExcel: access.canExport,
          showExportPdf: access.canExport,
          onExportExcel: () => runExport("xlsx"),
          onExportPdf: () => runExport("pdf"),
          showRefresh: true,
          onRefresh: () => query.refetch(),
          extra: (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <DatePicker.RangePicker
                value={dateRange}
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
                options={accessibleBranches
                  .map((branch) => {
                    const id = Number(branch.id);
                    if (!Number.isFinite(id)) return null;
                    return { value: id, label: String(branch.name ?? id) };
                  })
                  .filter(Boolean)}
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
            </div>
          ),
          belowTable: totals ? (
            <Table
              size="small"
              showHeader={false}
              pagination={false}
              tableLayout="fixed"
              rowKey="key"
              dataSource={[{ key: "totals", ...totals }]}
              columns={[
                { key: "label", width: 130, render: () => <strong>{t("totals")}</strong> },
                { key: "spacer" },
                ...amountKeys.map((key) => ({
                  key,
                  dataIndex: key,
                  width: 160,
                  align: /** @type {const} */ ("right"),
                  render: (value) => <strong className="tabular-nums">{formatTenantMoneyWithSymbol(value, currencySymbol)}</strong>,
                })),
              ]}
            />
          ) : null,
        }}
        stickyHeader
        scrollX={showOpening ? 1260 : 940}
      />
    </div>
  );
}

export default function TrialBalancePage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <TrialBalanceTable />
      </Suspense>
    </div>
  );
}
