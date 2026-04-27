"use client";

import tenantApiService from "@/API/TenantApiService";
import AppDataTable from "@/components/tables/AppDataTable";
import { getVatGroupTableColumns } from "./getVatGroupTableColumns";
import { useQuery } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

async function fetchVatGroups() {
  const data = await tenantApiService("GET", "vat-groups");
  return Array.isArray(data) ? data : [];
}

function VatGroupsTable() {
  const t = useTranslations("VatGroups");
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
    queryKey: ["tenant", "vat-groups"],
    queryFn: fetchVatGroups,
    staleTime: 5 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const fetchError = useMemo(() => {
    if (!isError || !error) return null;
    return error instanceof Error ? error : new Error(String(error));
  }, [isError, error]);

  const columns = useMemo(() => getVatGroupTableColumns(t), [t]);

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <AppDataTable
      tableId="vat-groups"
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={isPending}
      refreshFetching={isFetching}
      fetchError={fetchError}
      onRetry={() => refetch()}
      emptyText={t("empty")}
      toolbar={{
        showSearch: true,
        searchKeys: ["id", "abrv", "name", "percentage"],
        showAdd: true,
        onAdd: () => message.info(t("addSoon")),
        showRefresh: true,
        onRefresh: () => refetch(),
      }}
      rowSelection={rowSelection}
      showSelectionBar
      stickyHeader
      scrollX={1180}
      enableColumnDrag
      pagination={{
        mode: "client",
        pageSize: 20,
        pageSizeOptions: [10, 20, 50],
      }}
    />
  );
}

export default function VatGroupsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-col p-2">
      <VatGroupsTable />
    </div>
  );
}
