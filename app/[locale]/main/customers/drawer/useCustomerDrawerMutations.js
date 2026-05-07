"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { createCustomer, updateCustomer } from "@/services/customersApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  CUSTOMER_CREATE_SAVE_INTENT_EVENT,
  CUSTOMER_CREATE_SAVE_INTENT_KEY,
  customerFormValuesToPayload,
  sortCustomersByName,
} from "./customerDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   defaults: Record<string, unknown>;
 *   customerGroupsData: unknown[] | undefined;
 * }} args
 */
export function useCustomerDrawerMutations({
  form,
  message,
  t,
  tApiErrors,
  onClose,
  onCreated,
  defaults,
  customerGroupsData,
}) {
  const queryClient = useQueryClient();

  const toCreatePayload = useCallback((values) => customerFormValuesToPayload(values, "create"), []);
  const toUpdatePayload = useCallback((values) => customerFormValuesToPayload(values, "edit"), []);

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createCustomer(payload),
    onMutate: async ({ payload }) => {
      const listKey = ["tenant", "customers"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      const optimisticId = -Date.now();
      const now = new Date().toISOString();
      const groupRow = Array.isArray(customerGroupsData)
        ? customerGroupsData.find((g) => g.id === payload.customer_group_id)
        : null;
      const openingNum = Number(payload.opening_balance ?? 0);
      const balanceGuess = Number.isFinite(openingNum) ? openingNum.toFixed(4) : "0.0000";
      const optimisticRow = {
        id: optimisticId,
        customer_code: "",
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        type: payload.type,
        customer_group_id: payload.customer_group_id,
        customer_group: groupRow ? { id: groupRow.id, name: groupRow.name } : null,
        credit_limit: String(Number(payload.credit_limit ?? 0).toFixed(4)),
        opening_balance: String(payload.opening_balance ?? "0"),
        is_active: Boolean(payload.is_active),
        is_vat_registered: Boolean(payload.is_vat_registered),
        vat_number: payload.vat_number,
        notes: payload.notes,
        balance: balanceGuess,
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData(listKey, (old) => {
        const base = Array.isArray(old) ? old : [];
        return sortCustomersByName([...base, optimisticRow]);
      });
      return { previous, optimisticId };
    },
    onError: (err, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "customers"], context.previous);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, variables, context) => {
      const { intent } = variables;
      const optimisticId = context?.optimisticId;
      const listKey = ["tenant", "customers"];

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
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        const withoutTemp = optimisticId != null ? old.filter((r) => r.id !== optimisticId) : old;
        if (id == null) return withoutTemp;
        return sortCustomersByName([...withoutTemp.filter((r) => r.id !== id), data]);
      });
      if (id != null) {
        queryClient.setQueryData(["tenant", "customers", id], data);
      }

      if (intent === "keep") {
        onCreated?.(record ?? {});
        message.success(t("drawerCreateSuccess"));
        return;
      }
      if (intent === "new") {
        form.resetFields();
        form.setFieldsValue(defaults);
        message.success(t("drawerCreateSuccess"));
        return;
      }

      form.resetFields();
      form.setFieldsValue(defaults);
      message.success(t("drawerCreateSuccess"));
      onClose();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "customers"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateCustomer(id, values),
    onMutate: async ({ id, values }) => {
      const listKey = ["tenant", "customers"];
      const detailKey = ["tenant", "customers", id];
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousList = queryClient.getQueryData(listKey);
      const previousDetail = queryClient.getQueryData(detailKey);
      const now = new Date().toISOString();
      const groupRow = Array.isArray(customerGroupsData)
        ? customerGroupsData.find((g) => g.id === values.customer_group_id)
        : null;
      const groupPatch = groupRow ? { id: groupRow.id, name: groupRow.name } : null;
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((row) =>
          row.id === id
            ? {
                ...row,
                ...values,
                customer_group: groupPatch ?? row.customer_group,
                credit_limit: String(Number(values.credit_limit ?? 0).toFixed(4)),
                updated_at: now,
              }
            : row,
        );
      });
      queryClient.setQueryData(detailKey, (old) => {
        if (!old || typeof old !== "object") {
          return { id, ...values, customer_group: groupPatch, updated_at: now };
        }
        return {
          ...old,
          ...values,
          customer_group: groupPatch ?? old.customer_group,
          credit_limit: String(Number(values.credit_limit ?? 0).toFixed(4)),
          updated_at: now,
        };
      });
      return { previousList, previousDetail, id };
    },
    onError: (err, _variables, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(["tenant", "customers"], context.previousList);
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(["tenant", "customers", context.id], context.previousDetail);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id }) => {
      const listKey = ["tenant", "customers"];
      const detailKey = ["tenant", "customers", id];
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        return sortCustomersByName(old.map((row) => (row.id === id ? data : row)));
      });
      queryClient.setQueryData(detailKey, data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      const id = variables?.id;
      queryClient.invalidateQueries({ queryKey: ["tenant", "customers"] });
      if (id != null) {
        queryClient.invalidateQueries({ queryKey: ["tenant", "customers", id] });
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
