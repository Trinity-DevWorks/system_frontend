"use client";

/*
 * Handles creating and updating a sub-category through the API, with optimistic list updates and rollback on error.
 * Also wires success messages, closing the drawer, and putting field errors back on the form when the server complains.
 * Needs the parent categories list snapshot so optimistic rows can show the right parent category name.
 */

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { createSubCategory, updateSubCategory } from "@/services/subCategoriesApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  SUB_CATEGORY_CREATE_SAVE_INTENT_EVENT,
  SUB_CATEGORY_CREATE_SAVE_INTENT_KEY,
  sortSubCategoriesByName,
  subCategoryFormValuesToPayload,
} from "./subCategoryDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   defaults: Record<string, unknown>;
 *   categoriesData: unknown[] | undefined;
 * }} args
 */
export function useSubCategoryDrawerMutations({
  form,
  message,
  t,
  tApiErrors,
  onClose,
  onCreated,
  defaults,
  categoriesData,
}) {
  const queryClient = useQueryClient();

  const applyPayload = useCallback((values) => subCategoryFormValuesToPayload(values), []);

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createSubCategory(payload),
    onMutate: async ({ payload }) => {
      const listKey = ["tenant", "sub-categories"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      const optimisticId = -Date.now();
      const now = new Date().toISOString();
      const catRow = Array.isArray(categoriesData) ? categoriesData.find((c) => c.id === payload.category_id) : null;
      const optimisticRow = {
        id: optimisticId,
        category_id: payload.category_id,
        category: catRow ? { name: String(catRow.name ?? "") } : null,
        name: payload.name,
        color: payload.color,
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData(listKey, (old) => {
        const base = Array.isArray(old) ? old : [];
        return sortSubCategoriesByName([...base, optimisticRow]);
      });
      return { previous, optimisticId };
    },
    onError: (err, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "sub-categories"], context.previous);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, variables, context) => {
      const { intent } = variables;
      const optimisticId = context?.optimisticId;
      const listKey = ["tenant", "sub-categories"];

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(SUB_CATEGORY_CREATE_SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(SUB_CATEGORY_CREATE_SAVE_INTENT_EVENT);
      }

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      const id = record?.id;
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        const withoutTemp = optimisticId != null ? old.filter((r) => r.id !== optimisticId) : old;
        if (id == null) return withoutTemp;
        return sortSubCategoriesByName([...withoutTemp.filter((r) => r.id !== id), data]);
      });
      if (id != null) {
        queryClient.setQueryData(["tenant", "sub-categories", id], data);
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
      queryClient.invalidateQueries({ queryKey: ["tenant", "sub-categories"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateSubCategory(id, values),
    onMutate: async ({ id, values }) => {
      const listKey = ["tenant", "sub-categories"];
      const detailKey = ["tenant", "sub-categories", id];
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousList = queryClient.getQueryData(listKey);
      const previousDetail = queryClient.getQueryData(detailKey);
      const now = new Date().toISOString();
      const catRow = Array.isArray(categoriesData) ? categoriesData.find((c) => c.id === values.category_id) : null;
      const categoryPatch = catRow ? { name: String(catRow.name ?? "") } : null;
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((row) =>
          row.id === id
            ? {
                ...row,
                ...values,
                category: categoryPatch ?? row.category,
                updated_at: now,
              }
            : row,
        );
      });
      queryClient.setQueryData(detailKey, (old) => {
        if (!old || typeof old !== "object") {
          return { id, ...values, category: categoryPatch, updated_at: now };
        }
        return { ...old, ...values, category: categoryPatch ?? old.category, updated_at: now };
      });
      return { previousList, previousDetail, id };
    },
    onError: (err, _variables, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(["tenant", "sub-categories"], context.previousList);
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(["tenant", "sub-categories", context.id], context.previousDetail);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id }) => {
      const listKey = ["tenant", "sub-categories"];
      const detailKey = ["tenant", "sub-categories", id];
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        return sortSubCategoriesByName(old.map((row) => (row.id === id ? data : row)));
      });
      queryClient.setQueryData(detailKey, data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      const id = variables?.id;
      queryClient.invalidateQueries({ queryKey: ["tenant", "sub-categories"] });
      if (id != null) {
        queryClient.invalidateQueries({ queryKey: ["tenant", "sub-categories", id] });
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
