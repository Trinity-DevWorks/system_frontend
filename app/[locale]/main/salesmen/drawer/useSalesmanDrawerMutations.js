"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { createSalesman, updateSalesman } from "@/services/salesmenApi";
import {
  patchTenantListCache,
  snapshotTenantListCache,
  restoreTenantListCache,
} from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  SALESMAN_CREATE_SAVE_INTENT_EVENT,
  SALESMAN_CREATE_SAVE_INTENT_KEY,
  sortSalesmenByName,
  salesmanFormValuesToPayload,
} from "./salesmanDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onCreateSuccess?: (record: Record<string, unknown>) => void;
 *   onSyncCreateDiscardBaseline?: (kind: "fromForm" | "defaults") => void;
 *   defaults: Record<string, unknown>;
 * }} args
 */
export function useSalesmanDrawerMutations({
  form,
  message,
  t,
  tApiErrors,
  onClose,
  onCreated,
  onCreateSuccess,
  onSyncCreateDiscardBaseline,
  defaults,
}) {
  const queryClient = useQueryClient();

  const applyPayload = useCallback((values) => salesmanFormValuesToPayload(values), []);

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createSalesman(payload),
    onMutate: async ({ payload }) => {
      const listKey = ["tenant", "salesmen"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = snapshotTenantListCache(queryClient, listKey);
      const optimisticId = -Date.now();
      const now = new Date().toISOString();
      const optimisticRow = {
        id: optimisticId,
        ...payload,
        full_name: `${String(payload.first_name ?? "").trim()} ${String(payload.last_name ?? "").trim()}`.trim(),
        warehouse_name: null,
        user_name: null,
        created_at: now,
        updated_at: now,
      };
      patchTenantListCache(queryClient, listKey, (rows) => sortSalesmenByName([...rows, optimisticRow]));
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
      const listKey = ["tenant", "salesmen"];

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(SALESMAN_CREATE_SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(SALESMAN_CREATE_SAVE_INTENT_EVENT);
      }

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      const id = record?.id;
      patchTenantListCache(queryClient, listKey, (rows) => {
        const withoutTemp = optimisticId != null ? rows.filter((r) => r.id !== optimisticId) : rows;
        if (id == null) return withoutTemp;
        return sortSalesmenByName([...withoutTemp.filter((r) => r.id !== id), data]);
      });
      if (id != null) {
        queryClient.setQueryData(["tenant", "salesmen", id], data);
      }

      if (typeof onCreateSuccess === "function" && id != null) {
        onCreateSuccess(record ?? {});
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
      queryClient.invalidateQueries({ queryKey: ["tenant", "salesmen"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateSalesman(id, values),
    onMutate: async ({ id, values }) => {
      const listKey = ["tenant", "salesmen"];
      const detailKey = ["tenant", "salesmen", id];
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousList = snapshotTenantListCache(queryClient, listKey);
      const previousDetail = queryClient.getQueryData(detailKey);
      const now = new Date().toISOString();
      const merged = { ...values, full_name: `${values.first_name} ${values.last_name}`.trim() };
      patchTenantListCache(queryClient, listKey, (rows) =>
        rows.map((row) => (row.id === id ? { ...row, ...merged, updated_at: now } : row)),
      );
      queryClient.setQueryData(detailKey, (old) => {
        if (!old || typeof old !== "object") {
          return { id, ...merged, updated_at: now };
        }
        return { ...old, ...merged, updated_at: now };
      });
      return { previousList, previousDetail, id };
    },
    onError: (err, _variables, context) => {
      restoreTenantListCache(queryClient, context.previousList);
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(["tenant", "salesmen", context.id], context.previousDetail);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id }) => {
      const listKey = ["tenant", "salesmen"];
      const detailKey = ["tenant", "salesmen", id];
      patchTenantListCache(queryClient, listKey, (rows) => sortSalesmenByName(rows.map((row) => (row.id === id ? data : row))));
      queryClient.setQueryData(detailKey, data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      const id = variables?.id;
      queryClient.invalidateQueries({ queryKey: ["tenant", "salesmen"] });
      if (id != null) {
        queryClient.invalidateQueries({ queryKey: ["tenant", "salesmen", id] });
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
