"use client";

/**
 * Replenishment tab — per-warehouse min/max and reorder rules.
 *
 * Used by:
 * - drawer/panels/replenishment/ItemReplenishmentPanel.js
 */

import {
  isItemWarehouseReplenishmentRow,
  itemWarehouseReplenishmentsQueryKey,
  removeItemWarehouseReplenishmentFromCache,
  setItemWarehouseReplenishmentInCache,
} from "@/components/items/itemWarehouseReplenishmentsQueryCache";
import { invalidatePurchasingAlertsQueries } from "@/components/stock/stockQueryCache";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import {
  createItemWarehouseReplenishment,
  deleteItemWarehouseReplenishment,
  fetchItemWarehouseReplenishments,
  updateItemWarehouseReplenishment,
} from "@/services/itemWarehouseReplenishmentsApi";
import { fetchWarehouses } from "@/services/warehousesApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useMemo, useState } from "react";
import { isPersistedEntityId } from "@/lib/entityId";
import { buildReplenishmentPanelColumns } from "./buildReplenishmentPanelColumns";
import {
  REPLENISHMENT_DRAFT_ROW_ID,
  defaultReplenishmentInlineValues,
  replenishmentInlineValuesToBody,
  rowToReplenishmentInlineValues,
} from "./replenishmentPanelConstants";

/** @typedef {import("./replenishmentPanelConstants").ReplenishmentInlineValues} ReplenishmentInlineValues */

/**
 * @param {{
 *   itemId: string;
 *   readOnly: boolean;
 *   trackInventory?: boolean;
 *   allowPurchase?: boolean;
 *   t: (k: string) => string;
 *   tApiErrors: (k: string) => string;
 *   active: boolean;
 * }} args
 */
export function useItemReplenishmentPanel({
  itemId,
  readOnly,
  trackInventory = true,
  allowPurchase = true,
  t,
  tApiErrors,
  active,
}) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [inlineEdit, setInlineEdit] = useState(
    /** @type {null | { key: "new" | number; values: ReplenishmentInlineValues }} */ (null),
  );

  const queryKey = useMemo(() => itemWarehouseReplenishmentsQueryKey(itemId), [itemId]);
  const replenishmentAllowed = trackInventory && allowPurchase;

  const { data = [], isPending } = useQuery({
    queryKey,
    queryFn: () => fetchItemWarehouseReplenishments(itemId),
    enabled: active && isPersistedEntityId(itemId) && replenishmentAllowed,
  });

  const rows = useMemo(() => [...(data ?? [])], [data]);

  const usedWarehouseIds = useMemo(
    () => new Set(rows.map((r) => Number(r.warehouse_id ?? r.warehouse?.id)).filter((id) => id > 0)),
    [rows],
  );

  const warehousesQuery = useQuery({
    queryKey: ["tenant", "warehouses"],
    queryFn: fetchWarehouses,
    enabled: active && !readOnly && replenishmentAllowed,
    staleTime: 5 * 60_000,
  });

  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data ?? [])
        .filter((w) => w.is_active !== false && !usedWarehouseIds.has(Number(w.id)))
        .map((w) => ({
          value: w.id,
          label:
            typeof w.shortcut_name === "string" && w.shortcut_name.trim()
              ? `${w.shortcut_name} — ${w.name}`
              : String(w.name ?? w.id),
        })),
    [warehousesQuery.data, usedWarehouseIds],
  );

  const addDisabledReason = useMemo(() => {
    if (!replenishmentAllowed) return null;
    if (inlineEdit) return t("replenishmentAddDisabledEditing");
    if (!warehousesQuery.isFetched) return null;
    if ((warehousesQuery.data ?? []).length === 0) return t("replenishmentAddDisabledNoWarehouses");
    if (warehouseOptions.length === 0) return t("replenishmentAddDisabledAllLinked");
    return null;
  }, [replenishmentAllowed, inlineEdit, warehousesQuery.isFetched, warehousesQuery.data, warehouseOptions.length, t]);

  const saveMutation = useMutation({
    mutationFn: (/** @type {{ id?: number; body: Record<string, unknown> }} */ { id, body }) =>
      id != null
        ? updateItemWarehouseReplenishment(itemId, id, body)
        : createItemWarehouseReplenishment(itemId, body),
    onSuccess: (saved) => {
      if (isItemWarehouseReplenishmentRow(saved)) {
        setItemWarehouseReplenishmentInCache(queryClient, itemId, saved);
      } else {
        void queryClient.invalidateQueries({ queryKey });
      }
      message.success(t("panelSaveSuccess"));
      setInlineEdit(null);
      invalidatePurchasingAlertsQueries(queryClient);
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteItemWarehouseReplenishment(itemId, id),
    onSuccess: (_data, deletedId) => {
      removeItemWarehouseReplenishmentFromCache(queryClient, itemId, deletedId);
      message.success(t("panelDeleteSuccess"));
      invalidatePurchasingAlertsQueries(queryClient);
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const tableData = useMemo(() => {
    if (!inlineEdit || inlineEdit.key !== "new") return rows;
    return [{ id: REPLENISHMENT_DRAFT_ROW_ID, is_active: true }, ...rows];
  }, [rows, inlineEdit]);

  const getInlineValues = (row) => {
    if (!inlineEdit) return null;
    if (inlineEdit.key === "new" && row.id === REPLENISHMENT_DRAFT_ROW_ID) return inlineEdit.values;
    if (inlineEdit.key === row.id) return inlineEdit.values;
    return null;
  };

  const startCreateRow = () => {
    if (readOnly || inlineEdit || addDisabledReason) return;
    setInlineEdit({ key: "new", values: defaultReplenishmentInlineValues() });
  };

  const startEditRow = (row) => {
    if (readOnly || inlineEdit) return;
    setInlineEdit({ key: Number(row.id), values: rowToReplenishmentInlineValues(row) });
  };

  const patchDraft = (patch) => {
    setInlineEdit((prev) => (prev ? { ...prev, values: { ...prev.values, ...patch } } : prev));
  };

  const cancelInline = () => setInlineEdit(null);

  const saveInline = () => {
    if (!inlineEdit) return;
    if (inlineEdit.values.warehouse_id == null) {
      message.error(t("replenishmentFieldWarehouseRequired"));
      return;
    }
    if (inlineEdit.values.reorder_point_qty == null) {
      message.error(t("replenishmentFieldReorderPointRequired"));
      return;
    }
    saveMutation.mutate({
      id: inlineEdit.key === "new" ? undefined : inlineEdit.key,
      body: replenishmentInlineValuesToBody(inlineEdit.values),
    });
  };

  const columns = useMemo(
    () =>
      buildReplenishmentPanelColumns({
        t,
        readOnly,
        inlineEdit,
        warehouseOptions,
        getInlineValues,
        patchDraft,
        saveMutationPending: saveMutation.isPending,
        saveInline,
        cancelInline,
        startEditRow,
        deleteMutation,
        modal,
      }),
    [
      t,
      readOnly,
      inlineEdit,
      warehouseOptions,
      saveMutation.isPending,
      deleteMutation,
      modal,
    ],
  );

  return {
    isPending,
    tableData,
    columns,
    getInlineValues,
    replenishmentAllowed,
    addDisabled: Boolean(readOnly || inlineEdit || addDisabledReason),
    addDisabledReason,
    warehousesQueryPending: warehousesQuery.isPending,
    warehousesQueryFetched: warehousesQuery.isFetched,
    startCreateRow,
  };
}
