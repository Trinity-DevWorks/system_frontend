"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import {
  invalidateTenantListQueries,
  patchTenantListCache,
} from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CENTRAL_MODULES_QUERY_KEY } from "../../modules/queries/modulesQueryKeys";
import { CENTRAL_OVERVIEW_QUERY_KEY } from "../../overview/queries/overviewQueryKeys";
import {
  createCentralTenant,
  updateCentralTenant,
  updateCentralTenantModules,
  updateCentralTenantStatus,
} from "../api/tenants.api";
import {
  TENANT_CREATE_DEFAULTS,
  TENANT_CREATE_SAVE_INTENT_EVENT,
  TENANT_CREATE_SAVE_INTENT_KEY,
} from "../utils/tenantDrawerUtils";
import {
  CENTRAL_TENANTS_LIST_QUERY_KEY,
  centralTenantDetailQueryKey,
  centralTenantModulesQueryKey,
} from "./tenantsQueryKeys";

/**
 * Replace one tenant row in every cached list page and the detail cache.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {Record<string, unknown>} record
 */
function syncTenantRecord(queryClient, record) {
  const id = record?.id;
  if (id == null) return;
  patchTenantListCache(queryClient, CENTRAL_TENANTS_LIST_QUERY_KEY, (rows) =>
    rows.map((row) =>
      /** @type {{ id?: unknown }} */ (row).id === id ? { ...row, ...record } : row,
    ),
  );
  queryClient.setQueryData(centralTenantDetailQueryKey(String(id)), (old) =>
    old && typeof old === "object" ? { ...old, ...record } : record,
  );
}

/**
 * Tenant provisioning is slow and server-driven (schema + migrations + owner), so
 * create is not optimistic: the list refetches once the backend answers.
 *
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
export function useTenantCreateMutation({
  form,
  message,
  t,
  tApiErrors,
  onClose,
  onCreated,
  onSyncCreateDiscardBaseline,
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload }) => createCentralTenant(payload),
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { intent }) => {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(TENANT_CREATE_SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(TENANT_CREATE_SAVE_INTENT_EVENT);
      }

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      if (record?.id != null) {
        queryClient.setQueryData(centralTenantDetailQueryKey(String(record.id)), record);
      }
      message.success(t("drawerCreateSuccess"));

      if (intent === "keep") {
        onCreated?.(record ?? {});
        onSyncCreateDiscardBaseline?.("fromForm");
        return;
      }

      form.resetFields();
      form.setFieldsValue(TENANT_CREATE_DEFAULTS);
      onSyncCreateDiscardBaseline?.("defaults");
      if (intent !== "new") onClose();
    },
    onSettled: () => {
      invalidateTenantListQueries(queryClient, CENTRAL_TENANTS_LIST_QUERY_KEY);
      queryClient.invalidateQueries({ queryKey: CENTRAL_OVERVIEW_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CENTRAL_MODULES_QUERY_KEY });
    },
  });
}

/**
 * Rename, status change and module sync for an existing tenant.
 *
 * @param {{
 *   tenantId: string | null;
 *   form?: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 * }} args
 */
export function useTenantUpdateMutations({ tenantId, form, message, t, tApiErrors }) {
  const queryClient = useQueryClient();

  const invalidateAfterWrite = () => {
    invalidateTenantListQueries(queryClient, CENTRAL_TENANTS_LIST_QUERY_KEY);
    queryClient.invalidateQueries({ queryKey: CENTRAL_OVERVIEW_QUERY_KEY });
    if (tenantId != null) {
      queryClient.invalidateQueries({ queryKey: centralTenantDetailQueryKey(tenantId), exact: true });
    }
  };

  const renameMutation = useMutation({
    mutationFn: (/** @type {{ name: string }} */ body) =>
      updateCentralTenant(/** @type {string} */ (tenantId), body),
    onError: (err) => {
      if (!form || !applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data) => {
      if (data && typeof data === "object") syncTenantRecord(queryClient, /** @type {Record<string, unknown>} */ (data));
      message.success(t("drawerUpdateSuccess"));
    },
    onSettled: invalidateAfterWrite,
  });

  const statusMutation = useMutation({
    mutationFn: (/** @type {{ status: "active" | "suspended"; reason?: string | null }} */ body) =>
      updateCentralTenantStatus(/** @type {string} */ (tenantId), body),
    onError: (err) => {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err));
    },
    onSuccess: (data, body) => {
      if (data && typeof data === "object") syncTenantRecord(queryClient, /** @type {Record<string, unknown>} */ (data));
      message.success(body.status === "suspended" ? t("statusSuspendSuccess") : t("statusActivateSuccess"));
    },
    onSettled: invalidateAfterWrite,
  });

  const modulesMutation = useMutation({
    mutationFn: (/** @type {string[]} */ modules) =>
      updateCentralTenantModules(/** @type {string} */ (tenantId), modules),
    onError: (err) => {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err));
    },
    onSuccess: (data) => {
      if (tenantId != null) {
        queryClient.setQueryData(centralTenantModulesQueryKey(tenantId), data);
        if (Array.isArray(data?.modules)) {
          syncTenantRecord(queryClient, { id: tenantId, modules: data.modules });
        }
      }
      message.success(t("modulesSaveSuccess"));
    },
    onSettled: () => {
      invalidateAfterWrite();
      queryClient.invalidateQueries({ queryKey: CENTRAL_MODULES_QUERY_KEY });
    },
  });

  return { renameMutation, statusMutation, modulesMutation };
}
