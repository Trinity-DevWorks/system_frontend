"use client";

import { fetchLeafCategories } from "@/features/categories/api/categories.api";
import { fetchWarehouseNames } from "@/features/warehouses/api/warehouses.api";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { getLocaleFromPathname } from "@/lib/locale-path";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { Alert, App, Select, Spin, Switch, Table } from "antd";
import TableExportMenu from "@/shared/components/tables/TableExportMenu";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { REPORTS_QUERY_KEY, downloadStockValuation, fetchStockValuation } from "../api/reports.api";

/**
 * @param {unknown} value
 * @param {string | null} symbol
 */
function money(value, symbol) {
  if (value == null || value === "") return "";
  return formatTenantMoneyWithSymbol(value, symbol);
}

function StockValuationTable() {
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

  const warehouseId = Number(searchParams.get("warehouse") ?? "") || undefined;
  const categoryId = Number(searchParams.get("category") ?? "") || undefined;
  const includeZero = searchParams.get("include_zero") === "1";

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
      warehouse_id: warehouseId,
      category_id: categoryId,
      include_zero: includeZero || undefined,
    }),
    [categoryId, includeZero, warehouseId],
  );

  const query = useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "stock-valuation", params],
    queryFn: () => fetchStockValuation(params),
    staleTime: QUERY_STALE_TIME.ledger,
  });
  const warehouses = useQuery({
    queryKey: ["tenant", "warehouses", "names"],
    queryFn: fetchWarehouseNames,
    staleTime: QUERY_STALE_TIME.catalog,
    retry: false,
  });
  const categories = useQuery({
    queryKey: ["tenant", "categories", "leaves"],
    queryFn: () => fetchLeafCategories(),
    staleTime: QUERY_STALE_TIME.catalog,
    retry: false,
  });

  const report = query.data && typeof query.data === "object" ? query.data : null;
  const rows = Array.isArray(report?.rows) ? report.rows : [];
  const check = report?.ledger_check;

  const runExport = useCallback(
    async (/** @type {"xlsx" | "pdf"} */ format) => {
      if (exporting) return;
      setExporting(true);
      try {
        await downloadStockValuation({ ...params, format, locale: getLocaleFromPathname(window.location.pathname) });
      } catch (error) {
        notification.error({ title: t("exportError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });
      } finally {
        setExporting(false);
      }
    },
    [exporting, notification, params, t, tApiErrors],
  );

  const columns = useMemo(
    () => [
      { title: t("itemCode"), dataIndex: "item_code", key: "item_code", width: 140 },
      { title: t("item"), dataIndex: "item_name", key: "item_name" },
      { title: t("warehouse"), dataIndex: "warehouse_name", key: "warehouse_name", width: 180 },
      { title: t("qty"), dataIndex: "quantity", key: "quantity", width: 120, align: "right" },
      { title: t("unitCost"), dataIndex: "unit_cost", key: "unit_cost", width: 140, align: "right", render: (value) => money(value, currencySymbol) },
      { title: t("value"), dataIndex: "inventory_value", key: "inventory_value", width: 150, align: "right", render: (value) => money(value, currencySymbol) },
    ],
    [currencySymbol, t],
  );

  const warehouseOptions = (Array.isArray(warehouses.data) ? warehouses.data : [])
    .filter((row) => row?.is_active !== false)
    .map((row) => ({ value: Number(row.id), label: String(row.name ?? row.id) }))
    .filter((option) => Number.isFinite(option.value));
  const categoryOptions = (Array.isArray(categories.data) ? categories.data : [])
    .map((row) => ({ value: Number(row.id), label: String(row.name ?? row.id) }))
    .filter((option) => Number.isFinite(option.value));
  const totals = report?.totals;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Select
            className="min-w-44"
            allowClear
            placeholder={t("warehouseAll")}
            value={warehouseId}
            onChange={(value) => setParams({ warehouse: value != null ? String(value) : undefined })}
            options={warehouseOptions}
            loading={warehouses.isPending}
          />
          <Select
            className="min-w-44"
            allowClear
            placeholder={t("categoryAll")}
            value={categoryId}
            onChange={(value) => setParams({ category: value != null ? String(value) : undefined })}
            options={categoryOptions}
            loading={categories.isPending}
          />
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={includeZero} onChange={(checked) => setParams({ include_zero: checked ? "1" : undefined })} />
            {t("includeZero")}
          </label>
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
        rowKey={(row) => `${row.item_id}-${row.warehouse_id}`}
        loading={query.isPending}
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 900 }}
        locale={{ emptyText: t("stockEmpty") }}
        summary={() => totals ? (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}><strong>{t("totals")}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><strong>{totals.lines}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><strong>{totals.quantity}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={4} />
              <Table.Summary.Cell index={5} align="right"><strong>{money(totals.inventory_value, currencySymbol)}</strong></Table.Summary.Cell>
            </Table.Summary.Row>
            {check ? (
              <>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5}>{t("inventoryAccount")}</Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">{money(check.ledger, currencySymbol)}</Table.Summary.Cell>
                </Table.Summary.Row>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5}>{t("allStock")}</Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">{money(check.stock, currencySymbol)}</Table.Summary.Cell>
                </Table.Summary.Row>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5}>{t("difference")}</Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">{money(check.difference, currencySymbol)}</Table.Summary.Cell>
                </Table.Summary.Row>
              </>
            ) : null}
          </Table.Summary>
        ) : null}
      />
    </div>
  );
}

export default function StockValuationPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Spin /></div>}>
        <StockValuationTable />
      </Suspense>
    </div>
  );
}
