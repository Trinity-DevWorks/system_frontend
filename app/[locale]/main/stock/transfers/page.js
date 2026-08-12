"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { stockTransfersQueryKey } from "@/components/stock/stockQueryCache";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { deleteStockTransfer } from "@/services/stockTransfersApi";
import { fetchWarehouses } from "@/services/warehousesApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, DatePicker, Form, Select } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { STOCK_TRANSFER_STATUS_VALUES } from "../shared/stockTransferStatuses";
import { getStockTransferStatusLabel } from "../shared/stockTransferStatuses";
import {
  formatStockFilterDateRange,
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "../shared/StockTableFilters";
import StockTransferDrawer from "./drawer/StockTransferDrawer";
import { getStockTransferTableColumns } from "./getStockTransferTableColumns";
import { useStockTransfersTableQuery } from "./useStockTransfersTableQuery";

function StockTransfersTable() {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("stock");

  const [statusFilter, setStatusFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [fromWarehouseFilter, setFromWarehouseFilter] = useState(
    /** @type {number | undefined} */ (undefined),
  );
  const [toWarehouseFilter, setToWarehouseFilter] = useState(
    /** @type {number | undefined} */ (undefined),
  );
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs, import("dayjs").Dayjs] | null} */ (null),
  );

  const fromIso = dateRange?.[0]?.startOf("day").toISOString();
  const toIso = dateRange?.[1]?.endOf("day").toISOString();

  const { tableData: rawTableData, isPending, isFetching, refetch } = useStockTransfersTableQuery({
    t,
    tApiErrors,
    notification,
    status: statusFilter,
    fromWarehouseId: fromWarehouseFilter,
    toWarehouseId: toWarehouseFilter,
    from: fromIso,
    to: toIso,
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
        label: String(w.name ?? w.id),
      })),
    ],
    [warehousesQuery.data, t],
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllStatuses") },
      ...STOCK_TRANSFER_STATUS_VALUES.map((value) => ({
        value,
        label: getStockTransferStatusLabel(t, value),
      })),
    ],
    [t],
  );

  const tableData = useMemo(
    () =>
      rawTableData.map((row) => ({
        ...row,
        from_warehouse_name: row?.from_warehouse?.name ?? "",
        to_warehouse_name: row?.to_warehouse?.name ?? "",
        status_label: getStockTransferStatusLabel(t, row?.status),
      })),
    [rawTableData, t],
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(/** @type {"create" | "edit" | "view"} */ ("create"));
  const [drawerTransferId, setDrawerTransferId] = useState(/** @type {string | null} */ (null));
  const [drawerTableSeed, setDrawerTableSeed] = useState(
    /** @type {Record<string, unknown> | null} */ (null),
  );

  const openCreateDrawer = useCallback(() => {
    setDrawerTableSeed(null);
    setDrawerMode("create");
    setDrawerTransferId(null);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerTransferId(id);
    setDrawerOpen(true);
  }, []);

  const openViewDrawer = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("view");
    setDrawerTransferId(id);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerTransferId(null);
    setDrawerTableSeed(null);
  }, []);

  const handleTransferCreated = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerTransferId(id);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deleteStockTransfer(id),
    onSuccess: () => {
      message.success(t("transferDeleteSuccess"));
      queryClient.invalidateQueries({ queryKey: stockTransfersQueryKey() });
    },
    onError: (err) => {
      notification.error({
        title: t("transferDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const handleDelete = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      const name =
        typeof record.transfer_number === "string"
          ? record.transfer_number
          : id;
      modal.confirm({
        title: t("transferDeleteConfirmTitle"),
        content: t("transferDeleteConfirmContent", { name }),
        okText: t("transferDeleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => deleteMutation.mutateAsync(id),
      });
    },
    [modal, t, deleteMutation],
  );

  const statusLabel = useMemo(() => {
    if (!statusFilter) return null;
    return statusFilterOptions.find((o) => o.value === statusFilter)?.label ?? statusFilter;
  }, [statusFilter, statusFilterOptions]);

  const fromWarehouseLabel = useMemo(() => {
    if (fromWarehouseFilter == null) return null;
    return (
      warehouseFilterOptions.find((o) => o.value === fromWarehouseFilter)?.label ??
      String(fromWarehouseFilter)
    );
  }, [fromWarehouseFilter, warehouseFilterOptions]);

  const toWarehouseLabel = useMemo(() => {
    if (toWarehouseFilter == null) return null;
    return (
      warehouseFilterOptions.find((o) => o.value === toWarehouseFilter)?.label ?? String(toWarehouseFilter)
    );
  }, [toWarehouseFilter, warehouseFilterOptions]);

  const dateRangeLabel = useMemo(
    () => formatStockFilterDateRange(dateRange?.[0], dateRange?.[1]),
    [dateRange],
  );

  const clearAllFilters = useCallback(() => {
    setStatusFilter(undefined);
    setFromWarehouseFilter(undefined);
    setToWarehouseFilter(undefined);
    setDateRange(null);
  }, []);

  const filterSummary = useMemo(() => {
    /** @type {import("../shared/StockTableFilters").StockFilterSummaryLine[]} */
    const lines = [];
    if (fromWarehouseLabel) lines.push({ label: t("filterFromWarehouse"), value: fromWarehouseLabel });
    if (toWarehouseLabel) lines.push({ label: t("filterToWarehouse"), value: toWarehouseLabel });
    if (statusLabel) lines.push({ label: t("filterStatus"), value: statusLabel });
    if (dateRangeLabel) lines.push({ label: t("filterDateRange"), value: dateRangeLabel });
    return lines;
  }, [dateRangeLabel, fromWarehouseLabel, statusLabel, t, toWarehouseLabel]);

  const columns = useMemo(
    () =>
      getStockTransferTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? handleDelete : undefined,
      }),
    [t, access.canView, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer, handleDelete],
  );

  const { toggle: filterToggle, filterBar } = useStockTableFilters({
    activeCount: filterSummary.length,
    summary: filterSummary,
    onClearAll: clearAllFilters,
    children: (
      <div className="flex flex-col gap-1">
        <div className={stockFilterFieldRowClassName}>
          <Form.Item label={t("filterFromWarehouse")}>
            <Select
              className="w-full"
              value={fromWarehouseFilter ?? ""}
              options={warehouseFilterOptions}
              loading={warehousesQuery.isPending}
              onChange={(v) => setFromWarehouseFilter(v === "" ? undefined : Number(v))}
            />
          </Form.Item>
          <Form.Item label={t("filterToWarehouse")}>
            <Select
              className="w-full"
              value={toWarehouseFilter ?? ""}
              options={warehouseFilterOptions}
              loading={warehousesQuery.isPending}
              onChange={(v) => setToWarehouseFilter(v === "" ? undefined : Number(v))}
            />
          </Form.Item>
        </div>
        <div className={stockFilterFieldRowClassName}>
          <Form.Item label={t("filterStatus")}>
            <Select
              className="w-full"
              value={statusFilter ?? ""}
              options={statusFilterOptions}
              onChange={(v) => setStatusFilter(v === "" ? undefined : String(v))}
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
      </div>
    ),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="stock-transfers"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("transfersEmpty")}
        toolbar={{
          showSearch: true,
          searchKeys: ["transfer_number", "from_warehouse_name", "to_warehouse_name", "status_label"],
          enableClientSearch: true,
          showRefresh: true,
          onRefresh: () => refetch(),
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          addLabel: t("toolbarNewTransfer"),
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1200}
        pagination={{
          mode: "client",
          pageSize: 50,
          pageSizeOptions: [20, 50, 100, 200],
        }}
      />
      <StockTransferDrawer
        open={drawerOpen}
        mode={drawerMode}
        transferId={drawerTransferId}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleTransferCreated}
      />
    </div>
  );
}

export default function StockTransfersPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <StockTransfersTable />
    </div>
  );
}
