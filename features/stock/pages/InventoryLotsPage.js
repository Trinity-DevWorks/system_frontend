"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess } from "@/lib/permissions";
import { App, Checkbox, Form, Select } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { stockFilterFieldRowClassName, useStockTableFilters } from "../components/StockTableFilters/StockTableFilters";
import { getInventoryLotTableColumns } from "../components/InventoryLotsTable/getInventoryLotTableColumns";
import { useInventoryLotsTableQuery } from "../queries/useInventoryLotsTableQuery";
import { STOCK_BALANCES_QUERY_KEY, STOCK_INVENTORY_LOTS_QUERY_KEY, STOCK_LOTS_QUERY_KEY } from "../queries/stockQueryKeys";
import { updateInventoryLot } from "../api/stock.api";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";

function InventoryLotsTable() {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const access = useResourceAccess("stock");
  const queryClient = useQueryClient();

  const [warehouseFilter, setWarehouseFilter] = useState(/** @type {number | undefined} */ (undefined));
  const [expiredOnly, setExpiredOnly] = useState(false);
  const [missingExpiry, setMissingExpiry] = useState(false);
  const [onlyWithStock, setOnlyWithStock] = useState(false);

  const { tableData: rawTableData, isPending, isFetching, refetch, pagination, onSearchChange } =
    useInventoryLotsTableQuery({
      t,
      tApiErrors,
      notification,
      warehouseId: warehouseFilter,
      expired: expiredOnly,
      missingExpiry,
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

  const expiryMutation = useMutation({
    mutationFn: ({ id, expiry_date }) => updateInventoryLot(id, { expiry_date }),
    onSuccess: () => {
      notification.success({ title: t("lotsExpirySaved") });
      queryClient.invalidateQueries({ queryKey: STOCK_INVENTORY_LOTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_LOTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    },
    onError: (err) => {
      notification.error({
        title: t("lotsExpirySaveFailed"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const tableData = rawTableData;

  const warehouseLabel = useMemo(() => {
    if (warehouseFilter == null) return null;
    return warehouseFilterOptions.find((o) => o.value === warehouseFilter)?.label ?? String(warehouseFilter);
  }, [warehouseFilter, warehouseFilterOptions]);

  const clearAllFilters = useCallback(() => {
    setWarehouseFilter(undefined);
    setExpiredOnly(false);
    setMissingExpiry(false);
    setOnlyWithStock(false);
  }, []);

  const filterSummary = useMemo(() => {
    /** @type {import("../components/StockTableFilters/StockTableFilters").StockFilterSummaryLine[]} */
    const lines = [];
    if (warehouseLabel) lines.push({ label: t("filterWarehouse"), value: warehouseLabel });
    if (expiredOnly) lines.push({ label: t("filterExpiredLots"), value: t("filterChipYes") });
    if (missingExpiry) lines.push({ label: t("filterMissingExpiry"), value: t("filterChipYes") });
    if (onlyWithStock) lines.push({ label: t("filterOnlyWithOnHand"), value: t("filterChipYes") });
    return lines;
  }, [expiredOnly, missingExpiry, onlyWithStock, t, warehouseLabel]);

  const handleExpiryChange = useCallback(
    (record, expiryDate) => {
      if (record?.id == null) return;
      expiryMutation.mutate({ id: record.id, expiry_date: expiryDate });
    },
    [expiryMutation],
  );

  const columns = useMemo(
    () =>
      getInventoryLotTableColumns(t, {
        canEdit: access.canEdit,
        savingId: expiryMutation.isPending ? expiryMutation.variables?.id : null,
        onExpiryChange: access.canEdit ? handleExpiryChange : undefined,
      }),
    [t, access.canEdit, expiryMutation.isPending, expiryMutation.variables?.id, handleExpiryChange],
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
        <Form.Item label={t("filterExpiredLots")} colon={false}>
          <Checkbox checked={expiredOnly} onChange={(e) => setExpiredOnly(e.target.checked)} />
        </Form.Item>
        <Form.Item label={t("filterMissingExpiry")} colon={false}>
          <Checkbox checked={missingExpiry} onChange={(e) => setMissingExpiry(e.target.checked)} />
        </Form.Item>
        <Form.Item label={t("filterOnlyWithOnHand")} colon={false}>
          <Checkbox checked={onlyWithStock} onChange={(e) => setOnlyWithStock(e.target.checked)} />
        </Form.Item>
      </div>
    ),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="stock-inventory-lots"
        columns={columns}
        dataSource={tableData}
        rowKey={(row) => `${row.id}-${row.warehouse_id ?? "n"}`}
        loading={isPending}
        refreshFetching={isFetching || expiryMutation.isPending}
        onRetry={() => refetch()}
        emptyText={t("lotsEmpty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange,
          showRefresh: true,
          onRefresh: () => refetch(),
          showAdd: false,
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1100}
        pagination={pagination}
      />
    </div>
  );
}

export default function InventoryLotsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <InventoryLotsTable />
    </div>
  );
}
