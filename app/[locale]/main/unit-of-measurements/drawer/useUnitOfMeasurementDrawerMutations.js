"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { createUnitOfMeasurement, updateUnitOfMeasurement } from "@/services/unitOfMeasurementsApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  UOM_CREATE_SAVE_INTENT_EVENT,
  UOM_CREATE_SAVE_INTENT_KEY,
  sortUnitOfMeasurementsByName,
  unitOfMeasurementFormValuesToPayload,
} from "./unitOfMeasurementDrawerUtils";

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
 *   unitGroupsData: unknown[] | undefined;
 * }} args
 */
export function useUnitOfMeasurementDrawerMutations({
  form,
  message,
  t,
  tApiErrors,
  onClose,
  onCreated,
  onCreateSuccess,
  onSyncCreateDiscardBaseline,
  defaults,
  unitGroupsData,
}) {
  const queryClient = useQueryClient();

  const applyPayload = useCallback((values) => unitOfMeasurementFormValuesToPayload(values), []);

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createUnitOfMeasurement(payload),
    onMutate: async ({ payload }) => {
      const listKey = ["tenant", "unit-of-measurements"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      const optimisticId = -Date.now();
      const now = new Date().toISOString();
      const groupRow = Array.isArray(unitGroupsData) ? unitGroupsData.find((g) => g.id === payload.unit_group_id) : null;
      const optimisticRow = {
        id: optimisticId,
        ...payload,
        unit_group: groupRow
          ? {
              id: groupRow.id,
              code: groupRow.code,
              name: groupRow.name,
              dimension_type: groupRow.dimension_type,
            }
          : null,
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData(listKey, (old) => {
        const base = Array.isArray(old) ? old : [];
        return sortUnitOfMeasurementsByName([...base, optimisticRow]);
      });
      return { previous, optimisticId };
    },
    onError: (err, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "unit-of-measurements"], context.previous);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, variables, context) => {
      const { intent } = variables;
      const optimisticId = context?.optimisticId;
      const listKey = ["tenant", "unit-of-measurements"];

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(UOM_CREATE_SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(UOM_CREATE_SAVE_INTENT_EVENT);
      }

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      const id = record?.id;
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        const withoutTemp = optimisticId != null ? old.filter((r) => r.id !== optimisticId) : old;
        if (id == null) return withoutTemp;
        return sortUnitOfMeasurementsByName([...withoutTemp.filter((r) => r.id !== id), data]);
      });
      if (id != null) {
        queryClient.setQueryData(["tenant", "unit-of-measurements", id], data);
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
      queryClient.invalidateQueries({ queryKey: ["tenant", "unit-of-measurements"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateUnitOfMeasurement(id, values),
    onMutate: async ({ id, values }) => {
      const listKey = ["tenant", "unit-of-measurements"];
      const detailKey = ["tenant", "unit-of-measurements", id];
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousList = queryClient.getQueryData(listKey);
      const previousDetail = queryClient.getQueryData(detailKey);
      const now = new Date().toISOString();
      const groupRow = Array.isArray(unitGroupsData) ? unitGroupsData.find((g) => g.id === values.unit_group_id) : null;
      const groupPatch = groupRow
        ? {
            id: groupRow.id,
            code: groupRow.code,
            name: groupRow.name,
            dimension_type: groupRow.dimension_type,
          }
        : null;
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((row) =>
          row.id === id
            ? {
                ...row,
                ...values,
                unit_group: groupPatch ?? row.unit_group,
                updated_at: now,
              }
            : row,
        );
      });
      queryClient.setQueryData(detailKey, (old) => {
        if (!old || typeof old !== "object") {
          return { id, ...values, unit_group: groupPatch, updated_at: now };
        }
        return { ...old, ...values, unit_group: groupPatch ?? old.unit_group, updated_at: now };
      });
      return { previousList, previousDetail, id };
    },
    onError: (err, _variables, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(["tenant", "unit-of-measurements"], context.previousList);
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(["tenant", "unit-of-measurements", context.id], context.previousDetail);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id }) => {
      const listKey = ["tenant", "unit-of-measurements"];
      const detailKey = ["tenant", "unit-of-measurements", id];
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        return sortUnitOfMeasurementsByName(old.map((row) => (row.id === id ? data : row)));
      });
      queryClient.setQueryData(detailKey, data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      const id = variables?.id;
      queryClient.invalidateQueries({ queryKey: ["tenant", "unit-of-measurements"] });
      if (id != null) {
        queryClient.invalidateQueries({ queryKey: ["tenant", "unit-of-measurements", id] });
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
