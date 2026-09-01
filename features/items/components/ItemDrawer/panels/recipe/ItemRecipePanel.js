"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

/**
 * Recipe tab — read-only table or editable recipe line editor.
 *
 * Used by:
 * - drawer/panels/ItemDrawerPanels.js (barrel)
 * - drawer/hooks/useItemDrawerTabItems.js (via barrel)
 */

import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { fetchItemNames } from "../../../../api/items.api";
import { fetchRecipe, fetchRecipeItems } from "../../../../api/recipes.api";
import { itemRecipeItemsQueryKey, itemRecipeQueryKey } from "../../../../queries/itemRecipeQueryCache";
import { useQuery } from "@tanstack/react-query";
import { Table, Typography } from "antd";
import { useMemo } from "react";
import { isPersistedEntityId, normalizeEntityId } from "@/lib/entityId";
import { formatItemOptionLabel } from "../../../../utils/formatItemLabel";
import { isAllowedRecipeIngredient } from "../../../../utils/itemFormMappers";
import { buildRecipeLineEditorKey } from "../shared/lineEditorKeys";
import { RecipeLineEditor } from "./RecipeLineEditor";
import { useItemRecipeUomOptions } from "./useItemRecipeUomOptions";
import { ITEMS_LIST_QUERY_KEY } from "../../../../queries/itemsQueryKeys";

/**
 * @param {{
 *   itemId: string;
 *   readOnly: boolean;
 *   t: (k: string) => string;
 *   tApiErrors: (k: string) => string;
 *   active: boolean;
 *   baseUomId?: number;
 * }} props
 */
export function ItemRecipePanel({ itemId, readOnly, t, tApiErrors, active, baseUomId }) {
  const itemsQuery = useQuery({
    queryKey: ITEMS_LIST_QUERY_KEY,
    queryFn: fetchItemNames,
    enabled: active,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const yieldUoms = useItemRecipeUomOptions({ itemId, enabled: active && !readOnly });

  const recipeQuery = useQuery({
    queryKey: itemRecipeQueryKey(itemId),
    queryFn: () => fetchRecipe(itemId),
    enabled: active && isPersistedEntityId(itemId),
    retry: false,
  });

  const recipeItemsQuery = useQuery({
    queryKey: itemRecipeItemsQueryKey(itemId),
    queryFn: () => fetchRecipeItems(itemId),
    enabled: active && isPersistedEntityId(itemId),
    retry: false,
  });

  const itemOptions = useMemo(() => {
    const selectedIds = new Set(
      (recipeItemsQuery.data ?? [])
        .map((r) => normalizeEntityId(r.item_id))
        .filter(Boolean),
    );

    /** @type {Map<string, { value: string; label: string }>} */
    const byId = new Map();

    for (const i of itemsQuery.data ?? []) {
      const id = normalizeEntityId(i.id);
      if (!id) continue;
      if (!isAllowedRecipeIngredient(i, itemId) && !selectedIds.has(id)) continue;
      byId.set(id, { value: id, label: formatItemOptionLabel(i) });
    }

    for (const r of recipeItemsQuery.data ?? []) {
      const id = normalizeEntityId(r.item_id);
      if (!id || byId.has(id)) continue;
      const label = formatItemOptionLabel(r.ingredient_item);
      byId.set(id, { value: id, label: label || id });
    }

    return [...byId.values()];
  }, [itemsQuery.data, recipeItemsQuery.data, itemId]);

  const initialHeader = useMemo(
    () => ({
      yield_quantity: Number(recipeQuery.data?.yield_quantity ?? 1),
      uom_id: recipeQuery.data?.uom_id ?? yieldUoms.preferredUomId ?? baseUomId,
    }),
    [recipeQuery.data, yieldUoms.preferredUomId, baseUomId],
  );

  const initialLines = useMemo(() => {
    const rows = recipeItemsQuery.data;
    if (!rows?.length) return [{ item_id: undefined, quantity: undefined, uom_id: undefined }];
    return rows.map((r) => ({
      item_id: normalizeEntityId(r.item_id) ?? undefined,
      quantity: Number(r.quantity),
      uom_id: Number(r.uom_id),
    }));
  }, [recipeItemsQuery.data]);

  const editorKey = useMemo(
    () => buildRecipeLineEditorKey(itemId, initialHeader, initialLines),
    [itemId, initialHeader, initialLines],
  );

  if (readOnly) {
    const yieldQty = recipeQuery.data?.yield_quantity;
    const yieldUom = recipeQuery.data?.uom?.name ?? recipeQuery.data?.uom?.code ?? "";

    return (
      <section className="item-lines-panel">
        <ResourceDrawerPanelHeader title={t("tabRecipe")} description={t("tabRecipeDescription")} />
        <div className="item-lines-section-card item-lines-yield-card">
          <Typography.Text>
            {t("recipeYield")}: {yieldQty ?? "—"}
            {yieldUom ? ` ${yieldUom}` : ""}
          </Typography.Text>
        </div>
        <div className="item-lines-section-card">
          <Table
            className="resource-drawer-data-table"
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={recipeItemsQuery.data ?? []}
            columns={[
              { title: t("recipeColItem"), render: (_v, r) => r.ingredient_item?.name ?? "—" },
              { title: t("recipeColQty"), dataIndex: "quantity", key: "qty", width: 112 },
              { title: t("recipeColUom"), render: (_v, r) => r.uom?.name ?? "—", width: 148 },
            ]}
          />
        </div>
      </section>
    );
  }

  return (
    <RecipeLineEditor
      key={editorKey}
      itemId={itemId}
      initialHeader={initialHeader}
      initialLines={initialLines}
      itemOptions={itemOptions}
      itemsPending={itemsQuery.isPending}
      yieldUomOptions={yieldUoms.options}
      yieldUomsPending={yieldUoms.pending}
      t={t}
      tApiErrors={tApiErrors}
    />
  );
}
