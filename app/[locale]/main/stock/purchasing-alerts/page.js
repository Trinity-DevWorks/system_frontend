"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { App, Checkbox, Form, Select } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { stockFilterFieldRowClassName, useStockTableFilters } from "../shared/StockTableFilters";
import { getPurchasingAlertTableColumns } from "./getPurchasingAlertTableColumns";
import { usePurchasingAlertsTableQuery } from "./usePurchasingAlertsTableQuery";
import { fetchWarehouses } from "@/services/warehousesApi";
import { useQuery } from "@tanstack/react-query";

const ALERT_STATUS_OPTIONS = ["out_of_stock", "below_safety", "below_reorder", "ok"];

function PurchasingAlertsTable() {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();

  const [warehouseFilter, setWarehouseFilter] = useState(/** @type {number | undefined} */ (undefined));
  const [statusFilter, setStatusFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [onlyAlerts, setOnlyAlerts] = useState(true);

  const { tableData: rawTableData, isPending, isFetching, refetch } = usePurchasingAlertsTableQuery({
    t,
    tApiErrors,
    notification,
    warehouseId: warehouseFilter,
    status: statusFilter,
    onlyAlerts,
  });

  const warehousesQuery = useQuery({
    queryKey: ["tenant", "warehouses"],
    queryFn: fetchWarehouses,
    staleTime: 5 * 60_000,
  });

  const warehouseFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllWarehouses") },
      ...(warehousesQuery.data ?? []).map((w) => ({
        value: w.id,
        label:
          typeof w.shortcut_name === "string" && w.shortcut_name.trim()
            ? `${w.shortcut_name} — ${w.name}`
            : String(w.name ?? w.id),
      })),
    ],
    [warehousesQuery.data, t],
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllStatuses") },
      ...ALERT_STATUS_OPTIONS.map((status) => ({
        value: status,
        label: t(`alertStatus_${status}`),
      })),
    ],
    [t],
  );

  const tableData = useMemo(
    () =>
      rawTableData.map((row) => ({
        ...row,
        item_sku: row?.item?.sku ?? "",
        item_name: row?.item?.name ?? "",
        warehouse_name: row?.warehouse?.name ?? "",
      })),
    [rawTableData],
  );

  const warehouseLabel = useMemo(() => {
    if (warehouseFilter == null) return null;
    return warehouseFilterOptions.find((o) => o.value === warehouseFilter)?.label ?? String(warehouseFilter);
  }, [warehouseFilter, warehouseFilterOptions]);

  const statusLabel = useMemo(() => {
    if (!statusFilter) return null;
    return t(`alertStatus_${statusFilter}`);
  }, [statusFilter, t]);

  const clearAllFilters = useCallback(() => {
    setWarehouseFilter(undefined);
    setStatusFilter(undefined);
    setOnlyAlerts(true);
  }, []);

  const filterSummary = useMemo(() => {
    /** @type {import("../shared/StockTableFilters").StockFilterSummaryLine[]} */
    const lines = [];
    if (warehouseLabel) lines.push({ label: t("filterWarehouse"), value: warehouseLabel });
    if (statusLabel) lines.push({ label: t("filterAlertStatus"), value: statusLabel });
    if (!onlyAlerts) {
      lines.push({ label: t("filterOnlyAlerts"), value: t("filterChipNo") });
    }
    return lines;
  }, [onlyAlerts, statusLabel, t, warehouseLabel]);

  const columns = useMemo(() => getPurchasingAlertTableColumns(t), [t]);

  const { toggle: filterToggle, filterBar } = useStockTableFilters({
    activeCount: filterSummary.length,
    summary: filterSummary,
    onClearAll: clearAllFilters,
    children: (
      <div className={stockFilterFieldRowClassName}>
        <Form.Item label={t("filterWarehouse")}>
          <Select
            className="w-full"
            value={warehouseFilter ?? ""}
            options={warehouseFilterOptions}
            loading={warehousesQuery.isPending}
            onChange={(v) => setWarehouseFilter(v === "" ? undefined : Number(v))}
          />
        </Form.Item>
        <Form.Item label={t("filterAlertStatus")}>
          <Select
            className="w-full"
            value={statusFilter ?? ""}
            options={statusFilterOptions}
            onChange={(v) => setStatusFilter(v === "" ? undefined : String(v))}
          />
        </Form.Item>
        <Form.Item label={t("filterOnlyAlerts")} colon={false}>
          <Checkbox checked={onlyAlerts} onChange={(e) => setOnlyAlerts(e.target.checked)} />
        </Form.Item>
      </div>
    ),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="purchasing-alerts"
        columns={columns}
        dataSource={tableData}
        rowKey={(row) => `${row.item_id}-${row.warehouse_id}`}
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("purchasingAlertsEmpty")}
        toolbar={{
          showSearch: true,
          searchKeys: ["item_sku", "item_name", "warehouse_name"],
          enableClientSearch: true,
          showRefresh: true,
          onRefresh: () => refetch(),
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1280}
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />
    </div>
  );
}

export default function PurchasingAlertsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <PurchasingAlertsTable />
    </div>
  );
}
