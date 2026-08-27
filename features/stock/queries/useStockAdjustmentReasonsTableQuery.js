import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { STOCK_ADJUSTMENT_REASONS_QUERY_KEY } from "./stockQueryKeys";
import { fetchStockAdjustmentReasons } from "../api/stockAdjustmentReasons.api";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useStockAdjustmentReasonsTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: STOCK_ADJUSTMENT_REASONS_QUERY_KEY,
    queryFn: fetchStockAdjustmentReasons,
    defaultPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    staleTime: QUERY_STALE_TIME.catalog,
    tableId: "stock-adjustment-reasons",
    t,
    tApiErrors,
    notification,
  });

  return {
    tableData: table.rows,
    isPending: table.isPending,
    isFetching: table.isFetching,
    refetch: table.refetch,
    pagination: table.pagination,
    onSearchChange: table.onSearchChange,
  };
}
