"use client";

/**
 * Bundle line editor — local line state, sync mutation, and grid handlers.
 *
 * Used by:
 * - drawer/panels/bundle/BundleLineEditor.js
 */

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { syncBundleItems } from "../../../../api/bundleItems.api";
import { itemBundleItemsQueryKey, setBundleItemsInCache } from "../../../../queries/itemBundleQueryCache";
import {
  canAddBundleLine,
  canSaveBundleLines,
  getValidBundleLines,
} from "../../../../utils/itemLineHelpers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useMemo, useState } from "react";

/**
 * @param {{
 *   itemId: number;
 *   initialLines: { child_item_id?: string; quantity?: number }[];
 *   t: (k: string) => string;
 *   tApiErrors: (k: string) => string;
 * }} args
 */
export function useBundleLineEditor({ itemId, initialLines, t, tApiErrors }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  // Parent remounts this hook via `key` when server seed changes; no prop→state sync effect.
  const [lines, setLines] = useState(() => initialLines);

  const canSave = useMemo(() => canSaveBundleLines(lines, initialLines), [lines, initialLines]);
  const canAddLine = useMemo(() => canAddBundleLine(lines), [lines]);

  const syncMutation = useMutation({
    mutationFn: () =>
      syncBundleItems(itemId, {
        components: getValidBundleLines(lines),
      }),
    onSuccess: (saved) => {
      if (Array.isArray(saved)) {
        setBundleItemsInCache(queryClient, itemId, saved);
      } else {
        void queryClient.invalidateQueries({ queryKey: itemBundleItemsQueryKey(itemId) });
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
    setLines(next.length > 0 ? next : [{ child_item_id: undefined, quantity: undefined }]);
  };

  const addLine = () => setLines([...lines, { child_item_id: undefined, quantity: undefined }]);

  const bundleColumns = useMemo(
    () => [
      { key: "item", label: t("bundleColItem"), width: "minmax(0, 1fr)" },
      { key: "qty", label: t("bundleColQty"), width: "112px" },
    ],
    [t],
  );

  return {
    lines,
    canSave,
    canAddLine,
    syncMutation,
    patchLine,
    removeLine,
    addLine,
    bundleColumns,
  };
}
