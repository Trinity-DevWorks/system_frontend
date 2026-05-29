"use client";

/**
 * Barcodes tab — queries, mutations, inline edit state, and table column config.
 *
 * Used by:
 * - drawer/panels/barcodes/ItemBarcodesPanel.js
 */

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import {
  createItemBarcode,
  deleteItemBarcode,
  fetchItemBarcodes,
  updateItemBarcode,
} from "@/services/itemBarcodesApi";
import {
  isItemBarcodeRow,
  itemBarcodesQueryKey,
  removeItemBarcodeFromCache,
  setItemBarcodeInCache,
} from "@/components/items/itemBarcodesQueryCache";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useMemo, useState } from "react";
import {
  barcodeInlineValuesToBody,
  defaultBarcodeInlineValues,
  rowToBarcodeInlineValues,
} from "../itemDrawerPanelsState";
import { buildBarcodesPanelColumns } from "./buildBarcodesPanelColumns";
import { BARCODE_DRAFT_ROW_ID } from "./barcodePanelConstants";

/** @typedef {import("./barcodePanelConstants").BarcodeInlineValues} BarcodeInlineValues */

/**
 * @param {{ itemId: number; readOnly: boolean; t: (k: string) => string; tApiErrors: (k: string) => string; active: boolean; itemUoms: unknown[] }} args
 */
export function useItemBarcodesPanel({ itemId, readOnly, t, tApiErrors, active, itemUoms }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [inlineEdit, setInlineEdit] = useState(
    /** @type {null | { key: "new" | number; values: BarcodeInlineValues }} */ (null),
  );

  const barcodesQueryKeyValue = useMemo(() => itemBarcodesQueryKey(itemId), [itemId]);

  const { data = [], isPending } = useQuery({
    queryKey: barcodesQueryKeyValue,
    queryFn: () => fetchItemBarcodes(itemId),
    enabled: active && itemId > 0,
  });

  const rows = useMemo(() => [...(data ?? [])], [data]);

  const itemUomOptions = useMemo(
    () =>
      (itemUoms ?? []).map((row) => ({
        value: Number(row.id),
        label: row.uom?.name ?? row.uom?.code ?? String(row.id),
      })),
    [itemUoms],
  );

  const saveMutation = useMutation({
    mutationFn: (/** @type {{ id?: number; body: Record<string, unknown> }} */ { id, body }) =>
      id != null ? updateItemBarcode(itemId, id, body) : createItemBarcode(itemId, body),
    onSuccess: (saved) => {
      if (isItemBarcodeRow(saved)) {
        setItemBarcodeInCache(queryClient, itemId, saved);
      } else {
        void queryClient.invalidateQueries({ queryKey: barcodesQueryKeyValue });
      }
      message.success(t("panelSaveSuccess"));
      setInlineEdit(null);
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const patchMutation = useMutation({
    mutationFn: (/** @type {{ id: number; body: Record<string, unknown> }} */ { id, body }) =>
      updateItemBarcode(itemId, id, body),
    onSuccess: (saved) => {
      if (isItemBarcodeRow(saved)) {
        setItemBarcodeInCache(queryClient, itemId, saved);
      } else {
        void queryClient.invalidateQueries({ queryKey: barcodesQueryKeyValue });
      }
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteItemBarcode(itemId, id),
    onSuccess: (_data, deletedId) => {
      removeItemBarcodeFromCache(queryClient, itemId, deletedId);
      message.success(t("panelDeleteSuccess"));
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const tableData = useMemo(() => {
    if (!inlineEdit || inlineEdit.key !== "new") return rows;
    return [...rows, { id: BARCODE_DRAFT_ROW_ID, is_primary: inlineEdit.values.is_primary }];
  }, [rows, inlineEdit]);

  const getInlineValues = (row) => {
    if (!inlineEdit) return null;
    if (inlineEdit.key === "new" && row.id === BARCODE_DRAFT_ROW_ID) return inlineEdit.values;
    if (inlineEdit.key === row.id) return inlineEdit.values;
    return null;
  };

  const patchDraft = (patch) => {
    setInlineEdit((prev) => (prev ? { ...prev, values: { ...prev.values, ...patch } } : prev));
  };

  const startCreateRow = () => setInlineEdit({ key: "new", values: defaultBarcodeInlineValues() });
  const startEditRow = (row) => setInlineEdit({ key: Number(row.id), values: rowToBarcodeInlineValues(row) });
  const cancelInline = () => setInlineEdit(null);

  const saveInline = () => {
    if (!inlineEdit) return;
    const code = inlineEdit.values.barcode.trim();
    if (!code) {
      message.error(t("barcodeFieldRequired"));
      return;
    }
    saveMutation.mutate({
      id: inlineEdit.key === "new" ? undefined : inlineEdit.key,
      body: barcodeInlineValuesToBody({ ...inlineEdit.values, barcode: code }),
    });
  };

  const patchPrimary = (id) => {
    if (readOnly || inlineEdit) return;
    patchMutation.mutate({ id, body: { is_primary: true } });
  };

  const columns = buildBarcodesPanelColumns({
    t,
    readOnly,
    inlineEdit,
    itemUomOptions,
    getInlineValues,
    patchDraft,
    patchPrimary,
    patchMutationPending: patchMutation.isPending,
    saveMutationPending: saveMutation.isPending,
    saveInline,
    cancelInline,
    startEditRow,
    deleteMutation,
    modal,
  });

  return {
    isPending,
    tableData,
    columns,
    inlineEdit,
    itemUomOptions,
    getInlineValues,
    startCreateRow,
  };
}
