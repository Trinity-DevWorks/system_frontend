"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { useResourceAccess } from "@/lib/permissions";
import { normalizeEntityId } from "@/lib/entityId";
import { App, Checkbox, Form, Select } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import StockAdjustmentDocumentDrawer from "../components/StockAdjustmentDocumentDrawer/StockAdjustmentDocumentDrawer";
import { stockFilterFieldRowClassName, useStockTableFilters } from "../components/StockTableFilters/StockTableFilters";
import { getStockBalanceTableColumns } from "../components/StockBalancesTable/getStockBalanceTableColumns";
import { useStockBalancesTableQuery } from "../queries/useStockBalancesTableQuery";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { useQuery } from "@tanstack/react-query";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";

function StockBalancesTable() {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const access = useResourceAccess("stock");

  const [warehouseFilter, setWarehouseFilter] = useState(/** @type {number | undefined} */ (undefined));
  const [onlyWithStock, setOnlyWithStock] = useState(true);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentMode, setAdjustmentMode] = useState(/** @type {"create" | "edit" | "view"} */ ("create"));
  const [adjustmentId, setAdjustmentId] = useState(/** @type {string | null} */ (null));
  const [adjustmentSeed, setAdjustmentSeed] = useState(
    /** @type {import("../utils/stockAdjustmentDrawerUtils").AdjCreateSeed | null} */ (null),
  );

  const { tableData: rawTableData, isPending, isFetching, refetch, pagination, onSearchChange } = useStockBalancesTableQuery({
    t,
    tApiErrors,
    notification,
    warehouseId: warehouseFilter,
    onlyWithStock,
  });

  const warehousesQuery = useQuery({
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouseNames,
    staleTime: QUERY_STALE_TIME.catalog,
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

  const openAdjustment = useCallback((seed = null) => {
    setAdjustmentSeed(seed);
    setAdjustmentId(null);
    setAdjustmentMode("create");
    setAdjustmentOpen(true);
  }, []);

  const closeAdjustment = useCallback(() => {
    setAdjustmentOpen(false);
    setAdjustmentId(null);
    setAdjustmentSeed(null);
    setAdjustmentMode("create");
  }, []);

  const handleAdjustmentCreated = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    setAdjustmentId(id);
    setAdjustmentMode("edit");
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
    /** @type {import("../components/StockTableFilters/StockTableFilters").StockFilterSummaryLine[]} */
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
                warehouse_id: record?.warehouse_id != null ? Number(record.warehouse_id) : undefined,
                item_id: record?.item_id != null ? String(record.item_id) : undefined,
                item_label: typeof record?.item?.name === "string" ? record.item.name : undefined,
                lot_id: record?.lot_id != null ? Number(record.lot_id) : undefined,
                track_lots: Boolean(record?.item?.track_lots || record?.lot_id),
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
        rowKey={(row) => `${row.item_id}-${row.warehouse_id}-${row.lot_id ?? "n"}`}
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
        scrollX={1680}
        pagination={pagination}
      />
      <StockAdjustmentDocumentDrawer
        open={adjustmentOpen}
        mode={adjustmentMode}
        documentId={adjustmentId}
        createSeed={adjustmentSeed}
        onClose={closeAdjustment}
        onCreated={handleAdjustmentCreated}
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
