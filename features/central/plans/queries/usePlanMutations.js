"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
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
import { CENTRAL_TENANTS_LIST_QUERY_KEY } from "@/features/central/tenants/queries/tenantsQueryKeys";
import { CENTRAL_MODULES_QUERY_KEY } from "@/features/central/modules/queries/modulesQueryKeys";
import { CENTRAL_OVERVIEW_QUERY_KEY } from "@/features/central/overview/queries/overviewQueryKeys";
import { createCentralPlan, updateCentralPlan } from "../api/plans.api";
import {
  CENTRAL_PLAN_CREATE_SAVE_INTENT_EVENT,
  CENTRAL_PLAN_CREATE_SAVE_INTENT_KEY,
  CENTRAL_PLAN_DEFAULTS,
  sortPlans,
} from "../utils/planDrawerUtils";
import { CENTRAL_PLANS_LIST_QUERY_KEY, centralPlanDetailQueryKey } from "./plansQueryKeys";

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
export function useCentralPlanDrawerMutations({
  form,
  message,
  t,
  tApiErrors,
  onClose,
  onCreated,
  onSyncCreateDiscardBaseline,
}) {
  const queryClient = useQueryClient();
  const listKey = CENTRAL_PLANS_LIST_QUERY_KEY;

  // A plan's modules are its tenants' modules: refresh what shows them.
  const invalidateDependents = () => {
    // Whole prefix: tenant list, detail and modules entries.
    queryClient.invalidateQueries({ queryKey: CENTRAL_TENANTS_LIST_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: CENTRAL_MODULES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: CENTRAL_OVERVIEW_QUERY_KEY });
  };

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createCentralPlan(payload),
    onMutate: async ({ payload }) => {
      await cancelTenantListQueries(queryClient, listKey);
      const previous = snapshotTenantListCache(queryClient, listKey);
      const optimisticId = -Date.now();
      const now = new Date().toISOString();
      patchTenantListCacheForCreate(queryClient, listKey, (rows) =>
        sortPlans([...rows, { id: optimisticId, ...payload, tenants_count: 0, created_at: now, updated_at: now }]),
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
          localStorage.setItem(CENTRAL_PLAN_CREATE_SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(CENTRAL_PLAN_CREATE_SAVE_INTENT_EVENT);
      }

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      const id = record?.id;
      patchTenantListCacheForCreate(queryClient, listKey, (rows) => {
        const withoutTemp = rows.filter((r) => r.id !== context?.optimisticId);
        if (id == null) return withoutTemp;
        return sortPlans([...withoutTemp.filter((r) => r.id !== id), data]);
      });
      if (id != null) queryClient.setQueryData(centralPlanDetailQueryKey(id), data);
      message.success(t("drawerCreateSuccess"));

      if (intent === "keep") {
        onCreated?.(record ?? {});
        onSyncCreateDiscardBaseline?.("fromForm");
        return;
      }

      form.resetFields();
      form.setFieldsValue(CENTRAL_PLAN_DEFAULTS);
      onSyncCreateDiscardBaseline?.("defaults");
      if (intent !== "new") onClose();
    },
    onSettled: () => {
      invalidateTenantListQueries(queryClient, listKey);
      queryClient.invalidateQueries({ queryKey: CENTRAL_OVERVIEW_QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateCentralPlan(id, values),
    onMutate: async ({ id, values }) => {
      const detailKey = centralPlanDetailQueryKey(id);
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
        queryClient.setQueryData(centralPlanDetailQueryKey(context.id), context.previousDetail);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id }) => {
      patchTenantListCache(queryClient, listKey, (rows) =>
        sortPlans(rows.map((row) => (row.id === id ? data : row))),
      );
      queryClient.setQueryData(centralPlanDetailQueryKey(id), data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      invalidateTenantListQueries(queryClient, listKey);
      invalidateDependents();
      if (variables?.id != null) {
        queryClient.invalidateQueries({ queryKey: centralPlanDetailQueryKey(variables.id) });
      }
    },
  });

  return {
    createMutation,
    updateMutation,
    submitting: createMutation.isPending || updateMutation.isPending,
  };
}
