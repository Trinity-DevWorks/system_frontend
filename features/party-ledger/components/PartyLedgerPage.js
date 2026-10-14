"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { CURRENCIES_LIST_QUERY_KEY, fetchCurrencyNames } from "@/features/currencies";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { getLocaleFromPathname } from "@/lib/locale-path";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import ServerSearchSelect from "@/shared/components/selects/ServerSearchSelect";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import {
  formatStockFilterDateRange,
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "@/features/stock/components/StockTableFilters/StockTableFilters";
import { useQuery } from "@tanstack/react-query";
import { App, DatePicker, Form, Select, Spin } from "antd";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { downloadPartyLedger } from "../api/partyLedger.api";
import { usePartyLedgerQuery } from "../queries/usePartyLedgerQuery";
import { formatLedgerAmount, getPartyLedgerColumns } from "./getPartyLedgerColumns";

/**
 * @param {{
 *   i18n: string;
 *   selectorI18n: string;
 *   tableId: string;
 *   queryKey: readonly unknown[];
 *   partyQueryKey: readonly unknown[];
 *   fetchPartyPage: (args: { search?: string; page?: number }) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
 *   partyQueryParams?: Record<string, string | number | boolean | undefined>;
 *   partyRecentKind: string;
 *   partyPlaceholderKey: string;
 *   partyQueryParam: string;
 *   fetchPartyOption: (id: string) => Promise<Record<string, unknown> | null>;
 *   endpointFor: (partyId: string) => string;
 *   exportEndpointFor: (partyId: string) => string;
 *   typeLabelKey: Record<string, string>;
 *   documentFeature: Record<string, string>;
 * }} config
 */
