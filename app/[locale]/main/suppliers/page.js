"use client";

import tenantApiService from "@/API/TenantApiService";
import AppDataTable from "@/components/tables/AppDataTable";
import {
  getSupplierStatusLabel,
  getSupplierTableColumns,
} from "./getSupplierTableColumns";
import { useQuery } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

async function fetchSuppliers() {
  const data = await tenantApiService("GET", "suppliers");
  return Array.isArray(data) ? data : [];
}

function SuppliersTable() {
  const t = useTranslations("Suppliers");
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
    queryKey: ["tenant", "suppliers"],
    queryFn: fetchSuppliers,
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
        is_active_label: getSupplierStatusLabel(row?.is_active, t),
      })),
    [data, t],
  );

  const columns = useMemo(() => getSupplierTableColumns(t), [t]);

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <AppDataTable
      tableId="suppliers"
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
          "supplier_code",
          "name",
          "supplier_group.name",
          "phone",
          "email",
          "credit_limit",
          "balance",
          "is_active_label",
        ],
        showAdd: true,
        onAdd: () => message.info(t("addSoon")),
        showRefresh: true,
        onRefresh: () => refetch(),
      }}
      rowSelection={rowSelection}
      showSelectionBar
      stickyHeader
      scrollX={1560}
      enableColumnDrag
      pagination={{
        mode: "client",
        pageSize: 20,
        pageSizeOptions: [10, 20, 50],
      }}
    />
  );
}

export default function SuppliersPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-col p-2">
      <SuppliersTable />
    </div>
  );
}
