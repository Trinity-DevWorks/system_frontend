"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { createCustomer, updateCustomer } from "../api/customers.api";
import {
  patchTenantListCache,
  patchTenantListCacheForCreate,
  snapshotTenantListCache,
  restoreTenantListCache,
  cancelTenantListQueries,
  invalidateTenantListQueries,
} from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  CUSTOMER_CREATE_SAVE_INTENT_EVENT,
  CUSTOMER_CREATE_SAVE_INTENT_KEY,
  customerFormValuesToPayload,
  primarySnapshotForOptimistic,
  sortCustomersByName,
} from "../utils/customerDrawerUtils";
import { CUSTOMERS_LIST_QUERY_KEY, customerDetailQueryKey } from "./customersQueryKeys";

/**
 * @param {Record<string, unknown> | null | undefined} oldRow
 * @param {unknown[]} patchBalances
 */
function mergeCurrencyBalancesForCache(oldRow, patchBalances) {
  const oldB = Array.isArray(oldRow?.currency_balances) ? oldRow.currency_balances : [];
  const patch = Array.isArray(patchBalances) ? patchBalances : [];
  return patch.map((p) => {
    const row = /** @type {Record<string, unknown>} */ (p && typeof p === "object" ? p : {});
    const prev = oldB.find(
      (b) =>
        Number(/** @type {{ currency_id?: unknown }} */ (b).currency_id) === Number(row.currency_id),
    );
    return {
      ...row,
      balance: prev?.balance ?? "0.0000",
    };
  });
}

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSyncCreateDiscardBaseline?: (kind: "fromForm" | "defaults") => void;
 *   defaults: Record<string, unknown>;
 *   customerGroupsData: unknown[] | undefined;
 *   currenciesData: unknown[] | undefined;
 * }} args
 */
