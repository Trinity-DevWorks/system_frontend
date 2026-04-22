"use client";

import tenantApiService from "@/API/TenantApiService";
import AppDataTable from "@/components/tables/AppDataTable";
import { getCategoryTableColumns } from "./getCategoryTableColumns";
import { useQuery } from "@tanstack/react-query";
import { App, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

async function fetchCategories() {
  const data = await tenantApiService("GET", "categories");
  return Array.isArray(data) ? data : [];
}

function CategoriesTable() {
  const t = useTranslations("Categories");
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
    queryKey: ["tenant", "categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  
  const fetchError = useMemo(() => {
    if (!isError || !error) return null;
    return error instanceof Error ? error : new Error(String(error));
  }, [isError, error]);

  const columns = useMemo(() => getCategoryTableColumns(t), [t]);

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <AppDataTable
      tableId="categories"
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
        searchKeys: ["name", "id"], 
        showAdd: true,
        onAdd: () => message.info(t("addSoon")),
        showRefresh: true,
        onRefresh: () => refetch(),
      }}
      rowSelection={rowSelection}
      showSelectionBar
      stickyHeader
      scrollX={1000}
      pagination={{
        mode: "client",
        pageSize: 20,
        pageSizeOptions: [10, 20, 50],
      }}
    />
  );
}

export default function CategoriesPage() {
  const t = useTranslations("Categories");

  return (
    <div className="flex min-h-0 min-w-0 flex-col p-2">
      {/* <Typography.Title level={4} style={{ marginTop: 0 }}>
        {t("title")}
      </Typography.Title> */}
      <CategoriesTable />
    </div>
  );
}
