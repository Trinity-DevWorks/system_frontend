"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { SALES_CREDIT_NOTE_DETAIL_QUERY_PREFIX, SALES_CREDIT_NOTES_QUERY_KEY } from "../queries/salesCreditNotesQueryKeys";
import { SALES_INVOICE_DETAIL_QUERY_PREFIX, SALES_INVOICES_QUERY_KEY } from "@/features/sales-invoices/queries/salesInvoicesQueryKeys";
import { STOCK_BALANCES_QUERY_KEY, STOCK_MOVEMENTS_QUERY_KEY } from "@/features/stock/queries/stockQueryKeys";
import { CUSTOMER_LEDGER_QUERY_KEY } from "@/features/customer-ledger/customerLedgerConfig";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { normalizeEntityId } from "@/lib/entityId";
import { useResourceAccess } from "@/lib/permissions";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { deleteSalesCreditNote, fetchSalesCreditNotes, postSalesCreditNote, reverseSalesCreditNote } from "../api/salesCreditNotes.api";
import { fetchCustomerNames } from "@/features/customers/index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, DatePicker, Form, Select, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";
import { SALES_CREDIT_NOTE_STATUS_VALUES, getSalesCreditNoteStatusLabel } from "../utils/salesCreditNoteStatuses";
import {
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "@/features/stock/components/StockTableFilters/StockTableFilters";
import { getSalesCreditNoteTableColumns } from "../components/SalesCreditNotesTable/getSalesCreditNoteTableColumns";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { CUSTOMERS_LIST_QUERY_KEY } from "@/features/customers";

function SalesCreditNotesTable() {
  const t = useTranslations("SalesCreditNotes");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("sales_credit_notes");

  const [statusFilter, setStatusFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [customerFilter, setCustomerFilter] = useState(/** @type {string | undefined} */ (undefined));
  const [dateRange, setDateRange] = useState(
    /** @type {[import("dayjs").Dayjs, import("dayjs").Dayjs] | null} */ (null),
  );

  const fromIso = dateRange?.[0]?.format("YYYY-MM-DD");
  const toIso = dateRange?.[1]?.format("YYYY-MM-DD");

  const extraParams = useMemo(
    () => ({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(customerFilter ? { customer_id: customerFilter } : {}),
      ...(fromIso ? { from: fromIso } : {}),
      ...(toIso ? { to: toIso } : {}),
    }),
    [statusFilter, customerFilter, fromIso, toIso],
  );

  const table = useTenantPaginatedTable({
    queryKey: SALES_CREDIT_NOTES_QUERY_KEY,
    queryFn: fetchSalesCreditNotes,
    extraParams,
    defaultPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    staleTime: QUERY_STALE_TIME.ledger,
    tableId: "sales-credit-notes",
    t,
    tApiErrors,
    notification,
  });

  const customersQuery = useQuery({
    queryKey: CUSTOMERS_LIST_QUERY_KEY,
    queryFn: fetchCustomerNames,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const tableData = useMemo(
    () =>
      table.rows.map((row) => ({
        ...row,
        customer_name: row?.customer?.name ?? "",
      })),
    [table.rows],
  );

  const { openCreateDrawer, openEditDrawer, openViewDrawer } = usePageDrawer("salesCreditNotes");

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SALES_CREDIT_NOTES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: SALES_CREDIT_NOTE_DETAIL_QUERY_PREFIX });
    queryClient.invalidateQueries({ queryKey: SALES_INVOICES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: SALES_INVOICE_DETAIL_QUERY_PREFIX });
    queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: CUSTOMER_LEDGER_QUERY_KEY });
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => deleteSalesCreditNote(id),
    onSuccess: () => {
      message.success(t("deleteSuccess"));
      invalidateAll();
    },
    onError: (err) => {
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const postMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => postSalesCreditNote(id),
    onSuccess: () => {
      message.success(t("postSuccess"));
      invalidateAll();
    },
    onError: (err) => {
      notification.error({
        title: t("postError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const reverseMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => reverseSalesCreditNote(id),
    onSuccess: () => {
      message.success(t("reverseSuccess"));
      invalidateAll();
    },
    onError: (err) => {
      notification.error({
        title: t("reverseError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
  });

  const handleDelete = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      modal.confirm({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent", { name: record.credit_note_number || id }),
        okText: t("deleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(deleteMutation.mutateAsync(id)),
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
        okText: t("postConfirmOk"),
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(postMutation.mutateAsync(id)),
      });
    },
    [modal, t, postMutation],
  );

  const handleReverse = useCallback(
    (record) => {
      const id = normalizeEntityId(record?.id);
      if (id == null) return;
      modal.confirm({
        title: t("reverseConfirmTitle"),
        content: t("reverseConfirmContent"),
        okText: t("actionReverse"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => closeConfirmOnError(reverseMutation.mutateAsync(id)),
      });
    },
    [modal, t, reverseMutation],
  );

  const columns = useMemo(
    () =>
      getSalesCreditNoteTableColumns(t, {
        onView: openViewDrawer,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? handleDelete : undefined,
        onPost: access.canEdit ? handlePost : undefined,
        onReverse: access.canReverse ? handleReverse : undefined,
      }),
    [t, openViewDrawer, openEditDrawer, access, handleDelete, handlePost, handleReverse],
  );

  const { filterToggle, filterBar } = useStockTableFilters({
    hasActiveFilters: Boolean(statusFilter || customerFilter || dateRange),
    onClear: () => {
      setStatusFilter(undefined);
      setCustomerFilter(undefined);
      setDateRange(null);
    },
    bar: (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={stockFilterFieldRowClassName}>
          <Form.Item label={t("filterCustomer")}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              value={customerFilter ?? ""}
              options={[
                { value: "", label: t("filterAllCustomers") },
                ...(customersQuery.data ?? []).map((c) => ({
                  value: c.id,
                  label: String(c.name ?? c.id),
                })),
              ]}
              onChange={(v) => setCustomerFilter(v === "" ? undefined : String(v))}
            />
          </Form.Item>
        </div>
        <div className={stockFilterFieldRowClassName}>
          <Form.Item label={t("filterStatus")}>
            <Select
              allowClear
              value={statusFilter ?? ""}
              options={[
                { value: "", label: t("filterAllStatuses") },
                ...SALES_CREDIT_NOTE_STATUS_VALUES.map((value) => ({
                  value,
                  label: getSalesCreditNoteStatusLabel(t, value),
                })),
              ]}
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
        tableId="sales-credit-notes"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={table.isPending}
        refreshFetching={table.isFetching}
        onRetry={() => table.refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange: table.onSearchChange,
          showRefresh: true,
          onRefresh: () => table.refetch(),
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          addLabel: t("toolbarNew"),
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1100}
        pagination={table.pagination}
      />
    </div>
  );
}

export default function SalesCreditNotesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <SalesCreditNotesTable />
      </Suspense>
    </div>
  );
}
