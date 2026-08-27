"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { PURCHASE_ORDERS_QUERY_KEY, invalidatePurchasingAlertsQueries } from "../queries/stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { buildReceiveGoodsHref } from "../utils/goodsReceiptFromPurchaseOrder";
import { cancelPurchaseOrder, deletePurchaseOrder, downloadPurchaseOrderPdf, markPurchaseOrderAsSent } from "../api/purchaseOrders.api";
import { useRouter } from "@/i18n/navigation";
import { fetchSupplierNames } from "@/features/suppliers/index";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, DatePicker, Form, Select, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";
import { PURCHASE_ORDER_STATUS_VALUES, getPurchaseOrderStatusLabel } from "../utils/purchaseOrderStatuses";
import {
  formatStockFilterDateRange,
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "../components/StockTableFilters/StockTableFilters";
import PurchaseOrderDrawer from "../components/PurchaseOrderDrawer/PurchaseOrderDrawer";
import { getPurchaseOrderTableColumns } from "../components/PurchaseOrdersTable/getPurchaseOrderTableColumns";
import { usePurchaseOrdersTableQuery } from "../queries/usePurchaseOrdersTableQuery";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";
import { SUPPLIERS_LIST_QUERY_KEY } from "@/features/suppliers";

function PurchaseOrdersTable() {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const router = useRouter();
  const access = useResourceAccess("stock");

  const [statusFilter, setStatusFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [supplierFilter, setSupplierFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [warehouseFilter, setWarehouseFilter] = useState(
    /** @type {number | undefined} */ (undefined),
  );
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs, import("dayjs").Dayjs] | null} */ (null),
  );

  const fromIso = dateRange?.[0]?.format("YYYY-MM-DD");
  const toIso = dateRange?.[1]?.format("YYYY-MM-DD");

  const { tableData: rawTableData, isPending, isFetching, refetch, pagination, onSearchChange } = usePurchaseOrdersTableQuery({
    t,
    tApiErrors,
    notification,
    status: statusFilter,
    supplierId: supplierFilter,
    warehouseId: warehouseFilter,
    from: fromIso,
    to: toIso,
  });

  const warehousesQuery = useQuery({
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouseNames,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const suppliersQuery = useQuery({
    queryKey: SUPPLIERS_LIST_QUERY_KEY,
    queryFn: fetchSupplierNames,
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

  const supplierFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllSuppliers") },
      ...(suppliersQuery.data ?? []).map((s) => ({
        value: s.id,
        label: String(s.name ?? s.id),
      })),
    ],
    [suppliersQuery.data, t],
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllStatuses") },
      ...PURCHASE_ORDER_STATUS_VALUES.map((value) => ({
        value,
        label: getPurchaseOrderStatusLabel(t, value),
      })),
    ],
    [t],
  );

  const tableData = useMemo(
    () =>
      rawTableData.map((row) => ({
        ...row,
        supplier_name: row?.supplier?.name ?? "",
        warehouse_name: row?.warehouse?.name ?? "",
        status_label: getPurchaseOrderStatusLabel(t, row?.status),
      })),
    [rawTableData, t],
  );

  const {
    open: drawerOpen,
    mode: drawerMode,
    recordId: drawerOrderId,
    tableSeed: drawerTableSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated: handleOrderCreated,
  } = useResourceDrawerUrl();

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deletePurchaseOrder(id),
    onSuccess: () => {
      message.success(t("poDeleteSuccess"));
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });
    },
    onError: (err) => {
      notification.error({
        title: t("poDeleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => cancelPurchaseOrder(id),
    onSuccess: () => {
      message.success(t("poCancelSuccess"));
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });
      invalidatePurchasingAlertsQueries(queryClient);
    },
    onError: (err) => {
      notification.error({
        title: t("poCancelError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const handleDelete = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      const name = typeof record.po_number === "string" ? record.po_number : id;
      modal.confirm({
        title: t("poDeleteConfirmTitle"),
        content: t("poDeleteConfirmContent", { name }),
        okText: t("poDeleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => deleteMutation.mutateAsync(id),
      });
    },
    [modal, t, deleteMutation],
  );

  const handleCancel = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      modal.confirm({
        title: t("poCancelConfirmTitle"),
        content: t("poCancelConfirmContent"),
        okText: t("poCancelConfirmOk"),
        cancelText: t("drawerCancel"),
        onOk: () => cancelMutation.mutateAsync(id),
      });
    },
    [modal, t, cancelMutation],
  );

  const handleDownloadPdf = useCallback(
    async (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      try {
        await downloadPurchaseOrderPdf(
          id,
          typeof record.po_number === "string" ? record.po_number : undefined,
        );
      } catch (err) {
        notification.error({
          title: t("poPdfError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    },
    [notification, t, tApiErrors],
  );

  const markSentMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => markPurchaseOrderAsSent(id),
    onSuccess: () => {
      message.success(t("poMarkSentSuccess"));
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });
    },
    onError: (err) => {
      notification.error({
        title: t("poMarkSentError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const handleMarkSent = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      modal.confirm({
        title: t("poMarkSentConfirmTitle"),
        content: t("poMarkSentConfirmContent"),
        okText: t("actionMarkPoSent"),
        cancelText: t("drawerCancel"),
        onOk: () => markSentMutation.mutateAsync(id),
      });
    },
    [modal, t, markSentMutation],
  );

  const handleReceive = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return;
    router.push(buildReceiveGoodsHref(id));
  }, [router]);

  const statusLabel = useMemo(() => {
    if (!statusFilter) return null;
    return statusFilterOptions.find((o) => o.value === statusFilter)?.label ?? statusFilter;
  }, [statusFilter, statusFilterOptions]);

  const supplierLabel = useMemo(() => {
    if (!supplierFilter) return null;
    return supplierFilterOptions.find((o) => o.value === supplierFilter)?.label ?? supplierFilter;
  }, [supplierFilter, supplierFilterOptions]);

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
    setSupplierFilter(undefined);
    setWarehouseFilter(undefined);
    setDateRange(null);
  }, []);

  const filterSummary = useMemo(() => {
    /** @type {import("../components/StockTableFilters/StockTableFilters").StockFilterSummaryLine[]} */
    const lines = [];
    if (supplierLabel) lines.push({ label: t("filterSupplier"), value: supplierLabel });
    if (warehouseLabel) lines.push({ label: t("filterWarehouse"), value: warehouseLabel });
    if (statusLabel) lines.push({ label: t("filterStatus"), value: statusLabel });
    if (dateRangeLabel) lines.push({ label: t("filterDateRange"), value: dateRangeLabel });
    return lines;
  }, [dateRangeLabel, statusLabel, supplierLabel, t, warehouseLabel]);

  const columns = useMemo(
    () =>
      getPurchaseOrderTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? handleDelete : undefined,
        onCancel: access.canEdit ? handleCancel : undefined,
        onDownloadPdf: handleDownloadPdf,
        onMarkSent: access.canEdit ? handleMarkSent : undefined,
        onReceive: access.canAdd ? handleReceive : undefined,
      }),
    [
      t,
      access.canView,
      access.canEdit,
      access.canDelete,
      access.canAdd,
      openViewDrawer,
      openEditDrawer,
      handleDelete,
      handleCancel,
      handleDownloadPdf,
      handleMarkSent,
      handleReceive,
    ],
  );

  const { toggle: filterToggle, filterBar } = useStockTableFilters({
    activeCount: filterSummary.length,
    summary: filterSummary,
    onClearAll: clearAllFilters,
    children: (
      <div className="flex flex-col gap-1">
        <div className={stockFilterFieldRowClassName}>
          <Form.Item label={t("filterSupplier")}>
            <Select
              className="w-full"
              value={supplierFilter ?? ""}
              options={supplierFilterOptions}
              loading={suppliersQuery.isPending}
              showSearch
              optionFilterProp="label"
              onChange={(v) => setSupplierFilter(v === "" ? undefined : String(v))}
            />
          </Form.Item>
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
        tableId="purchase-orders"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("purchaseOrdersEmpty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange,
          showRefresh: true,
          onRefresh: () => refetch(),
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          addLabel: t("toolbarNewPo"),
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1460}
        pagination={pagination}
      />
      <PurchaseOrderDrawer
        open={drawerOpen}
        mode={drawerMode}
        orderId={typeof drawerOrderId === "string" || typeof drawerOrderId === "number" ? String(drawerOrderId) : null}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleOrderCreated}
      />
    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <PurchaseOrdersTable />
      </Suspense>
    </div>
  );
}
