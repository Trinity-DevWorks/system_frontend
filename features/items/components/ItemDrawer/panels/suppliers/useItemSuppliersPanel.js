"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

/**
 * Suppliers tab — queries, mutations, inline edit state, and table column config.
 *
 * Used by:
 * - drawer/panels/suppliers/ItemSuppliersPanel.js
 */

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { isPersistedEntityId, normalizeEntityId } from "@/lib/entityId";
import { fetchCurrencyNames } from "@/features/currencies/index";
import {
  createSupplierItem,
  deleteSupplierItem,
  fetchItemSuppliers,
  updateSupplierItem,
} from "../../../../api/supplierItems.api";
import { fetchSupplierNames } from "@/features/suppliers/index";
import {
  isSupplierItemRow,
  itemSupplierItemsQueryKey,
  removeSupplierItemFromCache,
  setSupplierItemInCache,
} from "../../../../queries/itemSupplierItemsQueryCache";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useMemo, useState } from "react";
import {
  defaultSupplierInlineValues,
  rowToSupplierInlineValues,
  supplierInlineValuesToBody,
} from "../itemDrawerPanelsState";
import { buildSuppliersPanelColumns } from "./buildSuppliersPanelColumns";
import { SUPPLIER_DRAFT_ROW_ID } from "./supplierPanelConstants";
import { SUPPLIERS_LIST_QUERY_KEY } from "@/features/suppliers";
import { CURRENCIES_LIST_QUERY_KEY } from "@/features/currencies";

/** @typedef {import("./supplierPanelConstants").SupplierInlineValues} SupplierInlineValues */

/**
 * @param {{
 *   itemId: string;
 *   readOnly: boolean;
 *   allowPurchase?: boolean;
 *   t: (k: string) => string;
 *   tApiErrors: (k: string) => string;
 *   active: boolean;
 * }} args
 */
