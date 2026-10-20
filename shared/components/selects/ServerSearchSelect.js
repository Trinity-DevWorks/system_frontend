"use client";

import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import {
  clearRecentSelectorOptions,
  readRecentSelectorOptions,
  rememberRecentSelectorOption,
} from "@/lib/recentSelectorOptions";
import { PlusOutlined } from "@ant-design/icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button, Select, Spin } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

export const SERVER_SEARCH_PAGE_SIZE = 20;

const RESULTS_PENDING_VALUE = "__server_search_results_pending__";
const RESULTS_EMPTY_VALUE = "__server_search_results_empty__";

/**
 * @param {Array<{ value: unknown } | null | undefined>} lists
 * @returns {Record<string, unknown>[]}
 */
function mergeUniqueOptions(...lists) {
  /** @type {Map<string, Record<string, unknown>>} */
  const map = new Map();
  for (const list of lists) {
    for (const row of list ?? []) {
      if (!row || row.value == null || row.value === "") continue;
      const key = String(row.value);
      if (!map.has(key)) map.set(key, row);
    }
  }
  return [...map.values()];
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} needle lowercase trimmed input
 */
function optionMatchesLiveSearch(row, needle) {
  if (!needle) return true;
  const parts = [
    row.label,
    row.value,
    row.code,
    row.barcode,
    row.name,
    row.searchText,
    row.phone,
    row.email,
    row.sku,
    row.item_code,
    row.customer_code,
  ];
  return parts.some((part) => part != null && String(part).toLowerCase().includes(needle));
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} needle
 * @param {Record<string, unknown>[]} catalogRows
 * @param {boolean} searching
 * @param {boolean} showingPrevious
 */
function recentRowMatchesSearch(row, needle, catalogRows, searching, showingPrevious) {
  if (!searching) return true;
  if (optionMatchesLiveSearch(row, needle)) return true;
  // Backend matched this recent — keep it in Recently used, never bounce to Results.
  if (
    !showingPrevious &&
    catalogRows.some((catalog) => String(catalog.value) === String(row.value))
  ) {
    return true;
  }
  return false;
}

/**
 * Server-search Ant Design Select.
 * Keeps Recently used / Results / Add new while typing. Matching recents and
 * results are filtered immediately; Results shows a spinner until the server
 * page arrives, then the fresh rows.
 *
 * Keyboard: ↑ ↓ highlight, Enter selects, Esc closes.
 *
 * @param {{
 *   value?: unknown;
 *   onChange?: (value: unknown, option?: Record<string, unknown>) => void;
 *   fetchPage: (args: { search: string; page: number }) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
 *   queryKey: readonly unknown[];
 *   queryParams?: Record<string, string | number | boolean | undefined>;
 *   recentKind?: string;
 *   seedOptions?: Record<string, unknown>[];
 *   pageSize?: number;
 *   placeholder?: string;
 *   disabled?: boolean;
 *   loading?: boolean;
 *   allowClear?: boolean;
 *   getPopupContainer?: (trigger: HTMLElement) => HTMLElement;
 *   optionRender?: import("antd").SelectProps["optionRender"];
 *   addNewSentinel?: string | null;
 *   addNewLabel?: string;
 *   onAddNew?: () => void;
 *   recentLabel?: string;
 *   clearRecentLabel?: string;
 *   resultsLabel?: string;
 *   loadMoreLabel?: string;
 *   emptyLabel?: string;
 *   typeToSearchLabel?: string;
 *   className?: string;
 *   variant?: import("antd").SelectProps["variant"];
 *   onSelectRemembered?: (option: Record<string, unknown>) => void;
 * }} props
 */
