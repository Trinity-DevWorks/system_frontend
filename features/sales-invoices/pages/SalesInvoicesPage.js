"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { SALES_INVOICES_QUERY_KEY } from "../queries/salesInvoicesQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { deleteSalesInvoice } from "../api/salesInvoices.api";
import { fetchCustomerNames } from "@/features/customers/index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, DatePicker, Form, Select, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";
import { SALES_INVOICE_STATUS_VALUES, getSalesInvoiceStatusLabel } from "../utils/salesInvoiceStatuses";
import {
  formatStockFilterDateRange,
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "@/features/stock/components/StockTableFilters/StockTableFilters";
import { getSalesInvoiceTableColumns } from "../components/SalesInvoicesTable/getSalesInvoiceTableColumns";
import { useSalesInvoicesTableQuery } from "../queries/useSalesInvoicesTableQuery";
import { CUSTOMERS_LIST_QUERY_KEY } from "@/features/customers";

function SalesInvoicesTable() {
  const t = useTranslations("SalesInvoices");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("sales_invoices");

  const [statusFilter, setStatusFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [customerFilter, setCustomerFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs, import("dayjs").Dayjs] | null} */ (null),
  );

  const fromIso = dateRange?.[0]?.format("YYYY-MM-DD");
  const toIso = dateRange?.[1]?.format("YYYY-MM-DD");

  const { tableData: rawTableData, isPending, isFetching, refetch, pagination, onSearchChange } =
    useSalesInvoicesTableQuery({
      t,
      tApiErrors,
      notification,
      status: statusFilter,
      customerId: customerFilter,
      from: fromIso,
      to: toIso,
    });

  const customersQuery = useQuery({
    queryKey: CUSTOMERS_LIST_QUERY_KEY,
    queryFn: fetchCustomerNames,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const customerFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllCustomers") },
      ...(customersQuery.data ?? []).map((c) => ({
        value: c.id,
        label: String(c.name ?? c.id),
      })),
    ],
    [customersQuery.data, t],
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: "", label: t("filterAllStatuses") },
      ...SALES_INVOICE_STATUS_VALUES.map((value) => ({
        value,
        label: getSalesInvoiceStatusLabel(t, value),
      })),
    ],
    [t],
  );

  const tableData = useMemo(
    () =>
      rawTableData.map((row) => ({
        ...row,
        customer_name: row?.customer?.name ?? "",
        status_label: getSalesInvoiceStatusLabel(t, row?.status),
      })),
    [rawTableData, t],
  );

  const { openCreateDrawer, openEditDrawer, openViewDrawer } = usePageDrawer("salesInvoices");

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deleteSalesInvoice(id),
    onSuccess: () => {
      message.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: SALES_INVOICES_QUERY_KEY });
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

  const statusLabel = useMemo(() => {
    if (!statusFilter) return null;
    return statusFilterOptions.find((o) => o.value === statusFilter)?.label ?? statusFilter;
  }, [statusFilter, statusFilterOptions]);

  const customerLabel = useMemo(() => {
    if (!customerFilter) return null;
    return customerFilterOptions.find((o) => o.value === customerFilter)?.label ?? customerFilter;
  }, [customerFilter, customerFilterOptions]);

  const dateRangeLabel = useMemo(
    () => formatStockFilterDateRange(dateRange?.[0], dateRange?.[1]),
    [dateRange],
  );

  const clearAllFilters = useCallback(() => {
    setStatusFilter(undefined);
    setCustomerFilter(undefined);
    setDateRange(null);
  }, []);

  const filterSummary = useMemo(() => {
    /** @type {import("@/features/stock/components/StockTableFilters/StockTableFilters").StockFilterSummaryLine[]} */
    const lines = [];
    if (customerLabel) lines.push({ label: t("filterCustomer"), value: customerLabel });
    if (statusLabel) lines.push({ label: t("filterStatus"), value: statusLabel });
    if (dateRangeLabel) lines.push({ label: t("filterDateRange"), value: dateRangeLabel });
    return lines;
  }, [dateRangeLabel, statusLabel, customerLabel, t]);

  const columns = useMemo(
    () =>
      getSalesInvoiceTableColumns(t, {
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
          <Form.Item label={t("filterCustomer")}>
            <Select
              className="w-full"
              value={customerFilter ?? ""}
              options={customerFilterOptions}
              loading={customersQuery.isPending}
              showSearch
              optionFilterProp="label"
              onChange={(v) => setCustomerFilter(v === "" ? undefined : String(v))}
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
        tableId="sales-invoices"
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
        scrollX={1100}
        pagination={pagination}
      />
    </div>
  );
}

export default function SalesInvoicesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <SalesInvoicesTable />
      </Suspense>
    </div>
  );
}
