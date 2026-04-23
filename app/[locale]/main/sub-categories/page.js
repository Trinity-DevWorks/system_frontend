"use client";

import tenantApiService from "@/API/TenantApiService";
import AppDataTable from "@/components/tables/AppDataTable";
import { getSubCategoryTableColumns } from "./getSubCategoryTableColumns";
import { useQuery } from "@tanstack/react-query";
import { App, Select } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

async function fetchSubCategories() {
  const data = await tenantApiService("GET", "sub-categories");
  return Array.isArray(data) ? data : [];
}

function getCategoryName(row) {
  const name = row?.category?.name;
  return typeof name === "string" ? name.trim() : "";
}

const hasValue = (value) => value !== null && typeof value !== "undefined";

function SubCategoriesTable() {
  const t = useTranslations("SubCategories");
  const { message } = App.useApp();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState();
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

  const fetchError = useMemo(() => {
    if (!isError || !error) return null;
    return error instanceof Error ? error : new Error(String(error));
  }, [isError, error]);

  const tableData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        category_name: getCategoryName(row),
      })),
    [data],
  );

  const categoryOptions = useMemo(() => {
    const optionsById = new Map();

    for (const row of tableData) {
      const categoryId = row?.category_id;
      if (!hasValue(categoryId)) continue;

      const value = String(categoryId);
      if (optionsById.has(value)) continue;

      const categoryName = row.category_name;
      optionsById.set(value, {
        value,
        label: categoryName ? `${categoryName} (#${categoryId})` : `#${categoryId}`,
      });
    }

    return [...optionsById.values()].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [tableData]);

  const activeCategoryId = useMemo(() => {
    if (!selectedCategoryId) return undefined;
    return categoryOptions.some((option) => option.value === selectedCategoryId)
      ? selectedCategoryId
      : undefined;
  }, [categoryOptions, selectedCategoryId]);

  const filteredTableData = useMemo(() => {
    if (!activeCategoryId) return tableData;
    return tableData.filter(
      (row) => String(row?.category_id) === activeCategoryId,
    );
  }, [activeCategoryId, tableData]);

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
      dataSource={filteredTableData}
      rowKey="id"
      loading={isPending}
      refreshFetching={isFetching}
      fetchError={fetchError}
      onRetry={() => refetch()}
      emptyText={t("empty")}
      toolbar={{
        showSearch: true,
        searchKeys: ["name", "id", "category_id", "category_name"],
        showAdd: true,
        onAdd: () => message.info(t("addSoon")),
        showRefresh: true,
        onRefresh: () => refetch(),
        extra: (
          <Select
            allowClear
            showSearch
            disabled={!categoryOptions.length}
            value={activeCategoryId}
            placeholder={t("filterCategory")}
            options={categoryOptions}
            optionFilterProp="label"
            style={{ minWidth: 220 }}
            aria-label={t("filterCategory")}
            onChange={(value) => {
              setSelectedCategoryId(value);
              setSelectedRowKeys([]);
            }}
          />
        ),
      }}
      rowSelection={rowSelection}
      showSelectionBar
      stickyHeader
      scrollX={1180}
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
