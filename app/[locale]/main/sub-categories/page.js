"use client";

import tenantApiService from "@/API/TenantApiService";
import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { getSubCategoryTableColumns } from "./getSubCategoryTableColumns";
import { useQuery } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

async function fetchSubCategories() {
  const data = await tenantApiService("GET", "sub-categories");
  return Array.isArray(data) ? data : [];
}

function getCategoryName(row) {
  const name = row?.category?.name;
  return typeof name === "string" ? name.trim() : "";
}

function SubCategoriesTable() {
  const t = useTranslations("SubCategories");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, notification } = App.useApp();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    data = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant", "sub-categories"],
    queryFn: fetchSubCategories,
    staleTime: 5 * 60_000, // 5 minutes
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
        category_name: getCategoryName(row),
      })),
    [data],
  );

  const columns = useMemo(() => getSubCategoryTableColumns(t), [t]);

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <AppDataTable
      tableId="sub-categories"
      columns={columns}
      dataSource={tableData}
      rowKey="id"
      loading={isPending}
      refreshFetching={isFetching}
      onRetry={() => refetch()}
      emptyText={t("empty")}
      toolbar={{
        showSearch: true,
        searchKeys: ["name", "id", "category_id", "category_name"],
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

export default function SubCategoriesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-col p-2">
      <SubCategoriesTable />
    </div>
  );
}
