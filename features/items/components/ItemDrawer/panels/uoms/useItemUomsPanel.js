"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

/**
 * Units & pricing tab — UOM cards, UOM CRUD, and embedded barcodes per UOM.
 *
 * Used by:
 * - drawer/panels/uoms/ItemUomsPanel.js
 */

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { isPersistedEntityId } from "@/lib/entityId";
import { fetchItemBarcodes } from "../../../../api/itemBarcodes.api";
import { fetchCurrencyNames } from "@/features/currencies/index";
import { createItemUom, deleteItemUom, fetchItemUoms, updateItemUom } from "../../../../api/itemUoms.api";
import { fetchUnitOfMeasurementNames } from "@/features/unit-of-measurements/index";
import { itemBarcodesQueryKey } from "../../../../queries/itemBarcodesQueryCache";
import {
  isItemUomRow,
  itemUomsQueryKey,
  removeItemUomFromCache,
  setItemUomInCache,
} from "../../../../queries/itemUomsQueryCache";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useMemo, useState } from "react";
import {
  defaultUomInlineValues,
  rowToUomInlineValues,
  uomInlineValuesToBody,
} from "../itemDrawerPanelsState";
import { UOM_DRAFT_ROW_ID } from "./uomsPanelConstants";
import { CURRENCIES_LIST_QUERY_KEY } from "@/features/currencies";
import { UNIT_OF_MEASUREMENTS_LIST_QUERY_KEY } from "@/features/unit-of-measurements";
import { ITEMS_LIST_QUERY_KEY, itemDetailQueryKey } from "../../../../queries/itemsQueryKeys";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";

/** @typedef {import("../itemDrawerPanelsState").UomInlineValues} UomInlineValues */

/**
 * @param {{
 *   itemId: string;
 *   unitGroupId?: number;
 *   readOnly: boolean;
 *   t: (k: string, values?: Record<string, unknown>) => string;
 *   tApiErrors: (k: string) => string;
 *   active: boolean;
 *   queryEnabled?: boolean;
 * }} args
 */
