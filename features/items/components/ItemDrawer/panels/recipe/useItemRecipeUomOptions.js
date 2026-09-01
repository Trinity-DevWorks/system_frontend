"use client";

/**
 * UOM options for a recipe header or line — only units configured on that item.
 *
 * Used by:
 * - drawer/panels/recipe/ItemRecipePanel.js
 * - drawer/panels/recipe/RecipeLineEditor.js
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { isPersistedEntityId } from "@/lib/entityId";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchItemUoms } from "../../../../api/itemUoms.api";
import { itemUomsQueryKey } from "../../../../queries/itemUomsQueryCache";
import { mapItemUomsToRecipeUomOptions, preferredRecipeUomId } from "../../../../utils/itemLineHelpers";

/**
 * @param {{ itemId?: string | number; enabled?: boolean }} args
 */
export function useItemRecipeUomOptions({ itemId, enabled = true }) {
  const persisted = isPersistedEntityId(itemId);

  const itemUomsQuery = useQuery({
    queryKey: itemUomsQueryKey(/** @type {string} */ (itemId)),
    queryFn: () => fetchItemUoms(/** @type {string} */ (itemId)),
    enabled: enabled && persisted,
    staleTime: QUERY_STALE_TIME.default,
  });

  const options = useMemo(
    () => mapItemUomsToRecipeUomOptions(itemUomsQuery.data),
    [itemUomsQuery.data],
  );

  return {
    options,
    pending: persisted && itemUomsQuery.isLoading,
    preferredUomId: preferredRecipeUomId(options),
  };
}
