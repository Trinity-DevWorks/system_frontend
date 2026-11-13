"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { normalizeEntityId } from "@/lib/entityId";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { createRecurringTemplate, updateRecurringTemplate } from "../api/recurringTemplates.api";
import { toPayload } from "../utils/recurringTemplateDrawerUtils";
import { RECURRING_TEMPLATES_LIST_QUERY_KEY, recurringTemplateDetailQueryKey } from "./recurringEntriesQueryKeys";

/** @param {{ form: import("antd").FormInstance; message: { success: (s: string) => void }; notification: { error: (args: unknown) => void }; t: (key: string) => string; tApiErrors: (key: string) => string; templateId: string | null; onCreated?: (record: Record<string, unknown>) => void; onSaved?: (record: Record<string, unknown>) => void }} args */
export function useRecurringTemplateMutations({ form, message, notification, t, tApiErrors, templateId, onCreated, onSaved }) {
  const queryClient = useQueryClient();
  const onError = useCallback(
    (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({ title: t("actionError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
      }
    },
    [form, notification, t, tApiErrors],
  );
  const save = useMutation({
    mutationFn: async (values) => {
      const body = toPayload(values);
      if (templateId) return updateRecurringTemplate(templateId, body);
      return createRecurringTemplate(body);
    },
    onSuccess: (record) => {
      const id = normalizeEntityId(record?.id);
      if (id) queryClient.setQueryData(recurringTemplateDetailQueryKey(id), record);
      invalidateTenantListQueries(queryClient, RECURRING_TEMPLATES_LIST_QUERY_KEY);
      message.success(templateId ? t("drawerUpdateSuccess") : t("drawerCreateSuccess"));
      if (templateId) onSaved?.(record);
      else onCreated?.(record);
    },
    onError,
  });
  return { save, saving: save.isPending };
}
