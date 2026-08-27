"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { STOCK_ADJUSTMENT_REASON_NAMES_QUERY_KEY, STOCK_ADJUSTMENTS_QUERY_KEY } from "../queries/stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { deleteStockAdjustment } from "../api/stockAdjustments.api";
import { fetchStockAdjustmentReasonNames } from "../api/stockAdjustmentReasons.api";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, DatePicker, Form, Select, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";
import {
  STOCK_ADJUSTMENT_STATUS_VALUES,
  getStockAdjustmentStatusLabel,
} from "../utils/stockAdjustmentStatuses";
import {
  formatStockFilterDateRange,
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "../components/StockTableFilters/StockTableFilters";
import StockAdjustmentDocumentDrawer from "../components/StockAdjustmentDocumentDrawer/StockAdjustmentDocumentDrawer";
import { getStockAdjustmentTableColumns } from "../components/StockAdjustmentsTable/getStockAdjustmentTableColumns";
import { useStockAdjustmentsTableQuery } from "../queries/useStockAdjustmentsTableQuery";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";

function StockAdjustmentsTable() {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("stock");

  const [statusFilter, setStatusFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [warehouseFilter, setWarehouseFilter] = useState(
    /** @type {number | undefined} */ (undefined),
  );
  const [reasonFilter, setReasonFilter] = useState(/** @type {number | undefined} */ (undefined));
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs, import("dayjs").Dayjs] | null} */ (null),
  );

  const fromIso = dateRange?.[0]?.format("YYYY-MM-DD");
  const toIso = dateRange?.[1]?.format("YYYY-MM-DD");

  const { tableData: rawTableData, isPending, isFetching, refetch, pagination, onSearchChange } =
    useStockAdjustmentsTableQuery({
      t,
      tApiErrors,
      notification,
      status: statusFilter,
      warehouseId: warehouseFilter,
      reasonId: reasonFilter,
      from: fromIso,
      to: toIso,
    });

  const warehousesQuery = useQuery({
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouseNames,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const reasonsQuery = useQuery({
    queryKey: STOCK_ADJUSTMENT_REASON_NAMES_QUERY_KEY,
    queryFn: fetchStockAdjustmentReasonNames,
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

  const reasonFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllReasons") },
      ...(reasonsQuery.data ?? []).map((reason) => ({
        value: reason.id,
        label: String(reason.name ?? reason.code ?? reason.id),
      })),
    ],
    [reasonsQuery.data, t],
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllStatuses") },
      ...STOCK_ADJUSTMENT_STATUS_VALUES.map((value) => ({
        value,
        label: getStockAdjustmentStatusLabel(t, value),
      })),
    ],
    [t],
  );

  const tableData = useMemo(
    () =>
      rawTableData.map((row) => ({
        ...row,
        status_label: getStockAdjustmentStatusLabel(t, row?.status),
      })),
    [rawTableData, t],
  );

  const {
    open: drawerOpen,
    mode: drawerMode,
    recordId: drawerDocumentId,
    tableSeed: drawerTableSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated: handleDocumentCreated,
  } = useResourceDrawerUrl();

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deleteStockAdjustment(id),
    onSuccess: () => {
      message.success(t("adjDeleteSuccess"));
      queryClient.invalidateQueries({ queryKey: STOCK_ADJUSTMENTS_QUERY_KEY });
    },
    onError: (err) => {
      notification.error({
        title: t("adjDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const handleDelete = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      const name = typeof record.adj_number === "string" ? record.adj_number : id;
      modal.confirm({
        title: t("adjDeleteConfirmTitle"),
        content: t("adjDeleteConfirmContent", { name }),
        okText: t("adjDeleteConfirmOk"),
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

  const warehouseLabel = useMemo(() => {
    if (warehouseFilter == null) return null;
    return (
      warehouseFilterOptions.find((o) => o.value === warehouseFilter)?.label ?? String(warehouseFilter)
    );
  }, [warehouseFilter, warehouseFilterOptions]);

  const reasonLabel = useMemo(() => {
    if (reasonFilter == null) return null;
    return reasonFilterOptions.find((o) => o.value === reasonFilter)?.label ?? String(reasonFilter);
  }, [reasonFilter, reasonFilterOptions]);

  const dateRangeLabel = useMemo(
    () => formatStockFilterDateRange(dateRange?.[0], dateRange?.[1]),
    [dateRange],
  );

  const clearAllFilters = useCallback(() => {
    setStatusFilter(undefined);
    setWarehouseFilter(undefined);
    setReasonFilter(undefined);
    setDateRange(null);
  }, []);

  const filterSummary = useMemo(() => {
    /** @type {import("../components/StockTableFilters/StockTableFilters").StockFilterSummaryLine[]} */
    const lines = [];
    if (warehouseLabel) lines.push({ label: t("filterWarehouse"), value: warehouseLabel });
    if (reasonLabel) lines.push({ label: t("filterReason"), value: reasonLabel });
    if (statusLabel) lines.push({ label: t("filterStatus"), value: statusLabel });
    if (dateRangeLabel) lines.push({ label: t("filterDateRange"), value: dateRangeLabel });
    return lines;
  }, [dateRangeLabel, reasonLabel, statusLabel, t, warehouseLabel]);

  const columns = useMemo(
    () =>
      getStockAdjustmentTableColumns(t, {
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
          <Form.Item label={t("filterWarehouse")}>
            <Select
              className="w-full"
              value={warehouseFilter ?? ""}
              options={warehouseFilterOptions}
              loading={warehousesQuery.isPending}
              showSearch
              optionFilterProp="label"
              onChange={(v) => setWarehouseFilter(v === "" ? undefined : Number(v))}
            />
          </Form.Item>
          <Form.Item label={t("filterReason")}>
            <Select
              className="w-full"
              value={reasonFilter ?? ""}
              options={reasonFilterOptions}
              loading={reasonsQuery.isPending}
              showSearch
              optionFilterProp="label"
              onChange={(v) => setReasonFilter(v === "" ? undefined : Number(v))}
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
        tableId="stock-adjustments"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("adjustmentsEmpty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange,
          showRefresh: true,
          onRefresh: () => refetch(),
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          addLabel: t("toolbarNewAdj"),
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1200}
        pagination={pagination}
      />
      <StockAdjustmentDocumentDrawer
        open={drawerOpen}
        mode={drawerMode}
        documentId={
          typeof drawerDocumentId === "string" || typeof drawerDocumentId === "number"
            ? String(drawerDocumentId)
            : null
        }
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleDocumentCreated}
      />
    </div>
  );
}

export default function StockAdjustmentsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <StockAdjustmentsTable />
      </Suspense>
    </div>
  );
}
