"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { useResourceAccess } from "@/lib/permissions";
import { parseNumericEntityId } from "@/lib/entityId";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { deleteCurrency, fetchCurrencies } from "@/services/currenciesApi";
import { SwapOutlined } from "@ant-design/icons";
import CurrencyRateHistoryModal from "./CurrencyRateHistoryModal";
import CurrencyExchangeRatesModal from "./CurrencyExchangeRatesModal";
import CurrencyDrawer from "./drawer/CurrencyDrawer";
import { getCurrencyTableColumns } from "./getCurrencyTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function CurrenciesTable() {
  const t = useTranslations("Currencies");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { message, notification, modal } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("currencies");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    data = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant", "currencies"],
    queryFn: fetchCurrencies,
    staleTime: 5 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!isError || !error) return;
    notification.error({
      title: t("loadError"),
      description: getLocalizedApiErrorMessage(tApiErrors, error),
    });
  }, [isError, error, notification, t, tApiErrors]);

  const [historyRecord, setHistoryRecord] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [exchangeOpen, setExchangeOpen] = useState(false);

  const {
    open: drawerOpen,
    mode: drawerMode,
    recordId: drawerCurrencyId,
    tableSeed: drawerTableSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated: handleCurrencyCreated,
    sessionRef: drawerSessionRef,
  } = useResourceDrawerUrl({ parseId: parseNumericEntityId });

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteCurrency(id),
    onMutate: async (id) => {
      const listKey = ["tenant", "currencies"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old) =>
        Array.isArray(old) ? old.filter((row) => row.id !== id) : old,
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "currencies"], context.previous);
      }
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "currencies", deletedId] });
      const { open, recordId } = drawerSessionRef.current;
      if (open && recordId != null && Number(recordId) === Number(deletedId)) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "currencies"] });
    },
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ["tenant", "currencies"],
    deleteOne: deleteCurrency,
    message,
    notification,
    modal,
    tDataTable,
    tEntity: t,
    tApiErrors,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenRecordId: () => drawerSessionRef.current.recordId,
    closeDrawer,
  });

  const requestDeleteCurrency = useCallback(
    (record) => {
      const id = record?.id;
      if (id == null) return;
      const name = typeof record?.name === "string" ? record.name : String(record?.code ?? id);
      modal.confirm({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent", { name }),
        okText: t("deleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("deleteConfirmCancel"),
        onOk: async () => {
          try {
            await deleteMutation.mutateAsync(Number(id));
          } catch {
            // onError on mutation already shows feedback; resolve so confirm closes.
          }
        },
      });
    },
    [deleteMutation, modal, t],
  );

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
        dataSource={data}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          searchKeys: ["id", "code", "iso_code", "name", "symbol"],
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
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50],
        }}
      />
      <CurrencyDrawer
        open={drawerOpen}
        mode={drawerMode}
        currencyId={drawerCurrencyId == null ? null : Number(drawerCurrencyId)}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleCurrencyCreated}
      />
      <CurrencyRateHistoryModal
        open={historyRecord != null}
        currency={historyRecord}
        onClose={() => setHistoryRecord(null)}
      />
      <CurrencyExchangeRatesModal
        open={exchangeOpen}
        currencies={Array.isArray(data) ? data : []}
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
