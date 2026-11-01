"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { createItemAttribute, updateItemAttribute } from "../api/itemAttributes.api";
import {
  ITEM_ATTRIBUTE_CREATE_SAVE_INTENT_EVENT,
  ITEM_ATTRIBUTE_CREATE_SAVE_INTENT_KEY,
  itemAttributeFormValuesToPayload,
  mapItemAttributeToFormValues,
} from "../utils/itemAttributeDrawerUtils";
import { ITEM_ATTRIBUTES_LIST_QUERY_KEY, itemAttributeDetailQueryKey } from "./itemAttributesQueryKeys";

/**
 * Create / update an attribute with its full value list.
 *
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
export function useItemAttributeMutations({
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
  const applyPayload = useCallback((values) => itemAttributeFormValuesToPayload(values), []);

  const onError = (err) => {
    if (!applyApiFieldErrors(form, err)) message.error(getLocalizedApiErrorMessage(tApiErrors, err));
  };

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createItemAttribute(payload),
    onError,
    onSuccess: (data, { intent }) => {
      try {
        localStorage.setItem(ITEM_ATTRIBUTE_CREATE_SAVE_INTENT_KEY, intent);
      } catch {
        /* ignore */
      }
      notifyPersistedSaveIntent(ITEM_ATTRIBUTE_CREATE_SAVE_INTENT_EVENT);

      const record = data && typeof data === "object" ? /** @type {Record<string, any>} */ (data) : {};
      if (record.id != null) {
        queryClient.setQueryData(itemAttributeDetailQueryKey(record.id), record);
        onCreateSuccess?.(record);
      }
      message.success(t("drawerCreateSuccess"));

      if (intent === "keep") {
        // Keep the saved value ids so the next save updates them instead of re-creating.
        form.setFieldsValue(mapItemAttributeToFormValues(record));
        onCreated?.(record);
        onSyncCreateDiscardBaseline?.("fromForm");
        return;
      }
      form.resetFields();
      form.setFieldsValue(defaults);
      onSyncCreateDiscardBaseline?.("defaults");
      if (intent !== "new") onClose();
    },
    onSettled: () => invalidateTenantListQueries(queryClient, ITEM_ATTRIBUTES_LIST_QUERY_KEY),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateItemAttribute(id, values),
    onError,
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(itemAttributeDetailQueryKey(id), data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      invalidateTenantListQueries(queryClient, ITEM_ATTRIBUTES_LIST_QUERY_KEY);
      if (variables?.id != null) queryClient.invalidateQueries({ queryKey: itemAttributeDetailQueryKey(variables.id) });
    },
  });

  return {
    createMutation,
    updateMutation,
    applyPayload,
    submitting: createMutation.isPending || updateMutation.isPending,
  };
}
