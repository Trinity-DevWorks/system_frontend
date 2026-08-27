"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import { entityIdsEqual } from "@/lib/entityId";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useMemo, useRef } from "react";

/**
 * Load one record for edit/view (or paint from a table-row placeholder), reset form for create.
 *
 * The table row is `placeholderData` only — it is never written into the detail cache.
 * The detail query stays enabled so a full record still loads in the background.
 *
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   recordId: string | null;
 *   tableSeedRecord: Record<string, unknown> | null;
 *   form: import("antd").FormInstance;
 *   defaults: Record<string, unknown>;
 *   queryKeyPrefix: readonly unknown[];
 *   fetchDetail: (id: string) => Promise<unknown>;
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
  const detailEnabled = open && (mode === "edit" || mode === "view") && recordId != null;

  const tableSeedMatches = useMemo(
    () =>
      (mode === "edit" || mode === "view") &&
      Boolean(tableSeedRecord) &&
      recordId != null &&
      entityIdsEqual(tableSeedRecord?.id, recordId),
    [mode, tableSeedRecord, recordId],
  );

  const seedPlaceholder = useMemo(() => {
    if (!tableSeedMatches || tableSeedRecord == null) return undefined;
    return mapSeedToCacheRow(tableSeedRecord);
  }, [tableSeedMatches, tableSeedRecord, mapSeedToCacheRow]);

  /** True when this open has no table seed — callers use it for a blocking spinner. */
  const fetchRemoteDetail = detailEnabled && !tableSeedMatches;

  const detailQuery = useQuery({
    queryKey: [...queryKeyPrefix, recordId],
    queryFn: () => fetchDetail(/** @type {string} */ (recordId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
    placeholderData: seedPlaceholder,
  });

  const lastAppliedRef = useRef({ mode: /** @type {string | null} */ (null), recordId: /** @type {unknown} */ (null), data: /** @type {unknown} */ (null) });

  useLayoutEffect(() => {
    if (!open) {
      lastAppliedRef.current = { mode: null, recordId: null, data: null };
      return;
    }

    if (mode === "create") {
      if (lastAppliedRef.current.mode === "create") return;
      lastAppliedRef.current = { mode: "create", recordId: null, data: null };
      form.resetFields();
      form.setFieldsValue(defaults);
      return;
    }

    if (mode !== "edit" && mode !== "view") return;
    const row = detailQuery.data;
    if (!row || typeof row !== "object") return;

    const isNewRecord =
      lastAppliedRef.current.mode !== mode || lastAppliedRef.current.recordId !== recordId;
    if (isNewRecord) {
      lastAppliedRef.current = { mode, recordId, data: row };
      form.resetFields();
      form.setFieldsValue(mapRecordToFormValues(/** @type {Record<string, unknown>} */ (row)));
      return;
    }

    if (lastAppliedRef.current.data === row) return;
    if (form.isFieldsTouched()) return;
    lastAppliedRef.current = { mode, recordId, data: row };
    form.resetFields();
    form.setFieldsValue(mapRecordToFormValues(/** @type {Record<string, unknown>} */ (row)));
  }, [open, mode, recordId, defaults, form, mapRecordToFormValues, detailQuery.data]);

  return {
    detailEnabled,
    tableSeedMatches,
    fetchRemoteDetail,
    detailQuery,
  };
}