export function useItemSuppliersPanel({ itemId, readOnly, allowPurchase = true, t, tApiErrors, active }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [inlineEdit, setInlineEdit] = useState(
    /** @type {null | { key: "new" | number; values: SupplierInlineValues }} */ (null),
  );

  const supplierItemsQueryKeyValue = useMemo(() => itemSupplierItemsQueryKey(itemId), [itemId]);

  const { data = [], isPending } = useQuery({
    queryKey: supplierItemsQueryKeyValue,
    queryFn: () => fetchItemSuppliers(itemId),
    enabled: active && isPersistedEntityId(itemId),
  });

  const rows = useMemo(() => [...(data ?? [])], [data]);

  const usedSupplierIds = useMemo(
    () =>
      new Set(
        rows
          .map((r) => normalizeEntityId(r.supplier_id ?? r.supplier?.id))
          .filter((id) => id != null),
      ),
    [rows],
  );

  const suppliersQuery = useQuery({
    queryKey: SUPPLIERS_LIST_QUERY_KEY,
    queryFn: fetchSupplierNames,
    enabled: active && !readOnly,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const currenciesQuery = useQuery({
    queryKey: CURRENCIES_LIST_QUERY_KEY,
    queryFn: fetchCurrencyNames,
    enabled: active && !readOnly,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const supplierOptions = useMemo(
    () =>
      (suppliersQuery.data ?? [])
        .filter((s) => {
          const id = normalizeEntityId(s.id);
          return id != null && !usedSupplierIds.has(id);
        })
        .map((s) => ({ value: s.id, label: s.name ?? s.supplier_code ?? String(s.id) })),
    [suppliersQuery.data, usedSupplierIds],
  );

  const addSupplierDisabledReason = useMemo(() => {
    if (!allowPurchase) return t("supplierAddDisabledPurchaseNotAllowed");
    if (inlineEdit) return t("supplierAddDisabledEditing");
    if (!suppliersQuery.isFetched) return null;
    if ((suppliersQuery.data ?? []).length === 0) return t("supplierAddDisabledNoSuppliers");
    if (supplierOptions.length === 0) return t("supplierAddDisabledAllLinked");
    return null;
  }, [allowPurchase, inlineEdit, suppliersQuery.isFetched, suppliersQuery.data, supplierOptions.length, t]);

  const addSupplierDisabled = addSupplierDisabledReason != null;

  const currencyOptions = useMemo(
    () =>
      (currenciesQuery.data ?? []).map((c) => ({
        value: c.id,
        label: c.code ?? c.name ?? String(c.id),
      })),
    [currenciesQuery.data],
  );

  const saveMutation = useMutation({
    mutationFn: (/** @type {{ supplierId: string; id?: number; body: Record<string, unknown> }} */ {
      supplierId,
      id,
      body,
    }) =>
      id != null
        ? updateSupplierItem(supplierId, id, body)
        : createSupplierItem(supplierId, { item_id: itemId, ...body }),
    onSuccess: (saved) => {
      if (isSupplierItemRow(saved)) {
        setSupplierItemInCache(queryClient, itemId, saved);
      } else {
        void queryClient.invalidateQueries({ queryKey: supplierItemsQueryKeyValue });
      }
      message.success(t("panelSaveSuccess"));
      setInlineEdit(null);
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const patchMutation = useMutation({
    mutationFn: (/** @type {{ supplierId: string; id: number; body: Record<string, unknown> }} */ {
      supplierId,
      id,
      body,
    }) => updateSupplierItem(supplierId, id, body),
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: supplierItemsQueryKeyValue });
      const previous = queryClient.getQueryData(supplierItemsQueryKeyValue);
      const list = Array.isArray(previous) ? previous : [];
      const source = list.find((row) => row?.id === id);
      if (source && typeof source === "object") {
        setSupplierItemInCache(queryClient, itemId, { ...source, ...body });
      }
      return { previous };
    },
    onSuccess: (saved) => {
      if (isSupplierItemRow(saved)) {
        setSupplierItemInCache(queryClient, itemId, saved);
      }
    },
    onError: (err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(supplierItemsQueryKeyValue, context.previous);
      }
      message.error(getLocalizedApiErrorMessage(tApiErrors, err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (/** @type {{ supplierId: string; id: number }} */ { supplierId, id }) =>
      deleteSupplierItem(supplierId, id),
    onSuccess: (_data, { id }) => {
      removeSupplierItemFromCache(queryClient, itemId, id);
      message.success(t("panelDeleteSuccess"));
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const tableData = useMemo(() => {
    if (!inlineEdit || inlineEdit.key !== "new") return rows;
    return [...rows, { id: SUPPLIER_DRAFT_ROW_ID, is_preferred: inlineEdit.values.is_preferred }];
  }, [rows, inlineEdit]);

  const getInlineValues = (row) => {
    if (!inlineEdit) return null;
    if (inlineEdit.key === "new" && row.id === SUPPLIER_DRAFT_ROW_ID) return inlineEdit.values;
    if (inlineEdit.key === row.id) return inlineEdit.values;
    return null;
  };

  const patchDraft = (patch) => {
    setInlineEdit((prev) => (prev ? { ...prev, values: { ...prev.values, ...patch } } : prev));
  };

  const startCreateRow = () => setInlineEdit({ key: "new", values: defaultSupplierInlineValues() });
  const startEditRow = (row) => setInlineEdit({ key: Number(row.id), values: rowToSupplierInlineValues(row) });
  const cancelInline = () => setInlineEdit(null);

  const saveInline = () => {
    if (!inlineEdit) return;
    const supplierId =
      inlineEdit.key === "new"
        ? inlineEdit.values.supplier_id
        : inlineEdit.values.supplier_id ?? rows.find((r) => r.id === inlineEdit.key)?.supplier_id;
    const normalizedSupplierId = normalizeEntityId(supplierId);
    if (normalizedSupplierId == null) {
      message.error(t("supplierFieldRequired"));
      return;
    }
    saveMutation.mutate({
      supplierId: normalizedSupplierId,
      id: inlineEdit.key === "new" ? undefined : inlineEdit.key,
      body: supplierInlineValuesToBody(inlineEdit.values),
    });
  };

  const patchPreferred = (row) => {
    if (readOnly || inlineEdit) return;
    const supplierId = normalizeEntityId(row.supplier_id ?? row.supplier?.id);
    if (supplierId == null) return;
    patchMutation.mutate({ supplierId, id: Number(row.id), body: { is_preferred: true } });
  };

  const columns = buildSuppliersPanelColumns({
    t,
    readOnly,
    inlineEdit,
    supplierOptions,
    currencyOptions,
    getInlineValues,
    patchDraft,
    patchPreferred,
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
    getInlineValues,
    allowPurchase,
    addSupplierDisabled,
    addSupplierDisabledReason,
    suppliersQueryPending: suppliersQuery.isPending,
    suppliersQueryFetched: suppliersQuery.isFetched,
    startCreateRow,
  };
}
