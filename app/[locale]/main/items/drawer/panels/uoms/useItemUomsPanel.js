"use client";

/**
 * UOMs tab — queries, mutations, inline edit state, and table column config.
 *
 * Used by:
 * - drawer/panels/uoms/ItemUomsPanel.js
 */

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { fetchCurrencies } from "@/services/currenciesApi";
import { createItemUom, deleteItemUom, fetchItemUoms, updateItemUom } from "@/services/itemUomsApi";
import { fetchUnitOfMeasurements } from "@/services/unitOfMeasurementsApi";
import {
  isItemUomRow,
  itemUomsQueryKey,
  removeItemUomFromCache,
  setItemUomInCache,
} from "@/components/items/itemUomsQueryCache";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useMemo, useState } from "react";
import {
  defaultUomInlineValues,
  rowToUomInlineValues,
  uomInlineValuesToBody,
} from "../itemDrawerPanelsState";
import { buildUomsPanelColumns } from "./buildUomsPanelColumns";
import { UOM_DRAFT_ROW_ID } from "./uomsPanelConstants";

/** @typedef {import("./uomsPanelConstants").UomInlineValues} UomInlineValues */

/**
 * @param {{
 *   itemId: number;
 *   baseUomId?: number;
 *   readOnly: boolean;
 *   t: (k: string, values?: Record<string, unknown>) => string;
 *   tApiErrors: (k: string) => string;
 *   active: boolean;
 *   queryEnabled?: boolean;
 * }} args
 */
