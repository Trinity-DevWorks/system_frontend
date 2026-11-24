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
import { CENTRAL_OVERVIEW_QUERY_KEY } from "../../overview/queries/overviewQueryKeys";
import { CENTRAL_ROLES_LIST_QUERY_KEY } from "../../roles/queries/rolesQueryKeys";
import { createCentralUser, updateCentralUser } from "../api/users.api";
import {
  CENTRAL_USER_CREATE_SAVE_INTENT_EVENT,
  CENTRAL_USER_CREATE_SAVE_INTENT_KEY,
  CENTRAL_USER_DEFAULTS,
  sortUsersByName,
} from "../utils/userDrawerUtils";
import { CENTRAL_USERS_LIST_QUERY_KEY, centralUserDetailQueryKey } from "./usersQueryKeys";

/** @param {Record<string, unknown>} values */
function withoutPasswordFields(values) {
  const copy = { ...values };
  delete copy.password;
  delete copy.password_confirmation;
  return copy;
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
 * }} args
 */
export function useCentralUserDrawerMutations({
  form,
  message,
  t,
  tApiErrors,
  onClose,
  onCreated,
  onSyncCreateDiscardBaseline,
}) {
  const queryClient = useQueryClient();

  /** Role `users_count` and overview user totals derive from central users. */
  const invalidateDependents = () => {
    invalidateTenantListQueries(queryClient, CENTRAL_ROLES_LIST_QUERY_KEY);
    queryClient.invalidateQueries({ queryKey: CENTRAL_OVERVIEW_QUERY_KEY });
  };

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createCentralUser(payload),
    onMutate: async ({ payload }) => {
      const listKey = CENTRAL_USERS_LIST_QUERY_KEY;
      await cancelTenantListQueries(queryClient, listKey);
      const previous = snapshotTenantListCache(queryClient, listKey);
      const optimisticId = `optimistic-${Date.now()}`;
      const now = new Date().toISOString();
      const visible = withoutPasswordFields(payload);
      const optimisticRow = { id: optimisticId, ...visible, role: null, created_at: now, updated_at: now };
      patchTenantListCacheForCreate(queryClient, listKey, (rows) => sortUsersByName([...rows, optimisticRow]));
      return { previous, optimisticId };
    },
    onError: (err, _variables, context) => {
      restoreTenantListCache(queryClient, context?.previous);
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, variables, context) => {
      const { intent } = variables;
      const optimisticId = context?.optimisticId;

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(CENTRAL_USER_CREATE_SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(CENTRAL_USER_CREATE_SAVE_INTENT_EVENT);
      }

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      const id = record?.id;
      patchTenantListCacheForCreate(queryClient, CENTRAL_USERS_LIST_QUERY_KEY, (rows) => {
        const withoutTemp = optimisticId != null ? rows.filter((r) => r.id !== optimisticId) : rows;
        if (id == null) return withoutTemp;
        return sortUsersByName([...withoutTemp.filter((r) => r.id !== id), data]);
      });
      if (id != null) {
        queryClient.setQueryData(centralUserDetailQueryKey(id), data);
      }

      message.success(t("drawerCreateSuccess"));

      if (intent === "keep") {
        onCreated?.(record ?? {});
        onSyncCreateDiscardBaseline?.("fromForm");
        return;
      }

      form.resetFields();
      form.setFieldsValue(CENTRAL_USER_DEFAULTS);
      onSyncCreateDiscardBaseline?.("defaults");
      if (intent !== "new") onClose();
    },
    onSettled: () => {
      invalidateTenantListQueries(queryClient, CENTRAL_USERS_LIST_QUERY_KEY);
      invalidateDependents();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateCentralUser(id, values),
    onMutate: async ({ id, values }) => {
      const listKey = CENTRAL_USERS_LIST_QUERY_KEY;
      const detailKey = centralUserDetailQueryKey(id);
      await cancelTenantListQueries(queryClient, listKey);
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousList = snapshotTenantListCache(queryClient, listKey);
      const previousDetail = queryClient.getQueryData(detailKey);
      const now = new Date().toISOString();
      const visible = withoutPasswordFields(values);
      patchTenantListCache(queryClient, listKey, (rows) =>
        rows.map((row) => (row.id === id ? { ...row, ...visible, updated_at: now } : row)),
      );
      queryClient.setQueryData(detailKey, (old) =>
        old && typeof old === "object" ? { ...old, ...visible, updated_at: now } : { id, ...visible, updated_at: now },
      );
      return { previousList, previousDetail, id };
    },
    onError: (err, _variables, context) => {
      restoreTenantListCache(queryClient, context?.previousList);
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(centralUserDetailQueryKey(context.id), context.previousDetail);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id }) => {
      patchTenantListCache(queryClient, CENTRAL_USERS_LIST_QUERY_KEY, (rows) =>
        sortUsersByName(rows.map((row) => (row.id === id ? data : row))),
      );
      queryClient.setQueryData(centralUserDetailQueryKey(id), data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      invalidateTenantListQueries(queryClient, CENTRAL_USERS_LIST_QUERY_KEY);
      if (variables?.id != null) {
        queryClient.invalidateQueries({ queryKey: centralUserDetailQueryKey(variables.id) });
      }
      invalidateDependents();
      // Editing yourself (name, role) changes the header identity and permission matrix.
      queryClient.invalidateQueries({ queryKey: CENTRAL_AUTH_ME_QUERY_KEY });
    },
  });

  return {
    createMutation,
    updateMutation,
    submitting: createMutation.isPending || updateMutation.isPending,
  };
}
