"use client";

import { useQuery } from "@tanstack/react-query";
import { SCALE_EXPORT_STATUS_QUERY_KEY, fetchScaleExportStatus } from "../api/scaleExports.api";

/**
 * Per export template: last export and how many items changed since.
 *
 * @param {boolean} enabled
 */
export function useScaleExportStatus(enabled = true) {
  const query = useQuery({
    queryKey: SCALE_EXPORT_STATUS_QUERY_KEY,
    queryFn: fetchScaleExportStatus,
    enabled,
    staleTime: 30_000,
  });
  const rows = Array.isArray(query.data) ? query.data : [];
  return {
    ...query,
    rows,
    changedTotal: rows.reduce((max, r) => Math.max(max, Number(r.changed_count ?? 0)), 0),
  };
}
