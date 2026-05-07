"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { createSupplier, updateSupplier } from "@/services/suppliersApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  SUPPLIER_CREATE_SAVE_INTENT_EVENT,
  SUPPLIER_CREATE_SAVE_INTENT_KEY,
  sortSuppliersByName,
  supplierFormValuesToPayload,
} from "./supplierDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   defaults: Record<string, unknown>;
 *   supplierGroupsData: unknown[] | undefined;
 * }} args
 */
export function useSupplierDrawerMutations({
  form,
  message,
  t,
  tApiErrors,
  onClose,
  onCreated,
  defaults,
  supplierGroupsData,
}) {
  const queryClient = useQueryClient();

  const toCreatePayload = useCallback((values) => supplierFormValuesToPayload(values, "create"), []);
  const toUpdatePayload = useCallback((values) => supplierFormValuesToPayload(values, "edit"), []);

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createSupplier(payload),
    onMutate: async ({ payload }) => {
      const listKey = ["tenant", "suppliers"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      const optimisticId = -Date.now();
      const now = new Date().toISOString();
      const groupRow = Array.isArray(supplierGroupsData)
        ? supplierGroupsData.find((g) => g.id === payload.supplier_group_id)
        : null;
      const openingNum = Number(payload.opening_balance ?? 0);
      const balanceGuess = Number.isFinite(openingNum) ? openingNum.toFixed(4) : "0.0000";
      const optimisticRow = {
        id: optimisticId,
        supplier_code: "",
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        supplier_group_id: payload.supplier_group_id,
        supplier_group: groupRow ? { id: groupRow.id, name: groupRow.name } : null,
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
        return sortSuppliersByName([...base, optimisticRow]);
      });
      return { previous, optimisticId };
    },
    onError: (err, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "suppliers"], context.previous);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, variables, context) => {
      const { intent } = variables;
      const optimisticId = context?.optimisticId;
      const listKey = ["tenant", "suppliers"];

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(SUPPLIER_CREATE_SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(SUPPLIER_CREATE_SAVE_INTENT_EVENT);
      }

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      const id = record?.id;
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        const withoutTemp = optimisticId != null ? old.filter((r) => r.id !== optimisticId) : old;
        if (id == null) return withoutTemp;
        return sortSuppliersByName([...withoutTemp.filter((r) => r.id !== id), data]);
      });
      if (id != null) {
        queryClient.setQueryData(["tenant", "suppliers", id], data);
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
      queryClient.invalidateQueries({ queryKey: ["tenant", "suppliers"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateSupplier(id, values),
    onMutate: async ({ id, values }) => {
      const listKey = ["tenant", "suppliers"];
      const detailKey = ["tenant", "suppliers", id];
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousList = queryClient.getQueryData(listKey);
      const previousDetail = queryClient.getQueryData(detailKey);
      const now = new Date().toISOString();
      const groupRow = Array.isArray(supplierGroupsData)
        ? supplierGroupsData.find((g) => g.id === values.supplier_group_id)
        : null;
      const groupPatch = groupRow ? { id: groupRow.id, name: groupRow.name } : null;
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((row) =>
          row.id === id
            ? {
                ...row,
                ...values,
                supplier_group: groupPatch ?? row.supplier_group,
                credit_limit: String(Number(values.credit_limit ?? 0).toFixed(4)),
                updated_at: now,
              }
            : row,
        );
      });
      queryClient.setQueryData(detailKey, (old) => {
        if (!old || typeof old !== "object") {
          return { id, ...values, supplier_group: groupPatch, updated_at: now };
        }
        return {
          ...old,
          ...values,
          supplier_group: groupPatch ?? old.supplier_group,
          credit_limit: String(Number(values.credit_limit ?? 0).toFixed(4)),
          updated_at: now,
        };
      });
      return { previousList, previousDetail, id };
    },
    onError: (err, _variables, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(["tenant", "suppliers"], context.previousList);
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(["tenant", "suppliers", context.id], context.previousDetail);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id }) => {
      const listKey = ["tenant", "suppliers"];
      const detailKey = ["tenant", "suppliers", id];
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        return sortSuppliersByName(old.map((row) => (row.id === id ? data : row)));
      });
      queryClient.setQueryData(detailKey, data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      const id = variables?.id;
      queryClient.invalidateQueries({ queryKey: ["tenant", "suppliers"] });
      if (id != null) {
        queryClient.invalidateQueries({ queryKey: ["tenant", "suppliers", id] });
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
