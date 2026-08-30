"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { useCurrenciesDelete } from "../queries/useCurrenciesDelete";
import { useCurrenciesTableQuery } from "../queries/useCurrenciesTableQuery";
import { SwapOutlined } from "@ant-design/icons";
import CurrencyRateHistoryModal from "../components/CurrencyRateHistoryModal/CurrencyRateHistoryModal";
import CurrencyExchangeRatesModal from "../components/CurrencyExchangeRatesModal/CurrencyExchangeRatesModal";
import { getCurrencyTableColumns } from "../components/CurrencyTable/getCurrencyTableColumns";
import { App, Button, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";

function CurrenciesTable() {
  const t = useTranslations("Currencies");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { message, notification, modal } = App.useApp();
  const access = useResourceAccess("currencies");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const { rows, isPending, isFetching, refetch, pagination, onSearchChange } = useCurrenciesTableQuery({
    t,
    tApiErrors,
    notification,
  });

  const [historyRecord, setHistoryRecord] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [exchangeOpen, setExchangeOpen] = useState(false);

  const {
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    getOpenRecordId,
  } = usePageDrawer("currencies");

  const { requestDeleteCurrency, openBulkDeleteConfirm, bulkDeletePending } = useCurrenciesDelete({
    t,
    tApiErrors,
    tDataTable,
    notification,
    message,
    modal,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenDrawerRecordId: getOpenRecordId,
    closeDrawer,
  });

  const openRateHistory = useCallback((record) => {
    setHistoryRecord(record && typeof record === "object" ? { ...record } : null);
  }, []);

  const columns = useMemo(
    () =>
      getCurrencyTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteCurrency : undefined,
        onRateHistory: access.canView ? openRateHistory : undefined,
      }),
    [
      t,
      access.canView,
      access.canEdit,
      access.canDelete,
      openViewDrawer,
      openEditDrawer,
      requestDeleteCurrency,
      openRateHistory,
    ],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="currencies"
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange,
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          showRefresh: true,
          onRefresh: () => refetch(),
          extra: access.canEdit ? (
            <Button icon={<SwapOutlined />} onClick={() => setExchangeOpen(true)}>
              {t("exchangeRatesButton")}
            </Button>
          ) : undefined,
        }}
        rowSelection={access.canDelete ? rowSelection : false}
        showSelectionBar={access.canDelete}
        onBulkDelete={access.canDelete ? openBulkDeleteConfirm : undefined}
        bulkDeleteLoading={bulkDeletePending}
        stickyHeader
        scrollX={1280}
        enableColumnDrag
        pagination={pagination}
      />
      <CurrencyRateHistoryModal
        open={historyRecord != null}
        currency={historyRecord}
        onClose={() => setHistoryRecord(null)}
      />
      <CurrencyExchangeRatesModal
        open={exchangeOpen}
        onClose={() => setExchangeOpen(false)}
      />
    </div>
  );
}

export default function CurrenciesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <CurrenciesTable />
      </Suspense>
    </div>
  );
}
