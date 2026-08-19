"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { useResourceAccess } from "@/lib/permissions";
import { App, Checkbox, Form, Select } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import StockAdjustmentDrawer from "../adjustment/StockAdjustmentDrawer";
import { stockFilterFieldRowClassName, useStockTableFilters } from "../shared/StockTableFilters";
import { getStockBalanceTableColumns } from "./getStockBalanceTableColumns";
import { useStockBalancesTableQuery } from "./useStockBalancesTableQuery";
import { fetchWarehouseNames } from "@/services/warehousesApi";
import { useQuery } from "@tanstack/react-query";

function StockBalancesTable() {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const access = useResourceAccess("stock");

  const [warehouseFilter, setWarehouseFilter] = useState(/** @type {number | undefined} */ (undefined));
  const [onlyWithStock, setOnlyWithStock] = useState(true);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentSeed, setAdjustmentSeed] = useState(
    /** @type {{ warehouseId?: number; itemId?: string }} */ ({}),
  );

  const { tableData: rawTableData, isPending, isFetching, refetch, pagination, onSearchChange } = useStockBalancesTableQuery({
    t,
    tApiErrors,
    notification,
    warehouseId: warehouseFilter,
    onlyWithStock,
  });

  const warehousesQuery = useQuery({
    queryKey: ["tenant", "warehouses"],
    queryFn: fetchWarehouseNames,
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

  const openAdjustment = useCallback((seed = {}) => {
    setAdjustmentSeed(seed);
    setAdjustmentOpen(true);
  }, []);

  const tableData = useMemo(
    () =>
      rawTableData.map((row) => ({
        ...row,
        item_code: row?.item?.item_code ?? "",
        item_name: row?.item?.name ?? "",
        warehouse_name: row?.warehouse?.name ?? "",
      })),
    [rawTableData],
  );

  const warehouseLabel = useMemo(() => {
    if (warehouseFilter == null) return null;
    return warehouseFilterOptions.find((o) => o.value === warehouseFilter)?.label ?? String(warehouseFilter);
  }, [warehouseFilter, warehouseFilterOptions]);

  const clearAllFilters = useCallback(() => {
    setWarehouseFilter(undefined);
    setOnlyWithStock(true);
  }, []);

  const filterSummary = useMemo(() => {
    /** @type {import("../shared/StockTableFilters").StockFilterSummaryLine[]} */
    const lines = [];
    if (warehouseLabel) lines.push({ label: t("filterWarehouse"), value: warehouseLabel });
    if (!onlyWithStock) {
      lines.push({ label: t("filterOnlyWithStock"), value: t("filterChipNo") });
    }
    return lines;
  }, [onlyWithStock, t, warehouseLabel]);

  const columns = useMemo(
    () =>
      getStockBalanceTableColumns(t, {
        onAdjust: access.canAdd
          ? (record) =>
              openAdjustment({
                warehouseId: record?.warehouse_id,
                itemId: record?.item_id != null ? String(record.item_id) : undefined,
              })
          : undefined,
      }),
    [t, access.canAdd, openAdjustment],
  );

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
        <Form.Item label={t("filterOnlyWithStock")} colon={false}>
          <Checkbox checked={onlyWithStock} onChange={(e) => setOnlyWithStock(e.target.checked)} />
        </Form.Item>
      </div>
    ),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="stock-balances"
        columns={columns}
        dataSource={tableData}
        rowKey={(row) => `${row.item_id}-${row.warehouse_id}`}
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("balancesEmpty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange,
          showRefresh: true,
          onRefresh: () => refetch(),
          showAdd: access.canAdd,
          onAdd: () => openAdjustment(),
          addLabel: t("toolbarAdjust"),
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={960}
        pagination={pagination}
      />
      <StockAdjustmentDrawer
        open={adjustmentOpen}
        onClose={() => setAdjustmentOpen(false)}
        initialWarehouseId={adjustmentSeed.warehouseId ?? null}
        initialItemId={adjustmentSeed.itemId ?? null}
      />
    </div>
  );
}

export default function StockBalancesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <StockBalancesTable />
    </div>
  );
}
