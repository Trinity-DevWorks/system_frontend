/**
 * "Add new …" for a lookup field: opens that feature's create drawer stacked on top,
 * then puts the new record's id into the field and refreshes the lookup list.
 *
 * Usage:
 *   const openLookupCreate = useStackedLookupCreate(form);
 *   onClick={() => openLookupCreate("brands", "brand_id", BRANDS_LIST_QUERY_KEY)}
 */

"use client";

import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Numeric ids become numbers (select values are numbers); uuids stay strings.
 * @param {unknown} value
 * @returns {number | string | null}
 */
function toRelationId(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const s = String(value).trim();
  if (s === "") return null;
  return /^-?\d+$/.test(s) ? Number(s) : s;
}

/**
 * @param {import("antd").FormInstance} form
 * @returns {(
 *   featureId: string,
 *   fieldName: import("antd/es/form/interface").NamePath,
 *   listQueryKey?: readonly unknown[] | null,
 *   onCreated?: (record: Record<string, unknown>) => void,
 * ) => boolean}
 */
export function useStackedLookupCreate(form) {
  const { openStackedDrawer } = useGlobalDrawer();
  const queryClient = useQueryClient();

  return useCallback(
    (featureId, fieldName, listQueryKey, onCreated) =>
      openStackedDrawer({
        featureId,
        mode: "create",
        onCreated: (record) => {
          const id = toRelationId(record?.id);
          if (id == null) return;
          if (listQueryKey) invalidateTenantListQueries(queryClient, listQueryKey);
          form.setFieldValue(fieldName, id);
          onCreated?.(record);
        },
      }),
    [form, openStackedDrawer, queryClient],
  );
}
