"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBrandNames } from "../api/brands.api";
import { BRANDS_LIST_QUERY_KEY } from "./brandsQueryKeys";

/**
 * Lookup list for parent-brand selects.
 * @param {{ enabled?: boolean }} [args]
 */
export function useBrandNamesQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: BRANDS_LIST_QUERY_KEY,
    queryFn: () => fetchBrandNames(),
    enabled,
    staleTime: 5 * 60_000,
  });
}
