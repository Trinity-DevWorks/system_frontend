"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { PURCHASE_ORDERS_QUERY_KEY } from "../queries/stockQueryKeys";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { parseNumericEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { App, Button, Checkbox, Form, Select, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";
import { stockFilterFieldRowClassName, useStockTableFilters } from "../components/StockTableFilters/StockTableFilters";
import PurchaseOrderDrawer from "../components/PurchaseOrderDrawer/PurchaseOrderDrawer";
import { getPurchasingAlertTableColumns } from "../components/PurchasingAlertsTable/getPurchasingAlertTableColumns";
import {
  buildPurchaseOrderCreateSeedFromAlert,
  groupAlertsIntoPurchaseOrderSeeds,
} from "../utils/purchaseOrderFromAlertUtils";
import PurchasingAlertViewDrawer from "../components/PurchasingAlertViewDrawer/PurchasingAlertViewDrawer";
import { usePurchasingAlertsTableQuery } from "../queries/usePurchasingAlertsTableQuery";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";

const ALERT_STATUS_OPTIONS = ["out_of_stock", "below_safety", "below_reorder", "ok"];

/**
 * @typedef {{ header: Record<string, unknown>; lines: Array<Record<string, unknown>> }} PurchaseOrderSeed
 *
 * @typedef {{
 *   key: number;
 *   seed: PurchaseOrderSeed | null;
 *   queue: PurchaseOrderSeed[];
 *   bulkFlow: boolean;
 * }} PurchaseOrderCreateState
 */

/** @type {PurchaseOrderCreateState} */
const EMPTY_PO_CREATE_STATE = { key: 0, seed: null, queue: [], bulkFlow: false };

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
  const [poCreate, setPoCreate] = useState(EMPTY_PO_CREATE_STATE);

  const {
    open: drawerOpen,
    mode: drawerMode,
    recordId: alertViewId,
    tableSeed: alertViewSeed,
    openViewDrawer,
    openCreateDrawer,
    closeDrawer,
  } = useResourceDrawerUrl({
    allowCreateInUrl: true,
    defaultMode: "view",
    parseId: parseNumericEntityId,
  });

  const poCreateOpen = drawerOpen && drawerMode === "create";
  const alertViewOpen = drawerOpen && drawerMode !== "create";

  const { tableData: rawTableData, isPending, isFetching, refetch, pagination, onSearchChange } = usePurchasingAlertsTableQuery({
    t,
    tApiErrors,
    notification,
    warehouseId: warehouseFilter,
    status: statusFilter,
    onlyAlerts,
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
        item_code: row?.item?.item_code ?? "",
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
    /** @type {import("../components/StockTableFilters/StockTableFilters").StockFilterSummaryLine[]} */
    const lines = [];
    if (warehouseLabel) lines.push({ label: t("filterWarehouse"), value: warehouseLabel });
    if (statusLabel) lines.push({ label: t("filterAlertStatus"), value: statusLabel });
    if (!onlyAlerts) {
      lines.push({ label: t("filterOnlyAlerts"), value: t("filterChipNo") });
    }
    return lines;
  }, [onlyAlerts, statusLabel, t, warehouseLabel]);

  /**
   * Stay on purchasing alerts and open the same PO drawer via `?drawer=new&mode=create`.
   * Prefill stays in React state — not the URL.
   * @type {(seeds: PurchaseOrderSeed[], options?: { bulkFlow?: boolean }) => void}
   */
  const openDrawerWithSeeds = useCallback(
    (seeds, options = {}) => {
      const { bulkFlow = false } = options;
      const [first, ...rest] = seeds;
      if (!first) return;

      setPoCreate((prev) => ({ key: prev.key + 1, seed: first, queue: rest, bulkFlow }));
      openCreateDrawer();
    },
    [openCreateDrawer],
  );

  const handleViewAlert = useCallback(
    (record) => {
      const replenishmentId = parseNumericEntityId(record?.replenishment_id);
      if (replenishmentId == null) return;
      openViewDrawer({
        .../** @type {Record<string, unknown>} */ (record),
        id: replenishmentId,
      });
    },
    [openViewDrawer],
  );

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
        onView: access.canView ? handleViewAlert : undefined,
        onCreatePo: access.canAdd ? handleCreatePoFromAlert : undefined,
      }),
    [t, access.canView, access.canAdd, handleViewAlert, handleCreatePoFromAlert],
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
    setPoCreate((prev) => ({ ...EMPTY_PO_CREATE_STATE, key: prev.key }));
    closeDrawer();
  }, [closeDrawer]);

  const handlePoCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });

    const [nextSeed, ...restQueue] = poCreate.queue;
    if (nextSeed) {
      setPoCreate((prev) => ({ ...prev, key: prev.key + 1, seed: nextSeed, queue: restQueue }));
      return;
    }

    if (poCreate.bulkFlow) {
      setSelectedRowKeys([]);
      handlePoDrawerClose();
    }
  }, [handlePoDrawerClose, poCreate.bulkFlow, poCreate.queue, queryClient]);

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
          enableClientSearch: false,
          onSearchChange,
          showRefresh: true,
          onRefresh: () => refetch(),
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1360}
        pagination={pagination}
      />

      <PurchasingAlertViewDrawer
        open={alertViewOpen}
        replenishmentId={alertViewOpen ? alertViewId : null}
        tableSeedRecord={alertViewSeed}
        onClose={closeDrawer}
        canCreatePo={access.canAdd}
        onCreatePo={access.canAdd ? handleCreatePoFromAlert : undefined}
      />

      <PurchaseOrderDrawer
        key={poCreate.key}
        open={poCreateOpen}
        mode="create"
        orderId={null}
        createSeed={poCreate.seed}
        onClose={handlePoDrawerClose}
        onCreated={handlePoCreated}
      />
    </div>
  );
}

export default function PurchasingAlertsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <PurchasingAlertsTable />
      </Suspense>
    </div>
  );
}
