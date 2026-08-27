"use client";

/**
 * Create/update mutations, API error mapping, save-intent persistence, and list cache updates.
 *
 * Used by:
 * - drawer/ItemDrawer.js
 */

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { createItem, updateItem } from "../api/items.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { itemFormValuesToPayload } from "../utils/itemDrawerUtils";
import { persistItemDrawerSaveIntent } from "../utils/itemDrawerSaveIntent";
import { applyCreatedItemToCache, applyUpdatedItemToCache } from "../utils/itemDrawerMutationCache";

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
 *   onSyncEditDiscardBaseline?: (record: Record<string, unknown>) => void;
 *   onSaveAndNew?: () => void;
 *   defaults: Record<string, unknown>;
 * }} args
 */
export function useItemDrawerMutations({
  form,
  message,
  t,
  tApiErrors,
  onClose,
  onCreated,
  onCreateSuccess,
  onSyncCreateDiscardBaseline,
  onSyncEditDiscardBaseline,
  onSaveAndNew,
  defaults,
}) {
  const queryClient = useQueryClient();
  const applyPayload = useCallback((values) => itemFormValuesToPayload(values), []);

  const createMutation = useMutation({
    mutationFn: ({ payload }) => createItem(payload),
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, variables) => {
      const { intent } = variables;
      persistItemDrawerSaveIntent(intent);

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      const id = record?.id;
      applyCreatedItemToCache(queryClient, data, record);

      if (typeof onCreateSuccess === "function" && id != null) {
        onCreateSuccess(record ?? {});
      }

      if (intent === "keep") {
        onCreated?.(record ?? {});
        message.success(t("drawerCreateSuccess"));
        onSyncCreateDiscardBaseline?.("fromForm");
        return;
      }

      form.resetFields();
      form.setFieldsValue(defaults);
      message.success(t("drawerCreateSuccess"));
      onSyncCreateDiscardBaseline?.(intent === "new" ? "defaults" : "defaults");
      if (intent === "close") onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values, intent }) => updateItem(id, values),
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id, intent }) => {
      persistItemDrawerSaveIntent(intent);

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;

      applyUpdatedItemToCache(queryClient, id, data, record);
      message.success(t("drawerUpdateSuccess"));

      if (intent === "keep") {
        if (record) onSyncEditDiscardBaseline?.(record);
        return;
      }
      if (intent === "new") {
        onSaveAndNew?.();
        return;
      }
      onClose();
    },
  });

  return {
    createMutation,
    updateMutation,
    applyPayload,
    submitting: createMutation.isPending || updateMutation.isPending,
  };
}
