"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteRecurringTemplate } from "../api/recurringTemplates.api";
import { RECURRING_TEMPLATES_LIST_QUERY_KEY } from "./recurringEntriesQueryKeys";

/** @param {{ t: (key: string) => string; tApiErrors: (key: string) => string; message: { success: (s: string) => void }; notification: { error: (args: unknown) => void }; modal: { confirm: (args: unknown) => void }; onDeleted?: () => void }} args */
export function useRecurringTemplatesDelete({ t, tApiErrors, message, notification, modal, onDeleted }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id) => deleteRecurringTemplate(String(id)),
    onSuccess: () => {
      message.success(t("deleteSuccess"));
      invalidateTenantListQueries(queryClient, RECURRING_TEMPLATES_LIST_QUERY_KEY);
      onDeleted?.();
    },
    onError: (err) => notification.error({ title: t("deleteError"), description: getLocalizedApiErrorMessage(tApiErrors, err) }),
  });
  return {
    requestDelete: (record) =>
      modal.confirm({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent", { name: record.name ?? "" }),
        okText: t("actionDelete"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => mutation.mutateAsync(record.id).catch(() => {}),
      }),
  };
}
