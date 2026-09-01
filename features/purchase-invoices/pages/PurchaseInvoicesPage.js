"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { deletePurchaseInvoice, postPurchaseInvoice } from "../api/purchaseInvoices.api";
import { PURCHASE_INVOICES_QUERY_KEY } from "../queries/purchaseInvoiceQueryKeys";
import { GOODS_RECEIPT_DETAIL_QUERY_PREFIX, GOODS_RECEIPTS_QUERY_KEY } from "@/features/stock/queries/stockQueryKeys";
import { usePurchaseInvoicesTableQuery } from "../queries/usePurchaseInvoicesTableQuery";
import { getPurchaseInvoiceTableColumns } from "../components/PurchaseInvoiceTable/getPurchaseInvoiceTableColumns";
import {
  PURCHASE_INVOICE_STATUS_VALUES,
  getPurchaseInvoiceStatusLabel,
} from "../utils/purchaseInvoiceStatuses";
import { fetchSupplierNames } from "@/features/suppliers/index";
import { SUPPLIERS_LIST_QUERY_KEY } from "@/features/suppliers";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, DatePicker, Select, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";

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
        label: String(s.name ?? s.id),
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

  const postMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => postPurchaseInvoice(id),
    onSuccess: () => {
      message.success(t("postSuccess"));
      queryClient.invalidateQueries({ queryKey: PURCHASE_INVOICES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: GOODS_RECEIPTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: GOODS_RECEIPT_DETAIL_QUERY_PREFIX });
    },
    onError: (err) => {
      notification.error({
        title: t("postError"),
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
        onOk: () => deleteMutation.mutateAsync(id),
      });
    },
    [modal, t, deleteMutation],
  );

  const handlePost = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      modal.confirm({
        title: t("postConfirmTitle"),
        content: t("postConfirmContent"),
        okText: t("actionPost"),
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(postMutation.mutateAsync(id)),
      });
    },
    [modal, t, postMutation],
  );

  const columns = useMemo(
    () =>
      getPurchaseInvoiceTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? handleDelete : undefined,
        onPost: access.canEdit ? handlePost : undefined,
      }),
    [t, access.canView, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer, handleDelete, handlePost],
  );

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
          extra: (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                className="min-w-[160px]"
                value={statusFilter ?? ""}
                options={statusFilterOptions}
                onChange={(v) => setStatusFilter(v === "" ? undefined : String(v))}
              />
              <Select
                className="min-w-[180px]"
                value={supplierFilter ?? ""}
                options={supplierFilterOptions}
                loading={suppliersQuery.isPending}
                showSearch
                optionFilterProp="label"
                onChange={(v) => setSupplierFilter(v === "" ? undefined : String(v))}
              />
              <DatePicker.RangePicker
                value={dateRange}
                onChange={(range) => setDateRange(range ?? null)}
                allowEmpty={[true, true]}
                format={dayjsDatePattern()}
              />
            </div>
          ),
        }}
        stickyHeader
        scrollX={1200}
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
