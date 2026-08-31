"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { GOODS_RECEIPTS_QUERY_KEY } from "../queries/stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { deleteGoodsReceipt } from "../api/goodsReceipts.api";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, DatePicker, Form, Select, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";
import { GOODS_RECEIPT_STATUS_VALUES, getGoodsReceiptStatusLabel } from "../utils/goodsReceiptStatuses";
import {
  formatStockFilterDateRange,
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "../components/StockTableFilters/StockTableFilters";
import { getGoodsReceiptTableColumns } from "../components/GoodsReceiptsTable/getGoodsReceiptTableColumns";
import { useGoodsReceiptsTableQuery } from "../queries/useGoodsReceiptsTableQuery";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";

function GoodsReceiptsTable() {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("stock");

  const [statusFilter, setStatusFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [warehouseFilter, setWarehouseFilter] = useState(
    /** @type {number | undefined} */ (undefined),
  );
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs, import("dayjs").Dayjs] | null} */ (null),
  );

  const fromIso = dateRange?.[0]?.format("YYYY-MM-DD");
  const toIso = dateRange?.[1]?.format("YYYY-MM-DD");

  const { tableData: rawTableData, isPending, isFetching, refetch, pagination, onSearchChange } =
    useGoodsReceiptsTableQuery({
      t,
      tApiErrors,
      notification,
      status: statusFilter,
      warehouseId: warehouseFilter,
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
      ...GOODS_RECEIPT_STATUS_VALUES.map((value) => ({
        value,
        label: getGoodsReceiptStatusLabel(t, value),
      })),
    ],
    [t],
  );

  const tableData = useMemo(
    () =>
      rawTableData.map((row) => ({
        ...row,
        status_label: getGoodsReceiptStatusLabel(t, row?.status),
      })),
    [rawTableData, t],
  );

  const {
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
  } = usePageDrawer("stockGoodsReceipts");

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deleteGoodsReceipt(id),
    onSuccess: () => {
      message.success(t("grnDeleteSuccess"));
      queryClient.invalidateQueries({ queryKey: GOODS_RECEIPTS_QUERY_KEY });
    },
    onError: (err) => {
      notification.error({
        title: t("grnDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const handleDelete = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      const name = typeof record.grn_number === "string" ? record.grn_number : id;
      modal.confirm({
        title: t("grnDeleteConfirmTitle"),
        content: t("grnDeleteConfirmContent", { name }),
        okText: t("grnDeleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(deleteMutation.mutateAsync(id)),
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

  const dateRangeLabel = useMemo(
    () => formatStockFilterDateRange(dateRange?.[0], dateRange?.[1]),
    [dateRange],
  );

  const clearAllFilters = useCallback(() => {
    setStatusFilter(undefined);
    setWarehouseFilter(undefined);
    setDateRange(null);
  }, []);

  const filterSummary = useMemo(() => {
    /** @type {import("../components/StockTableFilters/StockTableFilters").StockFilterSummaryLine[]} */
    const lines = [];
    if (warehouseLabel) lines.push({ label: t("filterWarehouse"), value: warehouseLabel });
    if (statusLabel) lines.push({ label: t("filterStatus"), value: statusLabel });
    if (dateRangeLabel) lines.push({ label: t("filterDateRange"), value: dateRangeLabel });
    return lines;
  }, [dateRangeLabel, statusLabel, t, warehouseLabel]);

  const columns = useMemo(
    () =>
      getGoodsReceiptTableColumns(t, {
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
          <Form.Item label={t("filterStatus")}>
            <Select
              className="w-full"
              value={statusFilter ?? ""}
              options={statusFilterOptions}
              onChange={(v) => setStatusFilter(v === "" ? undefined : String(v))}
            />
          </Form.Item>
        </div>
        <div className={stockFilterFieldRowClassName}>
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
        tableId="goods-receipts"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("goodsReceiptsEmpty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange,
          showRefresh: true,
          onRefresh: () => refetch(),
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          addLabel: t("toolbarNewGrn"),
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1280}
        pagination={pagination}
      />
    </div>
  );
}

export default function GoodsReceiptsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <GoodsReceiptsTable />
      </Suspense>
    </div>
  );
}
