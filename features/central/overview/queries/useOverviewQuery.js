"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { fetchCentralOverview } from "../api/overview.api";
import { CENTRAL_OVERVIEW_QUERY_KEY } from "./overviewQueryKeys";

export function useCentralOverviewQuery() {
  return useQuery({
    queryKey: CENTRAL_OVERVIEW_QUERY_KEY,
    queryFn: fetchCentralOverview,
    staleTime: QUERY_STALE_TIME.default,
  });
}
