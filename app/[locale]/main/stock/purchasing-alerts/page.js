"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { PURCHASE_ORDERS_QUERY_KEY } from "@/components/stock/stockQueryCache";
import { useResourceAccess } from "@/lib/permissions";
import { App, Button, Checkbox, Form, Select } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { stockFilterFieldRowClassName, useStockTableFilters } from "../shared/StockTableFilters";
import PurchaseOrderDrawer from "../purchase-orders/drawer/PurchaseOrderDrawer";
import { getPurchasingAlertTableColumns } from "./getPurchasingAlertTableColumns";
import {
  buildPurchaseOrderCreateSeedFromAlert,
  groupAlertsIntoPurchaseOrderSeeds,
} from "./purchaseOrderFromAlertUtils";
import { usePurchasingAlertsTableQuery } from "./usePurchasingAlertsTableQuery";
import { fetchWarehouses } from "@/services/warehousesApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const ALERT_STATUS_OPTIONS = ["out_of_stock", "below_safety", "below_reorder", "ok"];

/**
 * @typedef {{ header: Record<string, unknown>; lines: Array<Record<string, unknown>> }} PurchaseOrderSeed
 *
 * @typedef {{
 *   open: boolean;
 *   key: number;
 *   seed: PurchaseOrderSeed | null;
 *   queue: PurchaseOrderSeed[];
 *   bulkFlow: boolean;
 * }} PurchaseOrderDrawerState
 */

/** @type {PurchaseOrderDrawerState} */
const CLOSED_PO_DRAWER_STATE = { open: false, key: 0, seed: null, queue: [], bulkFlow: false };

function PurchasingAlertsTable() {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("stock");

  const [warehouseFilter, setWarehouseFilter] = useState(/** @type {number | undefined} */ (undefined));
  const [statusFilter, setStatusFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [onlyAlerts, setOnlyAlerts] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState(/** @type {import("react").Key[]} */ ([]));

  const [poDrawer, setPoDrawer] = useState(CLOSED_PO_DRAWER_STATE);

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

  const tableDataByKey = useMemo(() => {
    /** @type {Map<string, Record<string, unknown>>} */
    const map = new Map();
    for (const row of tableData) {
      map.set(`${row.item_id}-${row.warehouse_id}`, row);
    }
    return map;
  }, [tableData]);

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

  /**
   * Bumping the drawer key remounts it, so each queued seed starts from a clean draft form.
   * @type {(seeds: PurchaseOrderSeed[], options?: { bulkFlow?: boolean }) => void}
   */
  const openDrawerWithSeeds = useCallback((seeds, options = {}) => {
    const { bulkFlow = false } = options;
    const [first, ...rest] = seeds;
    if (!first) return;

    setPoDrawer((prev) => ({ open: true, key: prev.key + 1, seed: first, queue: rest, bulkFlow }));
  }, []);

  const handleCreatePoFromAlert = useCallback(
    (record) => {
      const seed = buildPurchaseOrderCreateSeedFromAlert(/** @type {Record<string, unknown>} */ (record));
      if (!seed) {
        message.warning(t("poFromAlertsCannotCreateRow"));
        return;
      }

      openDrawerWithSeeds([seed]);
    },
    [message, openDrawerWithSeeds, t],
  );

  const columns = useMemo(
    () =>
      getPurchasingAlertTableColumns(t, {
        onCreatePo: access.canAdd ? handleCreatePoFromAlert : undefined,
      }),
    [t, access.canAdd, handleCreatePoFromAlert],
  );

  const handleOpenBulkCreate = useCallback(() => {
    const alerts = selectedRowKeys
      .map((key) => tableDataByKey.get(String(key)))
      .filter((row) => row != null);

    if (alerts.length === 0) return;

    const { seeds, skippedCount } = groupAlertsIntoPurchaseOrderSeeds(alerts);

    if (seeds.length === 0) {
      message.warning(t("poFromAlertsNoGroups"));
      return;
    }

    if (skippedCount > 0) {
      message.info(t("poFromAlertsSkippedRows", { count: skippedCount }));
    }

    if (seeds.length > 1) {
      message.info(t("poFromAlertsDrawerQueue", { count: seeds.length }));
    }

    openDrawerWithSeeds(seeds, { bulkFlow: seeds.length > 1 });
  }, [message, openDrawerWithSeeds, selectedRowKeys, t, tableDataByKey]);

  const handlePoDrawerClose = useCallback(() => {
    setPoDrawer((prev) => ({ ...CLOSED_PO_DRAWER_STATE, key: prev.key }));
  }, []);

  const handlePoCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });

    const [nextSeed, ...restQueue] = poDrawer.queue;
    if (nextSeed) {
      setPoDrawer((prev) => ({ ...prev, open: true, key: prev.key + 1, seed: nextSeed, queue: restQueue }));
      return;
    }

    if (poDrawer.bulkFlow) {
      setSelectedRowKeys([]);
      handlePoDrawerClose();
    }
  }, [handlePoDrawerClose, poDrawer.bulkFlow, poDrawer.queue, queryClient]);

  const rowSelection = useMemo(
    () => ({
      selectedRowKeys,
      onChange: (keys) => setSelectedRowKeys(keys ?? []),
    }),
    [selectedRowKeys],
  );

  const selectionBarExtra = (
    <Button type="link" size="small" onClick={handleOpenBulkCreate}>
      {t("actionCreatePosFromAlerts")}
    </Button>
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
        rowSelection={access.canAdd ? rowSelection : false}
        selectionBarExtra={access.canAdd ? selectionBarExtra : undefined}
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
        scrollX={1360}
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />

      <PurchaseOrderDrawer
        key={poDrawer.key}
        open={poDrawer.open}
        mode="create"
        orderId={null}
        createSeed={poDrawer.seed}
        onClose={handlePoDrawerClose}
        onCreated={handlePoCreated}
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