export function useItemUomsPanel({ itemId, baseUomId, readOnly, t, tApiErrors, active, queryEnabled = false }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [inlineEdit, setInlineEdit] = useState(
    /** @type {null | { key: "new" | number; values: UomInlineValues }} */ (null),
  );

  const itemUomsQueryKeyValue = useMemo(() => itemUomsQueryKey(itemId), [itemId]);

  const { data = [], isPending } = useQuery({
    queryKey: itemUomsQueryKeyValue,
    queryFn: () => fetchItemUoms(itemId),
    enabled: itemId > 0 && (active || queryEnabled),
  });

  const currenciesQuery = useQuery({
    queryKey: ["tenant", "currencies"],
    queryFn: fetchCurrencies,
    enabled: active && itemId > 0,
    staleTime: 5 * 60_000,
  });

  const uomsQuery = useQuery({
    queryKey: ["tenant", "unit-of-measurements"],
    queryFn: fetchUnitOfMeasurements,
    enabled: active && itemId > 0,
    staleTime: 5 * 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: (/** @type {{ id?: number; body: Record<string, unknown> }} */ { id, body }) =>
      id != null ? updateItemUom(itemId, id, body) : createItemUom(itemId, body),
    onSuccess: (saved) => {
      if (isItemUomRow(saved)) {
        setItemUomInCache(queryClient, itemId, saved);
      } else {
        void queryClient.invalidateQueries({ queryKey: itemUomsQueryKeyValue });
      }
      message.success(t("panelSaveSuccess"));
      setInlineEdit(null);
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteItemUom(itemId, id),
    onSuccess: (_data, deletedId) => {
      removeItemUomFromCache(queryClient, itemId, deletedId);
      message.success(t("panelDeleteSuccess"));
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const patchMutation = useMutation({
    mutationFn: (/** @type {{ id: number; body: Record<string, unknown> }} */ { id, body }) =>
      updateItemUom(itemId, id, body),
    onSuccess: (saved) => {
      if (isItemUomRow(saved)) {
        setItemUomInCache(queryClient, itemId, saved);
      } else {
        void queryClient.invalidateQueries({ queryKey: itemUomsQueryKeyValue });
      }
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const rows = useMemo(() => {
    const list = [...(data ?? [])];
    list.sort((a, b) => {
      if (a.is_base && !b.is_base) return -1;
      if (!a.is_base && b.is_base) return 1;
      const na = String(a.uom?.name ?? a.uom?.code ?? "").toLowerCase();
      const nb = String(b.uom?.name ?? b.uom?.code ?? "").toLowerCase();
      return na.localeCompare(nb);
    });
    return list;
  }, [data]);

  const baseRow = useMemo(() => rows.find((r) => r.is_base), [rows]);
  const baseUnitLabel = baseRow?.uom?.name ?? baseRow?.uom?.code ?? "—";

  const patchFlag = (/** @type {number} */ id, /** @type {Record<string, unknown>} */ body) => {
    if (readOnly || inlineEdit) return;
    patchMutation.mutate({ id, body });
  };

  const baseUomRecord = useMemo(
    () => (uomsQuery.data ?? []).find((u) => Number(u.id) === Number(baseUomId)),
    [uomsQuery.data, baseUomId],
  );

  const primaryCurrencyId = useMemo(
    () => (currenciesQuery.data ?? []).find((c) => c.is_primary)?.id,
    [currenciesQuery.data],
  );

  const usedUomCurrencyKeys = useMemo(() => {
    const keys = new Set();
    for (const r of rows) {
      const uomId = r.uom?.id ?? r.uom_id;
      const currencyId = r.currency?.id ?? r.currency_id;
      if (uomId != null && currencyId != null) keys.add(`${uomId}:${currencyId}`);
    }
    return keys;
  }, [rows]);

  const uomOptions = useMemo(() => {
    const groupId = baseUomRecord?.unit_group_id;
    let options = (uomsQuery.data ?? [])
      .filter((u) => groupId == null || Number(u.unit_group_id) === Number(groupId))
      .map((u) => ({
        value: u.id,
        label: `${u.name ?? u.code} (${u.code})`,
      }));

    if (inlineEdit?.key === "new") {
      const currencyId = inlineEdit.values.currency_id ?? primaryCurrencyId;
      const selectedUom = inlineEdit.values.uom_id;
      if (currencyId != null) {
        options = options.filter(
          (o) => o.value === selectedUom || !usedUomCurrencyKeys.has(`${o.value}:${currencyId}`),
        );
      }
    }

    return options;
  }, [uomsQuery.data, baseUomRecord, inlineEdit, primaryCurrencyId, usedUomCurrencyKeys]);

  const currencyOptions = useMemo(
    () => (currenciesQuery.data ?? []).map((c) => ({ value: c.id, label: c.code ?? c.name })),
    [currenciesQuery.data],
  );

  const tableData = useMemo(() => {
    if (!inlineEdit || inlineEdit.key !== "new") return rows;
    return [...rows, { id: UOM_DRAFT_ROW_ID, is_base: inlineEdit.values.is_base }];
  }, [rows, inlineEdit]);

  const getInlineValues = (row) => {
    if (!inlineEdit) return null;
    if (inlineEdit.key === "new" && row.id === UOM_DRAFT_ROW_ID) return inlineEdit.values;
    if (inlineEdit.key === row.id) return inlineEdit.values;
    return null;
  };

  const patchDraft = (patch) => {
    setInlineEdit((prev) => (prev ? { ...prev, values: { ...prev.values, ...patch } } : prev));
  };

  const startCreateRow = () => setInlineEdit({ key: "new", values: defaultUomInlineValues() });
  const startEditRow = (row) => setInlineEdit({ key: Number(row.id), values: rowToUomInlineValues(row) });
  const cancelInline = () => setInlineEdit(null);

  const saveInline = () => {
    if (!inlineEdit) return;
    if (inlineEdit.values.uom_id == null) {
      message.error(t("uomFieldRequired"));
      return;
    }
    saveMutation.mutate({
      id: inlineEdit.key === "new" ? undefined : inlineEdit.key,
      body: uomInlineValuesToBody(inlineEdit.values),
    });
  };

  const columns = buildUomsPanelColumns({
    t,
    readOnly,
    inlineEdit,
    uomOptions,
    currencyOptions,
    uomsQueryPending: uomsQuery.isPending,
    currenciesQueryPending: currenciesQuery.isPending,
    getInlineValues,
    patchDraft,
    patchFlag,
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
    baseRow,
    baseUnitLabel,
    getInlineValues,
    startCreateRow,
  };
}