export function useItemUomsPanel({ itemId, unitGroupId, readOnly, t, tApiErrors, active, queryEnabled = false }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [inlineEdit, setInlineEdit] = useState(
    /** @type {null | { key: "new" | number; values: UomInlineValues }} */ (null),
  );

  const itemUomsQueryKeyValue = useMemo(() => itemUomsQueryKey(itemId), [itemId]);
  const barcodesQueryKeyValue = useMemo(() => itemBarcodesQueryKey(itemId), [itemId]);
  const queriesEnabled = isPersistedEntityId(itemId) && (active || queryEnabled);

  const { data = [], isPending } = useQuery({
    queryKey: itemUomsQueryKeyValue,
    queryFn: () => fetchItemUoms(itemId),
    enabled: queriesEnabled,
  });

  const barcodesQuery = useQuery({
    queryKey: barcodesQueryKeyValue,
    queryFn: () => fetchItemBarcodes(itemId),
    enabled: queriesEnabled,
  });

  const currenciesQuery = useQuery({
    queryKey: CURRENCIES_LIST_QUERY_KEY,
    queryFn: fetchCurrencyNames,
    enabled: active && isPersistedEntityId(itemId),
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const uomsQuery = useQuery({
    queryKey: UNIT_OF_MEASUREMENTS_LIST_QUERY_KEY,
    queryFn: fetchUnitOfMeasurementNames,
    enabled: active && isPersistedEntityId(itemId),
    staleTime: QUERY_STALE_TIME.catalog,
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
      void queryClient.invalidateQueries({ queryKey: itemDetailQueryKey(itemId) });
      void invalidateTenantListQueries(queryClient, ITEMS_LIST_QUERY_KEY);
      message.success(t("panelSaveSuccess"));
      setInlineEdit(null);
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteItemUom(itemId, id),
    onSuccess: (_data, deletedId) => {
      removeItemUomFromCache(queryClient, itemId, deletedId);
      void queryClient.invalidateQueries({ queryKey: barcodesQueryKeyValue });
      message.success(t("panelDeleteSuccess"));
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const patchMutation = useMutation({
    mutationFn: (/** @type {{ id: number; body: Record<string, unknown> }} */ { id, body }) =>
      updateItemUom(itemId, id, body),
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: itemUomsQueryKeyValue });
      const previous = queryClient.getQueryData(itemUomsQueryKeyValue);
      const list = Array.isArray(previous) ? previous : [];
      const source = list.find((row) => row?.id === id);
      if (source && typeof source === "object") {
        setItemUomInCache(queryClient, itemId, { ...source, ...body });
      }
      return { previous };
    },
    onSuccess: (saved) => {
      if (isItemUomRow(saved)) {
        setItemUomInCache(queryClient, itemId, saved);
      }
    },
    onError: (err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(itemUomsQueryKeyValue, context.previous);
      }
      message.error(getLocalizedApiErrorMessage(tApiErrors, err));
    },
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

  const allBarcodes = useMemo(() => [...(barcodesQuery.data ?? [])], [barcodesQuery.data]);

  const orphanBarcodes = useMemo(
    () => allBarcodes.filter((row) => row && !row.item_uom_id),
    [allBarcodes],
  );

  const baseRow = useMemo(() => rows.find((r) => r.is_base), [rows]);
  const baseUnitLabel = baseRow?.uom?.name ?? baseRow?.uom?.code ?? "—";

  const resolvedUnitGroupId = unitGroupId != null && unitGroupId !== "" ? Number(unitGroupId) : null;

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
    let options = (uomsQuery.data ?? [])
      .filter((u) => resolvedUnitGroupId == null || Number(u.unit_group_id) === resolvedUnitGroupId)
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
  }, [uomsQuery.data, resolvedUnitGroupId, inlineEdit, primaryCurrencyId, usedUomCurrencyKeys]);

  const needsBaseUnit = !baseRow;
  const addDisabledReason = useMemo(() => {
    if (!resolvedUnitGroupId) return t("uomAddDisabledNoUnitGroup");
    if (inlineEdit) return t("uomAddDisabledEditing");
    return null;
  }, [resolvedUnitGroupId, inlineEdit, t]);

  const currencyOptions = useMemo(
    () => (currenciesQuery.data ?? []).map((c) => ({ value: c.id, label: c.code ?? c.name })),
    [currenciesQuery.data],
  );

  const variantCards = useMemo(() => {
    if (!inlineEdit || inlineEdit.key !== "new") return rows;
    return [{ id: UOM_DRAFT_ROW_ID, is_base: inlineEdit.values.is_base }, ...rows];
  }, [rows, inlineEdit]);

  const patchDraft = (patch) => {
    setInlineEdit((prev) => (prev ? { ...prev, values: { ...prev.values, ...patch } } : prev));
  };

  const startCreateRow = () => {
    if (!resolvedUnitGroupId || inlineEdit) return;
    setInlineEdit({
      key: "new",
      values: {
        ...defaultUomInlineValues(),
        currency_id: primaryCurrencyId,
        is_base: needsBaseUnit,
        conversion_factor: 1,
        is_default_sale: needsBaseUnit,
        is_default_purchase: needsBaseUnit,
      },
    });
  };

  const startEditRow = (row) => setInlineEdit({ key: Number(row.id), values: rowToUomInlineValues(row) });
  const cancelInline = () => setInlineEdit(null);

  const saveInline = () => {
    if (!inlineEdit) return;
    if (inlineEdit.values.uom_id == null) {
      message.error(t("uomFieldRequired"));
      return;
    }
    const body = uomInlineValuesToBody({
      ...inlineEdit.values,
      ...(needsBaseUnit && inlineEdit.key === "new"
        ? { is_base: true, conversion_factor: 1, is_default_sale: true, is_default_purchase: true }
        : {}),
    });
    saveMutation.mutate({
      id: inlineEdit.key === "new" ? undefined : inlineEdit.key,
      body,
    });
  };

  const patchFlag = (id, body) => {
    if (readOnly || inlineEdit) return;
    patchMutation.mutate({ id, body });
  };

  const requestDelete = (row) => {
    modal.confirm({
      title: t("variantCardDeleteConfirm"),
      okType: "danger",
      onOk: () => closeConfirmOnError(deleteMutation.mutateAsync(Number(row.id))),
    });
  };

  const getCardState = (row) => {
    if (!inlineEdit) {
      return { isEditing: false, isNew: false, values: rowToUomInlineValues(row) };
    }
    if (inlineEdit.key === "new" && row.id === UOM_DRAFT_ROW_ID) {
      return { isEditing: true, isNew: true, values: inlineEdit.values };
    }
    if (inlineEdit.key === row.id) {
      return { isEditing: true, isNew: false, values: inlineEdit.values };
    }
    return { isEditing: false, isNew: false, values: rowToUomInlineValues(row) };
  };

  return {
    isPending: isPending || barcodesQuery.isPending,
    variantCards,
    allBarcodes,
    orphanBarcodes,
    inlineEdit,
    baseRow,
    baseUnitLabel,
    needsBaseUnit,
    resolvedUnitGroupId,
    addDisabledReason,
    uomOptions,
    currencyOptions,
    uomsQueryPending: uomsQuery.isPending,
    currenciesQueryPending: currenciesQuery.isPending,
    saveMutationPending: saveMutation.isPending,
    patchMutationPending: patchMutation.isPending,
    startCreateRow,
    patchDraft,
    saveInline,
    cancelInline,
    startEditRow,
    patchFlag,
    requestDelete,
    getCardState,
  };
}
