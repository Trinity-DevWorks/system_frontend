"use client";

/**
 * Recipe line editor — header form, line state, save mutation, and grid handlers.
 *
 * Used by:
 * - drawer/panels/recipe/RecipeLineEditor.js
 */

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { syncRecipeItems, upsertRecipe } from "@/services/recipesApi";
import {
  isRecipeHeader,
  itemRecipeItemsQueryKey,
  itemRecipeQueryKey,
  setRecipeHeaderInCache,
  setRecipeItemsInCache,
} from "@/components/items/itemRecipeQueryCache";
import {
  canAddRecipeLine,
  canSaveRecipePanel,
  getValidRecipeLines,
} from "../../utils/itemLineHelpers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useMemo, useState } from "react";

/**
 * @param {{
 *   itemId: number;
 *   initialHeader: { yield_quantity: number; uom_id?: number };
 *   initialLines: { item_id?: string; quantity?: number; uom_id?: number }[];
 *   t: (k: string) => string;
 *   tApiErrors: (k: string) => string;
 * }} args
 */
export function useRecipeLineEditor({ itemId, initialHeader, initialLines, t, tApiErrors }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [headerForm] = Form.useForm();
  // Parent remounts this hook via `key` when server seed changes; no prop→state sync effect.
  const [lines, setLines] = useState(() => initialLines);

  const watchedYield = Form.useWatch("yield_quantity", headerForm);
  const watchedYieldUom = Form.useWatch("uom_id", headerForm);

  const headerSnapshot = useMemo(
    () => ({
      yield_quantity: watchedYield ?? initialHeader.yield_quantity,
      uom_id: watchedYieldUom ?? initialHeader.uom_id,
    }),
    [watchedYield, watchedYieldUom, initialHeader.yield_quantity, initialHeader.uom_id],
  );

  const canSave = useMemo(
    () => canSaveRecipePanel(lines, initialLines, headerSnapshot, initialHeader),
    [lines, initialLines, headerSnapshot, initialHeader],
  );

  const canAddLine = useMemo(() => canAddRecipeLine(lines), [lines]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const header = await headerForm.validateFields();
      const recipe = await upsertRecipe(itemId, header);
      const ingredients = await syncRecipeItems(itemId, {
        ingredients: getValidRecipeLines(lines).map((l) => ({
          item_id: l.item_id,
          quantity: l.quantity,
          uom_id: l.uom_id,
        })),
      });
      return { recipe, ingredients };
    },
    onSuccess: ({ recipe, ingredients }) => {
      if (isRecipeHeader(recipe)) {
        setRecipeHeaderInCache(queryClient, itemId, recipe);
      } else {
        void queryClient.invalidateQueries({ queryKey: itemRecipeQueryKey(itemId) });
      }
      if (Array.isArray(ingredients)) {
        setRecipeItemsInCache(queryClient, itemId, ingredients);
      } else {
        void queryClient.invalidateQueries({ queryKey: itemRecipeItemsQueryKey(itemId) });
      }
      message.success(t("panelSaveSuccess"));
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const patchLine = (index, patch) => {
    const next = [...lines];
    next[index] = { ...next[index], ...patch };
    setLines(next);
  };

  const removeLine = (index) => {
    const next = lines.filter((_, i) => i !== index);
    setLines(next.length > 0 ? next : [{ item_id: undefined, quantity: undefined, uom_id: undefined }]);
  };

  const addLine = () => setLines([...lines, { item_id: undefined, quantity: undefined, uom_id: undefined }]);

  const recipeColumns = useMemo(
    () => [
      { key: "item", label: t("recipeColItem"), width: "minmax(0, 1fr)" },
      { key: "qty", label: t("recipeColQty"), width: "112px" },
      { key: "uom", label: t("recipeColUom"), width: "148px" },
    ],
    [t],
  );

  return {
    headerForm,
    initialHeader,
    lines,
    canSave,
    canAddLine,
    saveMutation,
    patchLine,
    removeLine,
    addLine,
    recipeColumns,
  };
}
