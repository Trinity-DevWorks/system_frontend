"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { CENTRAL_AUTH_ME_QUERY_KEY } from "@/lib/central-auth-me";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import {
  cancelTenantListQueries,
  invalidateTenantListQueries,
  patchTenantListCache,
  patchTenantListCacheForCreate,
  restoreTenantListCache,
  snapshotTenantListCache,
} from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCentralRole, updateCentralRole } from "../api/roles.api";
import {
  CENTRAL_ROLE_CREATE_SAVE_INTENT_EVENT,
  CENTRAL_ROLE_CREATE_SAVE_INTENT_KEY,
  CENTRAL_ROLE_DEFAULTS,
  sortRolesByName,
} from "../utils/roleDrawerUtils";
import { CENTRAL_ROLES_LIST_QUERY_KEY, centralRoleDetailQueryKey } from "./rolesQueryKeys";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSyncCreateDiscardBaseline?: (kind: "fromForm" | "defaults") => void;
 * }} args
 */
export function useCentralRoleDrawerMutations({
  form,
  message,
  t,
  tApiErrors,
  onClose,
  onCreated,
  onSyncCreateDiscardBaseline,
}) {
  const queryClient = useQueryClient();
  const listKey = CENTRAL_ROLES_LIST_QUERY_KEY;

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createCentralRole(payload),
    onMutate: async ({ payload }) => {
      await cancelTenantListQueries(queryClient, listKey);
      const previous = snapshotTenantListCache(queryClient, listKey);
      const optimisticId = -Date.now();
      const now = new Date().toISOString();
      patchTenantListCacheForCreate(queryClient, listKey, (rows) =>
        sortRolesByName([
          ...rows,
          { id: optimisticId, ...payload, is_system: false, users_count: 0, created_at: now, updated_at: now },
        ]),
      );
      return { previous, optimisticId };
    },
    onError: (err, _variables, context) => {
      restoreTenantListCache(queryClient, context?.previous);
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { intent }, context) => {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(CENTRAL_ROLE_CREATE_SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(CENTRAL_ROLE_CREATE_SAVE_INTENT_EVENT);
      }

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      const id = record?.id;
      patchTenantListCacheForCreate(queryClient, listKey, (rows) => {
        const withoutTemp = rows.filter((r) => r.id !== context?.optimisticId);
        if (id == null) return withoutTemp;
        return sortRolesByName([...withoutTemp.filter((r) => r.id !== id), data]);
      });
      if (id != null) queryClient.setQueryData(centralRoleDetailQueryKey(id), data);
      message.success(t("drawerCreateSuccess"));

      if (intent === "keep") {
        onCreated?.(record ?? {});
        onSyncCreateDiscardBaseline?.("fromForm");
        return;
      }

      form.resetFields();
      form.setFieldsValue(CENTRAL_ROLE_DEFAULTS);
      onSyncCreateDiscardBaseline?.("defaults");
      if (intent !== "new") onClose();
    },
    onSettled: () => {
      invalidateTenantListQueries(queryClient, listKey);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateCentralRole(id, values),
    onMutate: async ({ id, values }) => {
      const detailKey = centralRoleDetailQueryKey(id);
      await cancelTenantListQueries(queryClient, listKey);
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousList = snapshotTenantListCache(queryClient, listKey);
      const previousDetail = queryClient.getQueryData(detailKey);
      const now = new Date().toISOString();
      patchTenantListCache(queryClient, listKey, (rows) =>
        rows.map((row) => (row.id === id ? { ...row, ...values, updated_at: now } : row)),
      );
      queryClient.setQueryData(detailKey, (old) =>
        old && typeof old === "object" ? { ...old, ...values, updated_at: now } : { id, ...values, updated_at: now },
      );
      return { previousList, previousDetail, id };
    },
    onError: (err, _variables, context) => {
      restoreTenantListCache(queryClient, context?.previousList);
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(centralRoleDetailQueryKey(context.id), context.previousDetail);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id }) => {
      patchTenantListCache(queryClient, listKey, (rows) =>
        sortRolesByName(rows.map((row) => (row.id === id ? data : row))),
      );
      queryClient.setQueryData(centralRoleDetailQueryKey(id), data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      invalidateTenantListQueries(queryClient, listKey);
      // Deactivating a role changes the matrix of everyone holding it.
      queryClient.invalidateQueries({ queryKey: CENTRAL_AUTH_ME_QUERY_KEY });
      if (variables?.id != null) {
        queryClient.invalidateQueries({ queryKey: centralRoleDetailQueryKey(variables.id) });
      }
    },
  });

  return {
    createMutation,
    updateMutation,
    submitting: createMutation.isPending || updateMutation.isPending,
  };
}
