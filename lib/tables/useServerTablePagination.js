"use client";

import { DEFAULT_PAGE_SIZE } from "@/lib/tables/paginatedList";
import { loadPageSize, savePageSize } from "@/lib/table-prefs-storage";
import { useCallback, useEffect, useState } from "react";

/**
 * Page / page-size / search state for server-paginated tables.
 *
 * Pass `tableId` + `pageSizeOptions` to persist the chosen page size in localStorage.
 * The first paint always uses `defaultPageSize` so SSR and hydration match; the
 * stored size is applied on the next macrotask.
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
  const [perPage, setPerPage] = useState(defaultPageSize);
  const [search, setSearch] = useState("");

  const optionsKey = (pageSizeOptions ?? []).join(",");

  useEffect(() => {
    if (!tableId || !optionsKey) return;
    const options = optionsKey.split(",").map(Number);
    const id = tableId;
    const fallback = defaultPageSize;
    const timer = window.setTimeout(() => {
      const saved = loadPageSize(id, options, fallback);
      setPerPage((current) => (saved !== current ? saved : current));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [tableId, defaultPageSize, optionsKey]);

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
