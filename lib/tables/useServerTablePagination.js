"use client";

import { DEFAULT_PAGE_SIZE } from "@/lib/tables/paginatedList";
import { loadPageSize, savePageSize } from "@/lib/table-prefs-storage";
import { useCallback, useEffect, useState } from "react";

/**
 * Page / page-size / search state for server-paginated tables.
 *
 * Pass `tableId` + `pageSizeOptions` to persist the chosen page size in localStorage.
 *
 * @param {{
 *   defaultPageSize?: number;
 *   tableId?: string;
 *   pageSizeOptions?: number[];
 * }} [options]
 */
export function useServerTablePagination({
  defaultPageSize = DEFAULT_PAGE_SIZE,
  tableId,
  pageSizeOptions,
} = {}) {
  const [page, setPage] = useState(1);
  // Always start with defaultPageSize so SSR and first client render match,
  // then apply the persisted value after hydration.
  const [perPage, setPerPage] = useState(defaultPageSize);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!tableId || !pageSizeOptions?.length) return;
    const saved = loadPageSize(tableId, pageSizeOptions, defaultPageSize);
    if (saved !== defaultPageSize) {
      setPerPage(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs once after mount
  }, []);

  const onPageChange = useCallback(
    (nextPage, nextSize) => {
      setPage(nextPage);
      setPerPage(nextSize);
      if (tableId) {
        savePageSize(tableId, nextSize);
      }
    },
    [tableId],
  );

  const onSearchChange = useCallback((nextSearch) => {
    setSearch(nextSearch);
    setPage(1);
  }, []);

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  return { page, perPage, search, onPageChange, onSearchChange, resetPage };
}