function PartyLedgerTable({ config }) {
  const t = useTranslations(config.i18n);
  const tSelector = useTranslations(config.selectorI18n);
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const { openDrawer } = useGlobalDrawer();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const partyFromUrl = searchParams.get(config.partyQueryParam)?.trim() || undefined;

  const [partyId, setPartyId] = useState(partyFromUrl);
  const [seenPartyFromUrl, setSeenPartyFromUrl] = useState(partyFromUrl);
  if (seenPartyFromUrl !== partyFromUrl) {
    setSeenPartyFromUrl(partyFromUrl);
    setPartyId(partyFromUrl);
  }
  const [currencyId, setCurrencyId] = useState(/** @type {number | undefined} */ (undefined));
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs | null, import("dayjs").Dayjs | null] | null} */ (null),
  );

  const dateFrom = dateRange?.[0]?.format("YYYY-MM-DD");
  const dateTo = dateRange?.[1]?.format("YYYY-MM-DD");
  const ready = Boolean(partyId);
  const [exporting, setExporting] = useState(false);

  const selectParty = useCallback(
    (nextId) => {
      const id = nextId ? String(nextId) : undefined;
      setPartyId(id);
      if (id === partyFromUrl) return;
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set(config.partyQueryParam, id);
      else params.delete(config.partyQueryParam);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [partyFromUrl, searchParams, config.partyQueryParam, router, pathname],
  );

  const partySeedQuery = useQuery({
    queryKey: [...config.partyQueryKey, "ledger-party", partyId ?? "none"],
    queryFn: () => config.fetchPartyOption(/** @type {string} */ (partyId)),
    enabled: Boolean(partyId),
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const partySeedOptions = partySeedQuery.data ? [partySeedQuery.data] : [];

  const exportStatement = useCallback(
    async (format) => {
      if (!partyId) {
        notification.warning({ title: t("emptyChoose") });
        return;
      }
      if (exporting) return;
      setExporting(true);
      try {
        await downloadPartyLedger(config.exportEndpointFor(partyId), {
          format,
          locale: getLocaleFromPathname(window.location.pathname),
          currency_id: currencyId,
          date_from: dateFrom,
          date_to: dateTo,
        });
      } catch (error) {
        notification.error({
          title: t("exportError"),
          description: getLocalizedApiErrorMessage(tApiErrors, error),
        });
      } finally {
        setExporting(false);
      }
    },
    [partyId, exporting, config, currencyId, dateFrom, dateTo, notification, t, tApiErrors],
  );

  const currenciesQuery = useQuery({
    queryKey: CURRENCIES_LIST_QUERY_KEY,
    queryFn: fetchCurrencyNames,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const { rows, summaries, isPending, isFetching, refetch, pagination } = usePartyLedgerQuery({
    queryKey: config.queryKey,
    endpoint: partyId ? config.endpointFor(partyId) : null,
    tableId: config.tableId,
    currencyId,
    dateFrom,
    dateTo,
    enabled: ready,
    t,
    tApiErrors,
    notification,
  });

  const openDocument = useCallback(
    (record) => {
      const featureId = config.documentFeature[String(record.reference_type ?? "")];
      const id = record.reference_id;
      if (!featureId || id == null || id === "") return;
      openDrawer({ featureId, id: String(id), mode: "view" });
    },
    [config.documentFeature, openDrawer],
  );

  const columns = useMemo(
    () =>
      getPartyLedgerColumns(t, {
        typeLabelKey: config.typeLabelKey,
        showCurrency: !currencyId,
        onOpen: openDocument,
      }),
    [t, config.typeLabelKey, currencyId, openDocument],
  );

  const currencyOptions = useMemo(
    () =>
      (currenciesQuery.data ?? []).map((currency) => ({
        value: Number(currency.id),
        label: String(currency.code ?? currency.name ?? currency.id),
      })),
    [currenciesQuery.data],
  );

  const dateRangeLabel = formatStockFilterDateRange(dateRange?.[0], dateRange?.[1]);
  const currencyLabel = currencyOptions.find((row) => row.value === currencyId)?.label;
  const filterSummary = [
    currencyId != null && currencyLabel ? { label: t("filterCurrency"), value: String(currencyLabel) } : null,
    dateRangeLabel ? { label: t("filterDateRange"), value: dateRangeLabel } : null,
  ].filter(Boolean);

  const { toggle: filterToggle, filterBar } = useStockTableFilters({
    activeCount: filterSummary.length,
    summary: /** @type {{ label: string; value: string }[]} */ (filterSummary),
    onClearAll: () => {
      setCurrencyId(undefined);
      setDateRange(null);
    },
    children: (
      <div className={stockFilterFieldRowClassName}>
        <Form.Item label={t("filterCurrency")}>
          <Select
            showSearch
            allowClear
            optionFilterProp="label"
            className="w-full"
            placeholder={t("filterAllCurrencies")}
            value={currencyId}
            options={currencyOptions}
            loading={currenciesQuery.isPending}
            onChange={(value) => setCurrencyId(value == null ? undefined : Number(value))}
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
        tableId={config.tableId}
        columns={columns}
        dataSource={ready ? rows : []}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={ready ? t("empty") : t("emptyChoose")}
        onRow={(record) => {
          const featureId = config.documentFeature[String(record?.reference_type ?? "")];
          if (!featureId || record?.reference_id == null) return {};
          return {
            onClick: () => openDocument(record),
            style: { cursor: "pointer" },
          };
        }}
        toolbar={{
          showSearch: false,
          showImportExcel: false,
          showExportExcel: true,
          showExportPdf: true,
          onExportExcel: () => exportStatement("xlsx"),
          onExportPdf: () => exportStatement("pdf"),
          showRefresh: true,
          refreshDisabled: !ready,
          onRefresh: () => refetch(),
          extra: (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <label className="flex items-center gap-2">
                <span className="shrink-0 text-sm">{t("filterParty")}</span>
                <ServerSearchSelect
                  className="w-52"
                  allowClear
                  placeholder={tSelector(config.partyPlaceholderKey)}
                  value={partyId}
                  onChange={(value) => selectParty(value ? String(value) : undefined)}
                  fetchPage={config.fetchPartyPage}
                  queryKey={config.partyQueryKey}
                  queryParams={config.partyQueryParams}
                  recentKind={config.partyRecentKind}
                  seedOptions={partySeedOptions}
                  recentLabel={tSelector("selectorRecent")}
                  clearRecentLabel={tSelector("selectorClearRecent")}
                  resultsLabel={tSelector("selectorResults")}
                  loadMoreLabel={tSelector("selectorLoadMore")}
                  emptyLabel={tSelector("selectorEmpty")}
                  typeToSearchLabel={tSelector("selectorTypeToSearch")}
                />
              </label>
              {filterToggle}
            </div>
          ),
          filterBar,
          belowTable:
            ready && summaries.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {summaries.map((row) => (
                  <div
                    key={String(row.currency_id)}
                    className="flex min-w-0 items-center gap-3 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-700"
                  >
                    <div className="shrink-0 text-sm font-medium">{row.currency_code || row.currency_id}</div>
                    <div className="grid min-w-0 flex-1 grid-cols-4 gap-x-3">
                      <SummaryTile label={t("openingBalance")} value={row.opening_balance} symbol={row.currency_symbol} />
                      <SummaryTile label={t("periodDebit")} value={row.period_debit} symbol={row.currency_symbol} />
                      <SummaryTile label={t("periodCredit")} value={row.period_credit} symbol={row.currency_symbol} />
                      <SummaryTile label={t("closingBalance")} value={row.closing_balance} symbol={row.currency_symbol} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null,
        }}
        stickyHeader
        scrollX={currencyId ? 980 : 1100}
        pagination={pagination}
      />
    </div>
  );
}

/**
 * @param {{ label: string; value: unknown; symbol?: unknown }} props
 */
function SummaryTile({ label, value, symbol }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-sm font-medium tabular-nums">{formatLedgerAmount(value, symbol)}</div>
    </div>
  );
}

/**
 * @param {{ config: Parameters<typeof PartyLedgerTable>[0]["config"] }} props
 */
export default function PartyLedgerPage({ config }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <PartyLedgerTable config={config} />
      </Suspense>
    </div>
  );
}
