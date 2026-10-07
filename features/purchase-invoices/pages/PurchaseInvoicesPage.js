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
import { DRAWER_ID_PARAM, RESOURCE_DRAWER_CREATE_TOKEN } from "@/lib/drawer/drawerUrl";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { fetchSupplierNames } from "@/features/suppliers/index";
import { SUPPLIERS_LIST_QUERY_KEY } from "@/features/suppliers/queries/suppliersQueryKeys";
import { deletePurchaseInvoice, postPurchaseInvoice, reversePurchaseInvoice, reissuePurchaseInvoice } from "../api/purchaseInvoices.api";
import {
  createVendorPortalLink,
  createPurchaseInvoiceProofDisclosure,
  fetchPurchaseInvoiceProofFields,
} from "../api/purchaseInvoices.api";
import { purchaseInvoiceProofPortalAbsoluteUrl } from "../utils/invoiceProofPortalUrl";
import InvoiceChainCheckButton from "@/features/sales-invoices/components/InvoiceChainCheckButton";
import SalesInvoiceBuyerLinkModal from "@/features/sales-invoices/components/SalesInvoiceDrawer/SalesInvoiceBuyerLinkModal";
import SalesInvoiceProofDisclosureModal from "@/features/sales-invoices/components/SalesInvoiceDrawer/SalesInvoiceProofDisclosureModal";
import { usePurchaseInvoiceProofMutations } from "../queries/usePurchaseInvoiceProofMutations";
import { useCompanySettings } from "@/lib/company-settings";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, DatePicker, Form, Select, Spin } from "antd";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
  purchaseInvoiceCanReissue,
  purchaseInvoiceCanReverse,
} from "../utils/purchaseInvoiceStatuses";

