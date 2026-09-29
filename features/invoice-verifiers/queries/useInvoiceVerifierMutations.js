"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInvoiceVerifier, updateInvoiceVerifier } from "../api/invoiceVerifiers.api";
import {
  INVOICE_VERIFIER_CREATE_SAVE_INTENT_EVENT,
  INVOICE_VERIFIER_CREATE_SAVE_INTENT_KEY,
} from "../utils/invoiceVerifierDrawerUtils";
import { INVOICE_VERIFIERS_LIST_QUERY_KEY, invoiceVerifierDetailQueryKey } from "./invoiceVerifiersQueryKeys";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   message: import("antd").MessageInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSyncCreateDiscardBaseline?: (kind: "fromForm" | "defaults") => void;
 *   defaults: Record<string, unknown>;
 * }} args
 */
export function useInvoiceVerifierDrawerMutations({
  form,
  message,
  t,
  tApiErrors,
  onClose,
  onCreated,
  onSyncCreateDiscardBaseline,
  defaults,
}) {
  const queryClient = useQueryClient();

  const onError = (err) => {
    if (!applyApiFieldErrors(form, err)) {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("saveError"));
    }
  };

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createInvoiceVerifier(payload),
    onError,
    onSuccess: (data, { intent }) => {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(INVOICE_VERIFIER_CREATE_SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(INVOICE_VERIFIER_CREATE_SAVE_INTENT_EVENT);
      }

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      if (record?.id != null) {
        queryClient.setQueryData(invoiceVerifierDetailQueryKey(String(record.id)), data);
      }
      message.success(t("drawerCreateSuccess"));

      if (intent === "keep") {
        onCreated?.(record ?? {});
        onSyncCreateDiscardBaseline?.("fromForm");
        return;
      }
      form.resetFields();
      form.setFieldsValue(defaults);
      onSyncCreateDiscardBaseline?.("defaults");
      if (intent !== "new") onClose();
    },
    onSettled: () => invalidateTenantListQueries(queryClient, INVOICE_VERIFIERS_LIST_QUERY_KEY),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateInvoiceVerifier(id, payload),
    onError,
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(invoiceVerifierDetailQueryKey(id), data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: () => invalidateTenantListQueries(queryClient, INVOICE_VERIFIERS_LIST_QUERY_KEY),
  });

  return {
    createMutation,
    updateMutation,
    submitting: createMutation.isPending || updateMutation.isPending,
  };
}
