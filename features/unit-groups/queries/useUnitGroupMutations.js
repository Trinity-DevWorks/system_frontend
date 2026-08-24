"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { createUnitGroup, updateUnitGroup } from "../api/unitGroups.api";
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
  UNIT_GROUP_CREATE_SAVE_INTENT_EVENT,
  UNIT_GROUP_CREATE_SAVE_INTENT_KEY,
  sortUnitGroupsByName,
  unitGroupFormValuesToPayload,
} from "../utils/unitGroupDrawerUtils";
import { UNIT_GROUPS_LIST_QUERY_KEY, unitGroupDetailQueryKey } from "./unitGroupsQueryKeys";

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
export function useUnitGroupDrawerMutations({
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

  const applyPayload = useCallback((values) => unitGroupFormValuesToPayload(values), []);

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createUnitGroup(payload),
    onMutate: async ({ payload }) => {
      const listKey = UNIT_GROUPS_LIST_QUERY_KEY;
      await cancelTenantListQueries(queryClient, listKey);
      const previous = snapshotTenantListCache(queryClient, listKey);
      const optimisticId = -Date.now();
      const now = new Date().toISOString();
      const optimisticRow = {
        id: optimisticId,
        ...payload,
        created_at: now,
        updated_at: now,
      };
      patchTenantListCacheForCreate(queryClient, listKey, (rows) => sortUnitGroupsByName([...rows, optimisticRow]));
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
      const listKey = UNIT_GROUPS_LIST_QUERY_KEY;

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(UNIT_GROUP_CREATE_SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(UNIT_GROUP_CREATE_SAVE_INTENT_EVENT);
      }

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      const id = record?.id;
      patchTenantListCacheForCreate(queryClient, listKey, (rows) => {
        const withoutTemp = optimisticId != null ? rows.filter((r) => r.id !== optimisticId) : rows;
        if (id == null) return withoutTemp;
        return sortUnitGroupsByName([...withoutTemp.filter((r) => r.id !== id), data]);
      });
      if (id != null) {
        queryClient.setQueryData(unitGroupDetailQueryKey(id), data);
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
      invalidateTenantListQueries(queryClient, UNIT_GROUPS_LIST_QUERY_KEY);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateUnitGroup(id, values),
    onMutate: async ({ id, values }) => {
      const listKey = UNIT_GROUPS_LIST_QUERY_KEY;
      const detailKey = unitGroupDetailQueryKey(id);
      await cancelTenantListQueries(queryClient, listKey);
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousList = snapshotTenantListCache(queryClient, listKey);
      const previousDetail = queryClient.getQueryData(detailKey);
      const now = new Date().toISOString();
      patchTenantListCache(queryClient, listKey, (rows) =>
        rows.map((row) => (row.id === id ? { ...row, ...values, updated_at: now } : row)),
      );
      queryClient.setQueryData(detailKey, (old) => {
        if (!old || typeof old !== "object") {
          return { id, ...values, updated_at: now };
        }
        return { ...old, ...values, updated_at: now };
      });
      return { previousList, previousDetail, id };
    },
    onError: (err, _variables, context) => {
      restoreTenantListCache(queryClient, context.previousList);
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(unitGroupDetailQueryKey(context.id), context.previousDetail);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id }) => {
      const listKey = UNIT_GROUPS_LIST_QUERY_KEY;
      const detailKey = unitGroupDetailQueryKey(id);
      patchTenantListCache(queryClient, listKey, (rows) => sortUnitGroupsByName(rows.map((row) => (row.id === id ? data : row))));
      queryClient.setQueryData(detailKey, data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      const id = variables?.id;
      invalidateTenantListQueries(queryClient, UNIT_GROUPS_LIST_QUERY_KEY);
      if (id != null) {
        queryClient.invalidateQueries({ queryKey: unitGroupDetailQueryKey(id) });
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
