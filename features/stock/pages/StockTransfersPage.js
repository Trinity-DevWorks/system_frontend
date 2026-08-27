"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import {
  invalidatePurchasingAlertsQueries,
  STOCK_BALANCES_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
  STOCK_TRANSFERS_QUERY_KEY,
} from "../queries/stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern } from "@/lib/tenant-format";
import {
  cancelStockTransfer,
  deleteStockTransfer,
  dispatchStockTransfer,
  receiveStockTransfer,
} from "../api/stockTransfers.api";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, DatePicker, Form, Select, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";
import { STOCK_TRANSFER_STATUS_VALUES } from "../utils/stockTransferStatuses";
import { getStockTransferStatusLabel } from "../utils/stockTransferStatuses";
import {
  formatStockFilterDateRange,
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "../components/StockTableFilters/StockTableFilters";
import StockTransferDrawer from "../components/StockTransferDrawer/StockTransferDrawer";
import { getStockTransferTableColumns } from "../components/StockTransfersTable/getStockTransferTableColumns";
import { useStockTransfersTableQuery } from "../queries/useStockTransfersTableQuery";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";

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

  const { tableData: rawTableData, isPending, isFetching, refetch, pagination, onSearchChange } = useStockTransfersTableQuery({
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
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouseNames,
    staleTime: QUERY_STALE_TIME.catalog,
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

  const {
    open: drawerOpen,
    mode: drawerMode,
    recordId: drawerTransferId,
    tableSeed: drawerTableSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated: handleTransferCreated,
  } = useResourceDrawerUrl();

  const invalidateStockLedger = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_TRANSFERS_QUERY_KEY });
    invalidatePurchasingAlertsQueries(queryClient);
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deleteStockTransfer(id),
    onSuccess: () => {
      message.success(t("transferDeleteSuccess"));
      invalidateStockLedger();
    },
    onError: (err) => {
      notification.error({
        title: t("transferDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => dispatchStockTransfer(id),
    onSuccess: () => {
      message.success(t("transferDispatchSuccess"));
      invalidateStockLedger();
    },
    onError: (err) => {
      notification.error({
        title: t("transferDispatchError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => receiveStockTransfer(id),
    onSuccess: () => {
      message.success(t("transferReceiveSuccess"));
      invalidateStockLedger();
    },
    onError: (err) => {
      notification.error({
        title: t("transferReceiveError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => cancelStockTransfer(id),
    onSuccess: () => {
      message.success(t("transferCancelSuccess"));
      invalidateStockLedger();
    },
    onError: (err) => {
      notification.error({
        title: t("transferCancelError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const handleDispatch = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      modal.confirm({
        title: t("transferDispatchConfirmTitle"),
        content: t("transferDispatchConfirmContent"),
        okText: t("transferDispatchConfirmOk"),
        cancelText: t("drawerCancel"),
        onOk: () => dispatchMutation.mutateAsync(id),
      });
    },
    [modal, t, dispatchMutation],
  );

  const handleReceive = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      modal.confirm({
        title: t("transferReceiveConfirmTitle"),
        content: t("transferReceiveConfirmContent"),
        okText: t("actionReceiveTransfer"),
        cancelText: t("drawerCancel"),
        onOk: () => receiveMutation.mutateAsync(id),
      });
    },
    [modal, t, receiveMutation],
  );

  const handleCancel = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      modal.confirm({
        title: t("transferCancelInTransitConfirmTitle"),
        content: t("transferCancelInTransitConfirmContent"),
        okText: t("transferCancelConfirmOk"),
        cancelText: t("drawerCancel"),
        onOk: () => cancelMutation.mutateAsync(id),
      });
    },
    [modal, t, cancelMutation],
  );

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
    /** @type {import("../components/StockTableFilters/StockTableFilters").StockFilterSummaryLine[]} */
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
        onDispatch: access.canEdit ? handleDispatch : undefined,
        onReceive: access.canEdit ? handleReceive : undefined,
        onCancel: access.canEdit ? handleCancel : undefined,
      }),
    [
      t,
      access.canView,
      access.canEdit,
      access.canDelete,
      openViewDrawer,
      openEditDrawer,
      handleDelete,
      handleDispatch,
      handleReceive,
      handleCancel,
    ],
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
          enableClientSearch: false,
          onSearchChange,
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
        pagination={pagination}
      />
      <StockTransferDrawer
        open={drawerOpen}
        mode={drawerMode}
        transferId={
          typeof drawerTransferId === "string" || typeof drawerTransferId === "number"
            ? String(drawerTransferId)
            : null
        }
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
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <StockTransfersTable />
      </Suspense>
    </div>
  );
}
