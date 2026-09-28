"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { PURCHASE_INVOICE_DETAIL_QUERY_PREFIX, PURCHASE_INVOICES_QUERY_KEY } from "../queries/purchaseInvoicesQueryKeys";
import {
  PURCHASE_ORDER_DETAIL_QUERY_PREFIX,
  PURCHASE_ORDERS_QUERY_KEY,
  STOCK_BALANCES_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
} from "@/features/stock/queries/stockQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { fetchSupplierNames } from "@/features/suppliers/index";
import { SUPPLIERS_LIST_QUERY_KEY } from "@/features/suppliers/queries/suppliersQueryKeys";
import { deletePurchaseInvoice, reversePurchaseInvoice } from "../api/purchaseInvoices.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, DatePicker, Form, Select, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";
import {
  formatStockFilterDateRange,
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "@/features/stock/components/StockTableFilters/StockTableFilters";
import { getPurchaseInvoiceTableColumns } from "../components/PurchaseInvoicesTable/getPurchaseInvoiceTableColumns";
import { usePurchaseInvoicesTableQuery } from "../queries/usePurchaseInvoicesTableQuery";
import {
  PURCHASE_INVOICE_STATUS_VALUES,
  getPurchaseInvoiceStatusLabel,
} from "../utils/purchaseInvoiceStatuses";

function PurchaseInvoicesTable() {
  const t = useTranslations("PurchaseInvoices");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("purchase_invoices");

  const [statusFilter, setStatusFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [supplierFilter, setSupplierFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs, import("dayjs").Dayjs] | null} */ (null),
  );

  const fromIso = dateRange?.[0]?.format("YYYY-MM-DD");
  const toIso = dateRange?.[1]?.format("YYYY-MM-DD");

  const { tableData: rawTableData, isPending, isFetching, refetch, pagination, onSearchChange } =
    usePurchaseInvoicesTableQuery({
      t,
      tApiErrors,
      notification,
      status: statusFilter,
      supplierId: supplierFilter,
      from: fromIso,
      to: toIso,
    });

  const suppliersQuery = useQuery({
    queryKey: SUPPLIERS_LIST_QUERY_KEY,
    queryFn: fetchSupplierNames,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const supplierFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllSuppliers") },
      ...(suppliersQuery.data ?? []).map((s) => ({
        value: s.id,
        label: String(s.name ?? s.supplier_code ?? s.id),
      })),
    ],
    [suppliersQuery.data, t],
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllStatuses") },
      ...PURCHASE_INVOICE_STATUS_VALUES.map((value) => ({
        value,
        label: getPurchaseInvoiceStatusLabel(t, value),
      })),
    ],
    [t],
  );

  const tableData = useMemo(
    () =>
      rawTableData.map((row) => ({
        ...row,
        supplier_name: row?.supplier?.name ?? "",
        status_label: getPurchaseInvoiceStatusLabel(t, row?.status),
      })),
    [rawTableData, t],
  );

  const { openCreateDrawer, openEditDrawer, openViewDrawer } = usePageDrawer("purchaseInvoices");

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deletePurchaseInvoice(id),
    onSuccess: () => {
      message.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: PURCHASE_INVOICES_QUERY_KEY });
    },
    onError: (err) => {
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const handleDelete = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      const name = typeof record.invoice_number === "string" ? record.invoice_number : id;
      modal.confirm({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent", { name }),
        okText: t("deleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(deleteMutation.mutateAsync(id)),
      });
    },
    [modal, t, deleteMutation],
  );

  const reverseMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => reversePurchaseInvoice(id),
    onSuccess: () => {
      message.success(t("reverseSuccess"));
      queryClient.invalidateQueries({ queryKey: PURCHASE_INVOICES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PURCHASE_INVOICE_DETAIL_QUERY_PREFIX });
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_DETAIL_QUERY_PREFIX });
      queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
    },
    onError: (err) => {
      notification.error({
        title: t("reverseError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const handleReverse = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      const hasGrn = record?.goods_receipt_id != null && record.goods_receipt_id !== "";
      modal.confirm({
        title: t("reverseConfirmTitle"),
        content: hasGrn ? t("reverseConfirmContentApOnly") : t("reverseConfirmContentApAndStock"),
        okText: t("actionReverse"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(reverseMutation.mutateAsync(id)),
      });
    },
    [modal, t, reverseMutation],
  );

  const statusLabel = useMemo(() => {
    if (!statusFilter) return null;
    return statusFilterOptions.find((o) => o.value === statusFilter)?.label ?? statusFilter;
  }, [statusFilter, statusFilterOptions]);

  const supplierLabel = useMemo(() => {
    if (!supplierFilter) return null;
    return supplierFilterOptions.find((o) => o.value === supplierFilter)?.label ?? supplierFilter;
  }, [supplierFilter, supplierFilterOptions]);

  const dateRangeLabel = useMemo(
    () => formatStockFilterDateRange(dateRange?.[0], dateRange?.[1]),
    [dateRange],
  );

  const clearAllFilters = useCallback(() => {
    setStatusFilter(undefined);
    setSupplierFilter(undefined);
    setDateRange(null);
  }, []);

  const filterSummary = useMemo(() => {
    /** @type {import("@/features/stock/components/StockTableFilters/StockTableFilters").StockFilterSummaryLine[]} */
    const lines = [];
    if (supplierLabel) lines.push({ label: t("filterSupplier"), value: supplierLabel });
    if (statusLabel) lines.push({ label: t("filterStatus"), value: statusLabel });
    if (dateRangeLabel) lines.push({ label: t("filterDateRange"), value: dateRangeLabel });
    return lines;
  }, [dateRangeLabel, statusLabel, supplierLabel, t]);

  const columns = useMemo(
    () =>
      getPurchaseInvoiceTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? handleDelete : undefined,
        onReverse: access.canReverse ? handleReverse : undefined,
      }),
    [t, access.canView, access.canEdit, access.canDelete, access.canReverse, openViewDrawer, openEditDrawer, handleDelete, handleReverse],
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
        tableId="purchase-invoices"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange,
          showRefresh: true,
          onRefresh: () => refetch(),
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          addLabel: t("toolbarNew"),
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1530}
        pagination={pagination}
      />
    </div>
  );
}

export default function PurchaseInvoicesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <PurchaseInvoicesTable />
      </Suspense>
    </div>
  );
}
