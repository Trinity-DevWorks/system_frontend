"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { deleteCurrency, fetchCurrencies } from "@/services/currenciesApi";
import { SwapOutlined } from "@ant-design/icons";
import CurrencyRateHistoryModal from "./CurrencyRateHistoryModal";
import CurrencyExchangeRatesModal from "./CurrencyExchangeRatesModal";
import CurrencyDrawer from "./drawer/CurrencyDrawer";
import { getCurrencyTableColumns } from "./getCurrencyTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function CurrenciesTable() {
  const t = useTranslations("Currencies");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, notification, modal } = App.useApp();
  const queryClient = useQueryClient();
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
      message: t("loadError"),
      description: getLocalizedApiErrorMessage(tApiErrors, error),
    });
  }, [isError, error, notification, t, tApiErrors]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(/** @type {"create" | "edit" | "view"} */ ("create"));
  const [drawerCurrencyId, setDrawerCurrencyId] = useState(/** @type {number | null} */ (null));
  const [drawerTableSeed, setDrawerTableSeed] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [historyRecord, setHistoryRecord] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [exchangeOpen, setExchangeOpen] = useState(false);

  const drawerSessionRef = useRef({ open: false, currencyId: /** @type {number | null} */ (null) });
  useEffect(() => {
    drawerSessionRef.current = { open: drawerOpen, currencyId: drawerCurrencyId };
  }, [drawerOpen, drawerCurrencyId]);

  const openCreateDrawer = useCallback(() => {
    setDrawerTableSeed(null);
    setDrawerMode("create");
    setDrawerCurrencyId(null);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerCurrencyId(Number(id));
    setDrawerOpen(true);
  }, []);

  const openViewDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("view");
    setDrawerCurrencyId(Number(id));
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerCurrencyId(null);
    setDrawerTableSeed(null);
  }, []);

  const handleCurrencyCreated = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerCurrencyId(Number(id));
  }, []);

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
        message: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "currencies", deletedId] });
      const { open, currencyId } = drawerSessionRef.current;
      if (open && currencyId === deletedId) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "currencies"] });
    },
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
        onView: openViewDrawer,
        onEdit: openEditDrawer,
        onDelete: requestDeleteCurrency,
        onRateHistory: openRateHistory,
      }),
    [t, openViewDrawer, openEditDrawer, requestDeleteCurrency, openRateHistory],
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
          showAdd: true,
          onAdd: openCreateDrawer,
          showRefresh: true,
          onRefresh: () => refetch(),
          extra: (
            <Button icon={<SwapOutlined />} onClick={() => setExchangeOpen(true)}>
              {t("exchangeRatesButton")}
            </Button>
          ),
        }}
        rowSelection={rowSelection}
        showSelectionBar
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
        currencyId={drawerCurrencyId}
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
      <CurrenciesTable />
    </div>
  );
}
