"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { createCustomerGroup, updateCustomerGroup } from "@/services/customerGroupsApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  CUSTOMER_GROUP_CREATE_SAVE_INTENT_EVENT,
  CUSTOMER_GROUP_CREATE_SAVE_INTENT_KEY,
  customerGroupFormValuesToPayload,
  sortCustomerGroupsByName,
} from "./customerGroupDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   defaults: Record<string, unknown>;
 * }} args
 */
export function useCustomerGroupDrawerMutations({ form, message, t, tApiErrors, onClose, onCreated, defaults }) {
  const queryClient = useQueryClient();

  const applyPayload = useCallback((values) => customerGroupFormValuesToPayload(values), []);

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createCustomerGroup(payload),
    onMutate: async ({ payload }) => {
      const listKey = ["tenant", "customer-groups"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      const optimisticId = -Date.now();
      const now = new Date().toISOString();
      const optimisticRow = {
        id: optimisticId,
        ...payload,
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData(listKey, (old) => {
        const base = Array.isArray(old) ? old : [];
        return sortCustomerGroupsByName([...base, optimisticRow]);
      });
      return { previous, optimisticId };
    },
    onError: (err, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "customer-groups"], context.previous);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, variables, context) => {
      const { intent } = variables;
      const optimisticId = context?.optimisticId;
      const listKey = ["tenant", "customer-groups"];

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(CUSTOMER_GROUP_CREATE_SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(CUSTOMER_GROUP_CREATE_SAVE_INTENT_EVENT);
      }

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      const id = record?.id;
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        const withoutTemp = optimisticId != null ? old.filter((r) => r.id !== optimisticId) : old;
        if (id == null) return withoutTemp;
        return sortCustomerGroupsByName([...withoutTemp.filter((r) => r.id !== id), data]);
      });
      if (id != null) {
        queryClient.setQueryData(["tenant", "customer-groups", id], data);
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
      queryClient.invalidateQueries({ queryKey: ["tenant", "customer-groups"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateCustomerGroup(id, values),
    onMutate: async ({ id, values }) => {
      const listKey = ["tenant", "customer-groups"];
      const detailKey = ["tenant", "customer-groups", id];
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousList = queryClient.getQueryData(listKey);
      const previousDetail = queryClient.getQueryData(detailKey);
      const now = new Date().toISOString();
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((row) => (row.id === id ? { ...row, ...values, updated_at: now } : row));
      });
      queryClient.setQueryData(detailKey, (old) => {
        if (!old || typeof old !== "object") {
          return { id, ...values, updated_at: now };
        }
        return { ...old, ...values, updated_at: now };
      });
      return { previousList, previousDetail, id };
    },
    onError: (err, _variables, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(["tenant", "customer-groups"], context.previousList);
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(["tenant", "customer-groups", context.id], context.previousDetail);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id }) => {
      const listKey = ["tenant", "customer-groups"];
      const detailKey = ["tenant", "customer-groups", id];
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        return sortCustomerGroupsByName(old.map((row) => (row.id === id ? data : row)));
      });
      queryClient.setQueryData(detailKey, data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      const id = variables?.id;
      queryClient.invalidateQueries({ queryKey: ["tenant", "customer-groups"] });
      if (id != null) {
        queryClient.invalidateQueries({ queryKey: ["tenant", "customer-groups", id] });
      }
    },
  });

  const submitting = createMutation.isPending || updateMutation.isPending;

  return {
    createMutation,
    updateMutation,
    applyPayload,
    submitting,
  };
}
