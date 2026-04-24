"use client";

import tenantApiService from "@/API/TenantApiService";
import AppDataTable from "@/components/tables/AppDataTable";
import {
  getUnitGroupDimensionTypeLabel,
  getUnitGroupStatusLabel,
  getUnitGroupTableColumns,
} from "./getUnitGroupTableColumns";
import { useQuery } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

async function fetchUnitGroups() {
  const data = await tenantApiService("GET", "unit-groups");
  return Array.isArray(data) ? data : [];
}

function UnitGroupsTable() {
  const t = useTranslations("UnitGroups");
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
    queryKey: ["tenant", "unit-groups"],
    queryFn: fetchUnitGroups,
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
        dimension_type_label: getUnitGroupDimensionTypeLabel(
          row?.dimension_type,
          t,
        ),
        is_active_label: getUnitGroupStatusLabel(row?.is_active, t),
      })),
    [data, t],
  );

  const columns = useMemo(() => getUnitGroupTableColumns(t), [t]);

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <AppDataTable
      tableId="unit-groups"
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
          "code",
          "name",
          "dimension_type",
          "dimension_type_label",
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
      scrollX={1160}
      pagination={{
        mode: "client",
        pageSize: 20,
        pageSizeOptions: [10, 20, 50],
      }}
    />
  );
}

export default function UnitGroupsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-col p-2">
      <UnitGroupsTable />
    </div>
  );
}
