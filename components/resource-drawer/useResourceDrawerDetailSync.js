"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useMemo } from "react";

/**
 * Load one record for edit/view (or seed from table row), reset form for create.
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   recordId: number | null;
 *   tableSeedRecord: Record<string, unknown> | null;
 *   form: import("antd").FormInstance;
 *   defaults: Record<string, unknown>;
 *   queryKeyPrefix: readonly unknown[];
 *   fetchDetail: (id: number) => Promise<unknown>;
 *   mapSeedToCacheRow: (seed: Record<string, unknown>) => unknown;
 *   mapRecordToFormValues: (record: Record<string, unknown>) => Record<string, unknown>;
 * }} args
 */
export function useResourceDrawerDetailSync({
  open,
  mode,
  recordId,
  tableSeedRecord,
  form,
  defaults,
  queryKeyPrefix,
  fetchDetail,
  mapSeedToCacheRow,
  mapRecordToFormValues,
}) {
  const queryClient = useQueryClient();

  const detailEnabled = open && (mode === "edit" || mode === "view") && recordId != null;

  const tableSeedMatches = useMemo(
    () =>
      (mode === "edit" || mode === "view") &&
      Boolean(tableSeedRecord) &&
      recordId != null &&
      Number(tableSeedRecord?.id) === Number(recordId),
    [mode, tableSeedRecord, recordId],
  );

  const fetchRemoteDetail = detailEnabled && !tableSeedMatches;

  const detailQuery = useQuery({
    queryKey: [...queryKeyPrefix, recordId],
    queryFn: () => fetchDetail(/** @type {number} */ (recordId)),
    enabled: fetchRemoteDetail,
    staleTime: 60_000,
  });

  useLayoutEffect(() => {
    if (!open || !(mode === "edit" || mode === "view") || !tableSeedMatches || recordId == null || !tableSeedRecord)
      return;
    const cacheRow = mapSeedToCacheRow(tableSeedRecord);
    queryClient.setQueryData([...queryKeyPrefix, recordId], cacheRow);
    form.resetFields();
    form.setFieldsValue(mapRecordToFormValues(/** @type {Record<string, unknown>} */ (cacheRow)));
  }, [open, mode, recordId, tableSeedMatches, tableSeedRecord, form, queryClient, queryKeyPrefix, mapSeedToCacheRow, mapRecordToFormValues]);

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      form.resetFields();
      form.setFieldsValue(defaults);
      return;
    }
    if (tableSeedMatches) return;
    if (detailQuery.isSuccess && detailQuery.data && typeof detailQuery.data === "object") {
      const row = /** @type {Record<string, unknown>} */ (detailQuery.data);
      form.resetFields();
      form.setFieldsValue(mapRecordToFormValues(row));
    }
  }, [open, mode, form, defaults, tableSeedMatches, detailQuery.isSuccess, detailQuery.data, mapRecordToFormValues]);

  return {
    detailEnabled,
    tableSeedMatches,
    fetchRemoteDetail,
    detailQuery,
  };
}
