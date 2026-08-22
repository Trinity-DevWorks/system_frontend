"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { fetchBrands } from "../api/brands.api";
import { getBrandStatusLabel } from "../components/BrandTable/getBrandTableColumns";
import { BRANDS_LIST_QUERY_KEY } from "./brandsQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useBrandsTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: BRANDS_LIST_QUERY_KEY,
    queryFn: fetchBrands,
    tableId: "brands",
    t,
    tApiErrors,
    notification,
  });

  const tableData = useMemo(
    () =>
      table.rows.map((row) => ({
        ...row,
        is_active_label: getBrandStatusLabel(row?.is_active, t),
      })),
    [table.rows, t],
  );

  return {
    tableData,
    isPending: table.isPending,
    isFetching: table.isFetching,
    refetch: table.refetch,
    pagination: table.pagination,
    onSearchChange: table.onSearchChange,
  };
}
