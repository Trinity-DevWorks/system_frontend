"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { getLocaleFromPathname } from "@/lib/locale-path";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern, formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { App, DatePicker, Select, Spin, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { downloadAccountLedger, fetchAccountLedger, fetchAccounts } from "../api/accounting.api";
import { SOURCE_DOCUMENT_FEATURE, accountLabel } from "../accountingUtils";
import { ACCOUNTING_REPORTS_QUERY_KEY, ACCOUNTS_QUERY_KEY } from "../queries/accountingQueryKeys";

/** @param {string | null} value */
function parseDate(value) {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

function AccountLedgerTable() {
  const t = useTranslations("Accounting");
  const { settings } = useCompanySettings();
  const currencySymbol = settings.primaryCurrencySymbol;
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const access = useResourceAccess("accounting_reports");
  const { openDrawer } = useGlobalDrawer();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const accountId = Number(searchParams.get("account") ?? "") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const [exporting, setExporting] = useState(false);

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

  const accountsQuery = useQuery({
    queryKey: [...ACCOUNTS_QUERY_KEY, "all"],
    queryFn: () => fetchAccounts(),
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const accountOptions = useMemo(
    () => (accountsQuery.data ?? []).map((account) => ({ value: Number(account.id), label: accountLabel(account) })),
    [accountsQuery.data],
  );

  const params = useMemo(() => ({ account_id: /** @type {number} */ (accountId), from, to }), [accountId, from, to]);
  const ledgerQuery = useQuery({
    queryKey: [...ACCOUNTING_REPORTS_QUERY_KEY, "account-ledger", params],
    queryFn: () => fetchAccountLedger(params),
    enabled: accountId != null,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  useEffect(() => {
    if (!ledgerQuery.isError) return;
    notification.error({ title: t("reportLoadError"), description: getLocalizedApiErrorMessage(tApiErrors, ledgerQuery.error) });
  }, [ledgerQuery.error, ledgerQuery.isError, notification, t, tApiErrors]);

  const runExport = useCallback(
    async (/** @type {"xlsx" | "pdf"} */ format) => {
      if (!accountId) {
        notification.warning({ title: t("ledgerChooseAccount") });
        return;
      }
      if (exporting) return;
      setExporting(true);
      try {
        await downloadAccountLedger({ ...params, format, locale: getLocaleFromPathname(window.location.pathname) });
      } catch (error) {
        notification.error({ title: t("exportError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
      } finally {
        setExporting(false);
      }
    },
    [accountId, exporting, notification, params, t, tApiErrors],
  );

  const showAccount = Boolean(ledgerQuery.data?.account?.is_group);
  const columns = useMemo(
    () => [
      { title: t("colDate"), dataIndex: "entry_date", key: "entry_date", width: 120, render: (value) => formatTenantDate(value) || "\u2014" },
      {
        title: t("colEntryNumber"),
        dataIndex: "entry_number",
        key: "entry_number",
        width: 130,
        render: (value, row) => (
          <Typography.Link
            onClick={(e) => {
              e.stopPropagation();
              openDrawer({ featureId: "journalEntries", id: String(row.journal_entry_id), mode: "view" });
            }}
          >
            {value}
          </Typography.Link>
        ),
      },
      {
        title: t("colSource"),
        dataIndex: "source_type",
        key: "source_type",
        width: 220,
        render: (value, row) => {
          const featureId = SOURCE_DOCUMENT_FEATURE[String(value)];
          return (
            <span>
              {t(`source_${value}`)}{" "}
              {featureId && row.source_id && row.source_number ? (
                <Typography.Link
                  onClick={(e) => {
                    e.stopPropagation();
                    openDrawer({ featureId, id: String(row.source_id), mode: "view" });
                  }}
                >
                  {row.source_number}
                </Typography.Link>
              ) : (
                (row.source_number ?? "")
              )}
            </span>
          );
        },
      },
      ...(showAccount
        ? [{ title: t("colAccount"), dataIndex: "account_code", key: "account_code", width: 200, ellipsis: true, render: (value, row) => `${value} ${row.account_name ?? ""}` }]
        : []),
      { title: t("colDescription"), dataIndex: "description", key: "description", ellipsis: true },
      { title: t("colParty"), dataIndex: "party_name", key: "party_name", width: 170, ellipsis: true, render: (value) => value || "\u2014" },
      { title: t("colDebit"), dataIndex: "debit", key: "debit", width: 160, align: "right", render: (value) => (Number(value) ? formatTenantMoneyWithSymbol(value, currencySymbol) : "") },
      { title: t("colCredit"), dataIndex: "credit", key: "credit", width: 160, align: "right", render: (value) => (Number(value) ? formatTenantMoneyWithSymbol(value, currencySymbol) : "") },
      { title: t("colBalance"), dataIndex: "balance", key: "balance", width: 170, align: "right", render: (value) => formatTenantMoneyWithSymbol(value, currencySymbol) },
    ],
    [currencySymbol, openDrawer, showAccount, t],
  );

  const ledger = ledgerQuery.data;
  const dateRange = /** @type {[import("dayjs").Dayjs | null, import("dayjs").Dayjs | null] | null} */ (
    from || to ? [parseDate(from ?? null), parseDate(to ?? null)] : null
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="account-ledger"
        columns={columns}
        dataSource={accountId ? (ledger?.lines ?? []) : []}
        rowKey="id"
        loading={accountId != null && ledgerQuery.isPending}
        refreshFetching={ledgerQuery.isFetching}
        onRetry={() => ledgerQuery.refetch()}
        emptyText={accountId ? t("reportEmpty") : t("ledgerChooseAccount")}
        toolbar={{
          showSearch: false,
          showImportExcel: false,
          showExportExcel: access.canExport,
          showExportPdf: access.canExport,
          onExportExcel: () => runExport("xlsx"),
          onExportPdf: () => runExport("pdf"),
          showRefresh: true,
          refreshDisabled: !accountId,
          onRefresh: () => ledgerQuery.refetch(),
          extra: (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <Select
                className="w-72"
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder={t("ledgerAccountPlaceholder")}
                options={accountOptions}
                loading={accountsQuery.isPending}
                value={accountId}
                onChange={(value) => setParams({ account: value ? String(value) : undefined })}
              />
              <DatePicker.RangePicker
                value={dateRange}
                allowEmpty={[true, true]}
                format={dayjsDatePattern()}
                onChange={(range) =>
                  setParams({
                    from: range?.[0]?.format("YYYY-MM-DD"),
                    to: range?.[1]?.format("YYYY-MM-DD"),
                  })
                }
              />
            </div>
          ),
          belowTable: ledger ? (
            <div className="grid grid-cols-2 gap-3 rounded-md border border-neutral-200 px-3 py-2 md:grid-cols-4 dark:border-neutral-700">
              <SummaryTile label={t("openingBalance")} value={ledger.opening_balance} symbol={currencySymbol} />
              <SummaryTile label={t("periodDebit")} value={ledger.period_debit} symbol={currencySymbol} />
              <SummaryTile label={t("periodCredit")} value={ledger.period_credit} symbol={currencySymbol} />
              <SummaryTile label={t("closingBalance")} value={ledger.closing_balance} symbol={currencySymbol} />
            </div>
          ) : null,
        }}
        stickyHeader
        scrollX={showAccount ? 1390 : 1190}
      />
    </div>
  );
}

/** @param {{ label: string; value: unknown; symbol: string | null }} props */
function SummaryTile({ label, value, symbol }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-sm font-medium tabular-nums">{formatTenantMoneyWithSymbol(value ?? 0, symbol)}</div>
    </div>
  );
}

export default function AccountLedgerPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <AccountLedgerTable />
      </Suspense>
    </div>
  );
}
