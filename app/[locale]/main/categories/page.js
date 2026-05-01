"use client";

import tenantApiService from "@/API/TenantApiService";
import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import {
  getCategoryStatusLabel,
  getCategoryTableColumns,
} from "./getCategoryTableColumns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

async function fetchCategories({ refresh = false } = {}) {
  const endpoint = refresh ? "categories?refresh=1" : "categories";
  const data = await tenantApiService("GET", endpoint);
  return Array.isArray(data) ? data : [];
}

function CategoriesTable() {
  const t = useTranslations("Categories");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, notification } = App.useApp();
  const queryClient = useQueryClient();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const {
    data = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant", "categories"],
    queryFn: fetchCategories,
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

  const tableData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        description: typeof row?.description === "string" ? row.description.trim() : null,
        is_active_label: getCategoryStatusLabel(row?.is_active, t),
      })),
    [data, t],
  );

  const columns = useMemo(() => getCategoryTableColumns(t), [t]);

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      const freshData = await fetchCategories({ refresh: true });
      queryClient.setQueryData(["tenant", "categories"], freshData);
    } catch (err) {
      notification.error({
        message: t("loadError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
      return { isError: true };
    } finally {
      setManualRefreshing(false);
    }
  };

  return (
    <AppDataTable
      tableId="categories"
      columns={columns}
      dataSource={tableData}
      rowKey="id"
      loading={isPending}
      refreshFetching={isFetching || manualRefreshing}
      onRetry={() => refetch()}
      emptyText={t("empty")}
      toolbar={{
        showSearch: true,
        searchKeys: ["code", "name", "id", "color", "description", "is_active_label"],
        showAdd: true,
        onAdd: () => message.info(t("addSoon")),
        showRefresh: true,
        onRefresh: handleRefresh,
      }}
      rowSelection={rowSelection}
      showSelectionBar
      stickyHeader
      scrollX={1420}
      enableColumnDrag
      pagination={{
        mode: "client",
        pageSize: 20,
        pageSizeOptions: [10, 20, 50],
      }}
    />
  );
}

export default function CategoriesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-col p-0">
      <CategoriesTable />
    </div>
  );
}
