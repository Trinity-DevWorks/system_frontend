"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { normalizeEntityId, parseNumericEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { fetchWarehouses } from "@/services/warehousesApi";
import { useQuery } from "@tanstack/react-query";
import { App, DatePicker, Form, Select } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import StockAdjustmentDrawer from "../adjustment/StockAdjustmentDrawer";
import {
  formatStockFilterDateRange,
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "../shared/StockTableFilters";
import { STOCK_MOVEMENT_TYPE_VALUES } from "../shared/stockMovementTypes";
import { getStockMovementTypeLabel } from "../shared/stockMovementTypes";
import StockTransferDrawer from "../transfers/drawer/StockTransferDrawer";
import { getStockMovementTableColumns } from "./getStockMovementTableColumns";
import {
  isUuidLikeEntityId,
  resolveStockMovementViewTarget,
} from "./resolveStockMovementViewTarget";
import StockMovementViewDrawer from "./StockMovementViewDrawer";
import { useStockMovementsTableQuery } from "./useStockMovementsTableQuery";

function StockMovementsTable() {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const access = useResourceAccess("stock");

  const [warehouseFilter, setWarehouseFilter] = useState(/** @type {number | undefined} */ (undefined));
  const [typeFilter, setTypeFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [dateRange, setDateRange] = useState(/** @type {[import("dayjs").Dayjs, import("dayjs").Dayjs] | null} */ (null));
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);

  const fromIso = dateRange?.[0]?.startOf("day").toISOString();
  const toIso = dateRange?.[1]?.endOf("day").toISOString();

  const { tableData: rawTableData, isPending, isFetching, refetch } = useStockMovementsTableQuery({
    t,
    tApiErrors,
    notification,
    warehouseId: warehouseFilter,
    movementType: typeFilter,
    from: fromIso,
    to: toIso,
  });

  const {
    open: drawerOpen,
    recordId: drawerRecordId,
    tableSeed: drawerTableSeed,
    openViewDrawer,
    closeDrawer,
  } = useResourceDrawerUrl({
    allowCreateInUrl: false,
    defaultMode: "view",
  });

  const viewingTransfer = drawerOpen && isUuidLikeEntityId(drawerRecordId);
  const viewingMovement =
    drawerOpen && drawerRecordId != null && !isUuidLikeEntityId(drawerRecordId);

  const warehousesQuery = useQuery({
    queryKey: ["tenant", "warehouses"],
    queryFn: fetchWarehouses,
    staleTime: 5 * 60_000,
  });

  const tableData = useMemo(
    () =>
      rawTableData.map((row) => ({
        ...row,
        item_code: row?.item?.item_code ?? "",
        item_name: row?.item?.name ?? "",
        type_label: getStockMovementTypeLabel(t, row?.type),
      })),
    [rawTableData, t],
  );

  const warehouseFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllWarehouses") },
      ...(warehousesQuery.data ?? []).map((w) => ({
        value: w.id,
        label: String(w.name ?? w.id),
      })),
    ],
    [warehousesQuery.data, t],
  );

  const typeFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllTypes") },
      ...STOCK_MOVEMENT_TYPE_VALUES.map((value) => ({
        value,
        label: getStockMovementTypeLabel(t, value),
      })),
    ],
    [t],
  );

  const warehouseLabel = useMemo(() => {
    if (warehouseFilter == null) return null;
    return warehouseFilterOptions.find((o) => o.value === warehouseFilter)?.label ?? String(warehouseFilter);
  }, [warehouseFilter, warehouseFilterOptions]);

  const typeLabel = useMemo(() => {
    if (!typeFilter) return null;
    return typeFilterOptions.find((o) => o.value === typeFilter)?.label ?? typeFilter;
  }, [typeFilter, typeFilterOptions]);

  const dateRangeLabel = useMemo(
    () => formatStockFilterDateRange(dateRange?.[0], dateRange?.[1]),
    [dateRange],
  );

  const clearAllFilters = useCallback(() => {
    setWarehouseFilter(undefined);
    setTypeFilter(undefined);
    setDateRange(null);
  }, []);

  const filterSummary = useMemo(() => {
    /** @type {import("../shared/StockTableFilters").StockFilterSummaryLine[]} */
    const lines = [];
    if (warehouseLabel) lines.push({ label: t("filterWarehouse"), value: warehouseLabel });
    if (typeLabel) lines.push({ label: t("filterType"), value: typeLabel });
    if (dateRangeLabel) lines.push({ label: t("filterDateRange"), value: dateRangeLabel });
    return lines;
  }, [dateRangeLabel, t, typeLabel, warehouseLabel]);

  const handleView = useCallback(
    (record) => {
      const target = resolveStockMovementViewTarget(
        /** @type {Record<string, unknown>} */ (record),
      );
      if (!target) {
        notification.warning({
          title: t("movementViewUnavailableTitle"),
          description: t("movementViewUnavailableContent"),
        });
        return;
      }
      if (target.kind === "transfer") {
        openViewDrawer({ id: target.transferId });
        return;
      }
      openViewDrawer(/** @type {Record<string, unknown>} */ (record));
    },
    [notification, openViewDrawer, t],
  );

  const columns = useMemo(
    () =>
      getStockMovementTableColumns(t, {
        onView: access.canView ? handleView : undefined,
      }),
    [t, access.canView, handleView],
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
        <Form.Item label={t("filterType")}>
          <Select
            className="w-full"
            value={typeFilter ?? ""}
            options={typeFilterOptions}
            onChange={(v) => setTypeFilter(v === "" ? undefined : String(v))}
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

  const movementDrawerId = viewingMovement
    ? (parseNumericEntityId(drawerRecordId) ?? normalizeEntityId(drawerRecordId))
    : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="stock-movements"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("movementsEmpty")}
        toolbar={{
          showSearch: true,
          searchKeys: ["item_code", "item_name", "type_label", "notes"],
          enableClientSearch: true,
          showRefresh: true,
          onRefresh: () => refetch(),
          showAdd: access.canAdd,
          onAdd: () => setAdjustmentOpen(true),
          addLabel: t("toolbarAdjust"),
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1360}
        pagination={{
          mode: "client",
          pageSize: 50,
          pageSizeOptions: [20, 50, 100, 200],
        }}
      />
      <StockAdjustmentDrawer open={adjustmentOpen} onClose={() => setAdjustmentOpen(false)} />
      <StockMovementViewDrawer
        open={viewingMovement}
        movementId={movementDrawerId}
        tableSeedRecord={
          drawerTableSeed && !isUuidLikeEntityId(drawerTableSeed.id) ? drawerTableSeed : null
        }
        onClose={closeDrawer}
      />
      <StockTransferDrawer
        open={viewingTransfer}
        mode="view"
        transferId={viewingTransfer ? String(drawerRecordId) : null}
        tableSeedRecord={null}
        onClose={closeDrawer}
      />
    </div>
  );
}

export default function StockMovementsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <StockMovementsTable />
    </div>
  );
}