function PurchaseInvoicesTable() {
  const t = useTranslations("PurchaseInvoices");
  const tSales = useTranslations("SalesInvoices");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const drawerId = searchParams.get(DRAWER_ID_PARAM);
  const access = useResourceAccess("purchase_invoices");
  const invoiceProofsAccess = useResourceAccess("invoice_proofs");
  const { settings } = useCompanySettings();
  const showChainCheck = Boolean(settings.invoiceProofsEnabled) && invoiceProofsAccess.canView;

  useEffect(() => {
    if (!drawerId || drawerId === RESOURCE_DRAWER_CREATE_TOKEN) return;
    queryClient.invalidateQueries({ queryKey: PURCHASE_INVOICES_QUERY_KEY });
  }, [drawerId, queryClient]);

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

  const invalidateAfterStatusChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: PURCHASE_INVOICES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: PURCHASE_INVOICE_DETAIL_QUERY_PREFIX });
    queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_DETAIL_QUERY_PREFIX });
    queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
  }, [queryClient]);

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

  const postMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => postPurchaseInvoice(id),
    onSuccess: () => {
      message.success(t("postSuccess"));
      invalidateAfterStatusChange();
    },
    onError: (err) => {
      notification.error({
        title: t("postError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const handlePost = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      const hasGrn = record?.goods_receipt_id != null && record.goods_receipt_id !== "";
      modal.confirm({
        title: t("postConfirmTitle"),
        content: hasGrn ? t("postConfirmContentApOnly") : t("postConfirmContentApAndStock"),
        okText: t("postConfirmOk"),
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(postMutation.mutateAsync(id)),
      });
    },
    [modal, t, postMutation],
  );

  const reverseMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => reversePurchaseInvoice(id),
    onSuccess: () => {
      message.success(t("reverseSuccess"));
      invalidateAfterStatusChange();
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
      if (!purchaseInvoiceCanReverse(record)) return;
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

  const reissueMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => reissuePurchaseInvoice(id),
    onSuccess: (record) => {
      message.success(t("reissueSuccess"));
      invalidateAfterStatusChange();
      openEditDrawer(record);
    },
    onError: (err) => {
      notification.error({
        title: t("reissueError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const handleReissue = useCallback(
    (record) => {
      if (!purchaseInvoiceCanReissue(record)) return;
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      modal.confirm({
        title: t("reissueConfirmTitle"),
        content: t("reissueConfirmContent"),
        okText: t("actionReissue"),
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(reissueMutation.mutateAsync(id)),
      });
    },
    [modal, t, reissueMutation],
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

  const { refreshFromRow, approveFromRow } = usePurchaseInvoiceProofMutations({
    message,
    notification,
    t,
    tSales,
    tApiErrors,
  });
  const [supplierLinkRow, setSupplierLinkRow] = useState(
    /** @type {{ id: string; number: string | null } | null} */ (null),
  );
  const [shareProofRow, setShareProofRow] = useState(
    /** @type {{ id: string; number: string | null } | null} */ (null),
  );

  const proofRowTarget = useCallback((record) => {
    const id = normalizeEntityId(record?.id);
    if (id == null) return null;
    return {
      id: String(id),
      number: typeof record?.invoice_number === "string" ? record.invoice_number : null,
    };
  }, []);

  const handleRefreshProof = useCallback(
    (record) => {
      const target = proofRowTarget(record);
      if (target) refreshFromRow(target.id);
    },
    [proofRowTarget, refreshFromRow],
  );

  const handleApproveProof = useCallback(
    (record) => {
      const target = proofRowTarget(record);
      if (target) approveFromRow(target.id);
    },
    [proofRowTarget, approveFromRow],
  );

  const handleSupplierLink = useCallback((record) => setSupplierLinkRow(proofRowTarget(record)), [proofRowTarget]);
  const handleShareProof = useCallback((record) => setShareProofRow(proofRowTarget(record)), [proofRowTarget]);

  const columns = useMemo(
    () =>
      getPurchaseInvoiceTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? handleDelete : undefined,
        onPost: access.canEdit ? handlePost : undefined,
        onReverse: access.canReverse ? handleReverse : undefined,
        onReissue: access.canAdd ? handleReissue : undefined,
        showChainStatus: showChainCheck,
        onRefreshProof: showChainCheck ? handleRefreshProof : undefined,
        onApproveProof: showChainCheck && invoiceProofsAccess.canEdit ? handleApproveProof : undefined,
        onSupplierLink: showChainCheck ? handleSupplierLink : undefined,
        onShareProof: showChainCheck ? handleShareProof : undefined,
      }),
    [
      t,
      access.canView,
      access.canEdit,
      access.canDelete,
      access.canReverse,
      access.canAdd,
      openViewDrawer,
      openEditDrawer,
      handleDelete,
      handlePost,
      handleReverse,
      handleReissue,
      showChainCheck,
      invoiceProofsAccess.canEdit,
      handleRefreshProof,
      handleApproveProof,
      handleSupplierLink,
      handleShareProof,
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
          extra: (
            <>
              {showChainCheck ? (
                <InvoiceChainCheckButton
                  canRun={invoiceProofsAccess.canEdit}
                  onOpenInvoice={access.canView ? (id) => openViewDrawer({ id }) : undefined}
                />
              ) : null}
              {filterToggle}
            </>
          ),
          filterBar,
        }}
        stickyHeader
        scrollX={1760}
        pagination={pagination}
      />
      {showChainCheck ? (
        <>
          <SalesInvoiceBuyerLinkModal
            open={supplierLinkRow != null}
            invoiceId={supplierLinkRow?.id ?? null}
            invoiceNumber={supplierLinkRow?.number ?? null}
            onClose={() => setSupplierLinkRow(null)}
            t={t}
            actionLabel={t("actionSupplierLink")}
            issueLink={createVendorPortalLink}
            absoluteUrl={purchaseInvoiceProofPortalAbsoluteUrl}
            copySuccessKey="copySupplierLinkSuccess"
            copyErrorKey="copySupplierLinkError"
          />
          <SalesInvoiceProofDisclosureModal
            open={shareProofRow != null}
            invoiceId={shareProofRow?.id ?? null}
            invoiceNumber={shareProofRow?.number ?? null}
            onClose={() => setShareProofRow(null)}
            fetchFields={fetchPurchaseInvoiceProofFields}
            createDisclosure={createPurchaseInvoiceProofDisclosure}
          />
        </>
      ) : null}
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
