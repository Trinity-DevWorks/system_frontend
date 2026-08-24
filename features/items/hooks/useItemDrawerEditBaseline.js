import { useMemo } from "react";
/**
 * Builds the edit-mode dirty-check baseline from the loaded item record.
 *
 * Used by:
 * - drawer/ItemDrawer.js
 */

import { toItemCacheRow } from "../utils/itemDrawerUtils";

/**
 * @param {{
 *   mode: "create" | "edit" | "view";
 *   persistedItemId: number | null;
 *   savedEditBaseline: { itemId: number; row: ReturnType<typeof toItemCacheRow> } | null;
 *   detailRow: Record<string, unknown> | null | undefined;
 *   tableSeedMatches: boolean;
 *   editSeedRecord: Record<string, unknown> | null;
 * }} args
 */
export function useItemDrawerEditBaseline({
  mode,
  persistedItemId,
  savedEditBaseline,
  detailRow,
  tableSeedMatches,
  editSeedRecord,
}) {
  return useMemo(() => {
    if (mode !== "edit") return null;
    if (savedEditBaseline?.itemId === persistedItemId) return savedEditBaseline.row;
    if (detailRow) return toItemCacheRow(detailRow);
    if (tableSeedMatches && editSeedRecord) return toItemCacheRow(editSeedRecord);
    return null;
  }, [mode, persistedItemId, savedEditBaseline, detailRow, tableSeedMatches, editSeedRecord]);
}