export function useCustomerDrawerMutations({
  form,
  message,
  t,
  tApiErrors,
  onClose,
  onCreated,
  onSyncCreateDiscardBaseline,
  defaults,
  customerGroupsData,
  currenciesData,
}) {
  const queryClient = useQueryClient();

  const toCreatePayload = useCallback((values) => customerFormValuesToPayload(values, "create"), []);
  const toUpdatePayload = useCallback((values) => customerFormValuesToPayload(values, "edit"), []);

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createCustomer(payload),
    onMutate: async ({ payload }) => {
      const listKey = CUSTOMERS_LIST_QUERY_KEY;
      await cancelTenantListQueries(queryClient, listKey);
      const previous = snapshotTenantListCache(queryClient, listKey);
      const optimisticId = -Date.now();
      const now = new Date().toISOString();
      const groupRow = Array.isArray(customerGroupsData)
        ? customerGroupsData.find((g) => g.id === payload.customer_group_id)
        : null;
      const snap = primarySnapshotForOptimistic(
        0,
        /** @type {unknown[]} */ (payload.currency_balances ?? []),
        currenciesData ?? [],
      );
      const optimisticRow = {
        id: optimisticId,
        customer_code: "",
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        type: payload.type,
        customer_group_id: payload.customer_group_id,
        customer_group: groupRow ? { id: groupRow.id, name: groupRow.name } : null,
        salesman_id: payload.salesman_id ?? null,
        payment_method_id: payload.payment_method_id ?? null,
        payment_terms_id: payload.payment_terms_id ?? null,
        vat_group_id: payload.vat_group_id ?? null,
        credit_limit: snap.credit_limit,
        opening_balance: snap.opening_balance,
        currency_balances: Array.isArray(payload.currency_balances) ? payload.currency_balances : [],
        status: typeof payload.status === "string" ? payload.status : "active",
        is_vat_registered: Boolean(payload.is_vat_registered),
        vat_number: payload.vat_number,
        notes: payload.notes,
        balance: snap.balance,
        created_at: now,
        updated_at: now,
      };
      patchTenantListCacheForCreate(queryClient, listKey, (rows) => sortCustomersByName([...rows, optimisticRow]));
      return { previous, optimisticId };
    },
    onError: (err, _variables, context) => {
      restoreTenantListCache(queryClient, context.previous);
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, variables, context) => {
      const { intent } = variables;
      const optimisticId = context?.optimisticId;
      const listKey = CUSTOMERS_LIST_QUERY_KEY;

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(CUSTOMER_CREATE_SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(CUSTOMER_CREATE_SAVE_INTENT_EVENT);
      }

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      const id = record?.id;
      patchTenantListCacheForCreate(queryClient, listKey, (rows) => {
        const withoutTemp = optimisticId != null ? rows.filter((r) => r.id !== optimisticId) : rows;
        if (id == null) return withoutTemp;
        return sortCustomersByName([...withoutTemp.filter((r) => r.id !== id), data]);
      });
      if (id != null) {
        queryClient.setQueryData(customerDetailQueryKey(id), data);
      }

      if (intent === "keep") {
        onCreated?.(record ?? {});
        message.success(t("drawerCreateSuccess"));
        onSyncCreateDiscardBaseline?.("fromForm");
        return;
      }
      if (intent === "new") {
        form.resetFields();
        form.setFieldsValue(defaults);
        message.success(t("drawerCreateSuccess"));
        onSyncCreateDiscardBaseline?.("defaults");
        return;
      }

      form.resetFields();
      form.setFieldsValue(defaults);
      message.success(t("drawerCreateSuccess"));
      onSyncCreateDiscardBaseline?.("defaults");
      onClose();
    },
    onSettled: () => {
      invalidateTenantListQueries(queryClient, CUSTOMERS_LIST_QUERY_KEY);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateCustomer(id, values),
    onMutate: async ({ id, values }) => {
      const listKey = CUSTOMERS_LIST_QUERY_KEY;
      const detailKey = customerDetailQueryKey(id);
      await cancelTenantListQueries(queryClient, listKey);
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousList = snapshotTenantListCache(queryClient, listKey);
      const previousDetail = queryClient.getQueryData(detailKey);
      const now = new Date().toISOString();
      const groupRow = Array.isArray(customerGroupsData)
        ? customerGroupsData.find((g) => g.id === values.customer_group_id)
        : null;
      const groupPatch = groupRow ? { id: groupRow.id, name: groupRow.name } : null;
      const snap = primarySnapshotForOptimistic(
        0,
        /** @type {unknown[]} */ (values.currency_balances ?? []),
        currenciesData ?? [],
      );
      patchTenantListCache(queryClient, listKey, (rows) =>
        rows.map((row) =>
          row.id === id
            ? {
                ...row,
                ...values,
                customer_group: groupPatch ?? row.customer_group,
                credit_limit: snap.credit_limit,
                opening_balance: snap.opening_balance,
                balance: snap.balance,
                currency_balances: mergeCurrencyBalancesForCache(
                  /** @type {Record<string, unknown>} */ (row),
                  /** @type {unknown[]} */ (values.currency_balances ?? []),
                ),
                updated_at: now,
              }
            : row,
        ),
      );
      queryClient.setQueryData(detailKey, (old) => {
        if (!old || typeof old !== "object") {
          return { id, ...values, customer_group: groupPatch, updated_at: now };
        }
        const prev = /** @type {Record<string, unknown>} */ (old);
        return {
          ...prev,
          ...values,
          customer_group: groupPatch ?? prev.customer_group,
          credit_limit: snap.credit_limit,
          opening_balance: snap.opening_balance,
          balance: snap.balance,
          currency_balances: mergeCurrencyBalancesForCache(prev, /** @type {unknown[]} */ (values.currency_balances ?? [])),
          updated_at: now,
        };
      });
      return { previousList, previousDetail, id };
    },
    onError: (err, _variables, context) => {
      restoreTenantListCache(queryClient, context.previousList);
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(customerDetailQueryKey(context.id), context.previousDetail);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id }) => {
      const listKey = CUSTOMERS_LIST_QUERY_KEY;
      const detailKey = customerDetailQueryKey(id);
      patchTenantListCache(queryClient, listKey, (rows) => sortCustomersByName(rows.map((row) => (row.id === id ? data : row))));
      queryClient.setQueryData(detailKey, data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      const id = variables?.id;
      invalidateTenantListQueries(queryClient, CUSTOMERS_LIST_QUERY_KEY);
      if (id != null) {
        queryClient.invalidateQueries({ queryKey: customerDetailQueryKey(id) });
      }
    },
  });

  const submitting = createMutation.isPending || updateMutation.isPending;

  return {
    createMutation,
    updateMutation,
    toCreatePayload,
    toUpdatePayload,
    submitting,
  };
}
