"use client";

import tenantApiService from "@/API/TenantApiService";
import AppDataTable from "@/components/tables/AppDataTable";
import {
  getWarehouseDefaultLabel,
  getWarehouseStatusLabel,
  getWarehouseTableColumns,
} from "./getWarehouseTableColumns";
import { useQuery } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

async function fetchWarehouses() {
  const data = await tenantApiService("GET", "warehouses");
  return Array.isArray(data) ? data : [];
}

function WarehousesTable() {
  const t = useTranslations("Warehouses");
  const { message } = App.useApp();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    data = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant", "warehouses"],
    queryFn: fetchWarehouses,
    staleTime: 5 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const fetchError = useMemo(() => {
    if (!isError || !error) return null;
    return error instanceof Error ? error : new Error(String(error));
  }, [isError, error]);

  const tableData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        is_active_label: getWarehouseStatusLabel(row?.is_active, t),
        is_default_label: getWarehouseDefaultLabel(row?.is_default, t),
      })),
    [data, t],
  );

  const columns = useMemo(() => getWarehouseTableColumns(t), [t]);

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <AppDataTable
      tableId="warehouses"
      columns={columns}
      dataSource={tableData}
      rowKey="id"
      loading={isPending}
      refreshFetching={isFetching}
      fetchError={fetchError}
      onRetry={() => refetch()}
      emptyText={t("empty")}
      toolbar={{
        showSearch: true,
        searchKeys: [
          "id",
          "name",
          "shortcut_name",
          "is_active_label",
          "is_default_label",
        ],
        showAdd: true,
        onAdd: () => message.info(t("addSoon")),
        showRefresh: true,
        onRefresh: () => refetch(),
      }}
      rowSelection={rowSelection}
      showSelectionBar
      stickyHeader
      scrollX={1160}
      enableColumnDrag
      pagination={{
        mode: "client",
        pageSize: 20,
        pageSizeOptions: [10, 20, 50],
      }}
    />
  );
}

export default function WarehousesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-col p-2">
      <WarehousesTable />
    </div>
  );
}