export default function ServerSearchSelect({
  value,
  onChange,
  fetchPage,
  queryKey = ["tenant", "selector"],
  queryParams,
  recentKind,
  seedOptions = [],
  pageSize = SERVER_SEARCH_PAGE_SIZE,
  placeholder,
  disabled = false,
  loading: loadingProp = false,
  allowClear = true,
  getPopupContainer,
  optionRender,
  addNewSentinel = null,
  addNewLabel,
  onAddNew,
  recentLabel = "Recently used",
  clearRecentLabel = "Clear",
  resultsLabel = "Results",
  loadMoreLabel = "Load more",
  emptyLabel = "No matches",
  typeToSearchLabel = "Type to search",
  className,
  variant,
  onSelectRemembered,
  ...rest
}) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [recents, setRecents] = useState(/** @type {Record<string, unknown>[]} */ ([]));

  const sentinel = addNewSentinel != null && !disabled && onAddNew ? String(addNewSentinel) : null;
  const liveSearch = searchInput.trim();
  const searching = liveSearch !== "";
  const awaitingFreshResults = liveSearch !== debouncedSearch;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const extraParamsKey = JSON.stringify(queryParams ?? {});
  const selectorQueryKey = useMemo(
    () => [
      ...queryKey,
      {
        selector: true,
        search: debouncedSearch,
        per_page: pageSize,
        ...(queryParams ?? {}),
      },
    ],
    // extraParamsKey stands in for queryParams identity
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serialized extra params
    [debouncedSearch, extraParamsKey, pageSize, queryKey],
  );

  const listQuery = useInfiniteQuery({
    queryKey: selectorQueryKey,
    queryFn: ({ pageParam }) => fetchPage({ search: debouncedSearch, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (sum, page) => sum + (Array.isArray(page?.rows) ? page.rows.length : 0),
        0,
      );
      const total = Number(lastPage?.total) || 0;
      if (loaded >= total) return undefined;
      return allPages.length + 1;
    },
    enabled: !disabled,
    staleTime: QUERY_STALE_TIME.catalog,
    gcTime: QUERY_GC_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previous) => previous,
  });

  const rows = useMemo(
    () => mergeUniqueOptions(...(listQuery.data?.pages ?? []).map((page) => page?.rows)),
    [listQuery.data],
  );
  const total = Number(listQuery.data?.pages?.at(-1)?.total) || 0;
  const showingPrevious =
    Boolean(listQuery.isPlaceholderData) || awaitingFreshResults;

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = listQuery;
  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const seed = useMemo(
    () => mergeUniqueOptions(seedOptions, recents),
    [seedOptions, recents],
  );

  const clearRecents = useCallback(() => {
    if (!recentKind) return;
    clearRecentSelectorOptions(recentKind);
    setRecents([]);
  }, [recentKind]);

  const fetchingFirstPage =
    listQuery.isPending || (listQuery.isFetching && !isFetchingNextPage);
  const resultsPending = Boolean(
    loadingProp || (open && (fetchingFirstPage || awaitingFreshResults)),
  );

  const catalogRows = useMemo(() => {
    let next = rows.filter((row) => String(row.value) !== sentinel);
    if (showingPrevious && liveSearch) {
      next = next.filter((row) => optionMatchesLiveSearch(row, liveSearch.toLowerCase()));
    }
    return next;
  }, [liveSearch, rows, sentinel, showingPrevious]);

  const addNew = useMemo(
    () =>
      sentinel && addNewLabel && onAddNew
        ? [{ value: sentinel, label: addNewLabel, className: "lookup-select-add-new-option" }]
        : [],
    [addNewLabel, onAddNew, sentinel],
  );

  const selectOptions = useMemo(() => {
    const needle = liveSearch.toLowerCase();
    const recentValueSet = new Set(
      recents
        .filter((row) => String(row.value) !== sentinel)
        .map((row) => String(row.value)),
    );

    const recentRows = recents
      .filter((row) => String(row.value) !== sentinel)
      .filter((row) =>
        recentRowMatchesSearch(row, needle, catalogRows, searching, showingPrevious),
      );

    /** @type {Record<string, unknown>[]} */
    let resultRows = (
      searching && !showingPrevious
        ? catalogRows
        : mergeUniqueOptions(catalogRows, seedOptions)
    ).filter((row) => {
      if (String(row.value) === sentinel) return false;
      // Anything already in Recently used stays there — never also/only in Results.
      if (searching && recentValueSet.has(String(row.value))) return false;
      if (recentRows.some((recent) => String(recent.value) === String(row.value))) return false;
      return true;
    });

    if (searching && showingPrevious) {
      resultRows = resultRows.filter((row) => optionMatchesLiveSearch(row, needle));
    }

    /** @type {Record<string, unknown>[]} */
    const grouped = [];

    if (recentRows.length > 0) {
      grouped.push({
        label: (
          <span className="server-search-select-recent-label">
            <span>{recentLabel}</span>
            <Button
              type="link"
              size="small"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                clearRecents();
              }}
            >
              {clearRecentLabel}
            </Button>
          </span>
        ),
        options: recentRows,
      });
    }

    /** @type {Record<string, unknown>[]} */
    const resultOptions = [...resultRows];
    if (resultsPending) {
      resultOptions.push({
        value: RESULTS_PENDING_VALUE,
        label: " ",
        disabled: true,
        className: "server-search-select-status-option",
      });
    } else if (searching && resultRows.length === 0) {
      resultOptions.push({
        value: RESULTS_EMPTY_VALUE,
        label: emptyLabel,
        disabled: true,
        className: "server-search-select-status-option server-search-select-empty-option",
      });
    }

    if (resultOptions.length > 0) {
      grouped.push({
        label: resultsLabel,
        options: resultOptions,
      });
    }

    return [...grouped, ...addNew];
  }, [
    addNew,
    catalogRows,
    clearRecentLabel,
    clearRecents,
    emptyLabel,
    liveSearch,
    recentLabel,
    recents,
    resultsLabel,
    resultsPending,
    searching,
    seedOptions,
    sentinel,
    showingPrevious,
  ]);

  const hasMorePages =
    !showingPrevious && !resultsPending && Boolean(hasNextPage) && rows.length < total;
  const showLoadMore = open && hasMorePages;
  const showEmptySpin = Boolean(
    open && resultsPending && selectOptions.length === 0,
  );

  const mergedOptionRender = useCallback(
    (option) => {
      if (option.value === RESULTS_PENDING_VALUE) {
        return (
          <span className="server-search-select-results-status">
            <Spin size="small" />
          </span>
        );
      }
      if (option.value === RESULTS_EMPTY_VALUE) {
        return <span className="server-search-select-results-status">{emptyLabel}</span>;
      }
      if (sentinel && option.value === sentinel) {
        return (
          <span className="lookup-select-add-new">
            <PlusOutlined />
            {addNewLabel}
          </span>
        );
      }
      const content = optionRender ? optionRender(option) : option.label;
      const data = option?.data && typeof option.data === "object" ? option.data : null;
      const title =
        typeof data?.title === "string" && data.title.trim()
          ? data.title.trim()
          : typeof option.title === "string" && option.title.trim()
            ? option.title.trim()
            : undefined;
      return title ? <span title={title}>{content}</span> : content;
    },
    [addNewLabel, emptyLabel, optionRender, sentinel],
  );

  const labelRender = useCallback(
    (props) => {
      const row = mergeUniqueOptions(catalogRows, recents, seedOptions).find(
        (option) => String(option.value) === String(props.value),
      );
      const title = typeof row?.title === "string" && row.title.trim() ? row.title.trim() : undefined;
      return title ? <span title={title}>{props.label}</span> : props.label;
    },
    [catalogRows, recents, seedOptions],
  );

  const handleChange = (next, option) => {
    if (next === RESULTS_PENDING_VALUE || next === RESULTS_EMPTY_VALUE) return;
    if (sentinel && next === sentinel) {
      onAddNew?.();
      return;
    }
    if (next == null || next === "") {
      onChange?.(undefined, undefined);
      return;
    }
    const fromList = mergeUniqueOptions(catalogRows, recents, seed).find(
      (row) => String(row.value) === String(next),
    );
    const raw = Array.isArray(option) ? option[0] : option;
    const picked =
      fromList ??
      (raw && typeof raw === "object"
        ? /** @type {Record<string, unknown>} */ (raw.data && typeof raw.data === "object" ? { ...raw.data, ...raw } : raw)
        : { value: next, label: String(next) });
    if (recentKind) {
      rememberRecentSelectorOption(recentKind, picked);
      setRecents(readRecentSelectorOptions(recentKind));
      onSelectRemembered?.(picked);
    }
    onChange?.(next, picked);
  };

  const handlePopupScroll = (event) => {
    if (!hasMorePages) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 28) {
      loadMore();
    }
  };

  return (
    <Select
      {...rest}
      value={value}
      onChange={handleChange}
      allowClear={allowClear}
      showSearch
      filterOption={false}
      defaultActiveFirstOption
      placeholder={placeholder}
      disabled={disabled}
      loading={Boolean(loadingProp || (open && resultsPending))}
      options={selectOptions}
      optionRender={mergedOptionRender}
      labelRender={labelRender}
      notFoundContent={
        showEmptySpin ? (
          <Spin size="small" />
        ) : searching ? (
          emptyLabel
        ) : (
          typeToSearchLabel
        )
      }
      getPopupContainer={getPopupContainer}
      className={className ?? "w-full"}
      variant={variant}
      onSearch={setSearchInput}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          if (recentKind) setRecents(readRecentSelectorOptions(recentKind));
        } else {
          setSearchInput("");
          setDebouncedSearch("");
        }
      }}
      onPopupScroll={handlePopupScroll}
      popupRender={(menu) => (
        <>
          {menu}
          {showLoadMore ? (
            <div className="server-search-select-footer">
              <Button
                type="link"
                size="small"
                loading={isFetchingNextPage}
                onMouseDown={(event) => event.preventDefault()}
                onClick={loadMore}
              >
                {loadMoreLabel}
              </Button>
            </div>
          ) : null}
        </>
      )}
    />
  );
}
