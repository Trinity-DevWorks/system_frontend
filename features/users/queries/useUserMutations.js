"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import {
  uploadUserAttachment,
  userAvatarPreviewQueryKey,
} from "../api/userAttachments.api";
import { createTenantUser, updateTenantUser } from "../api/tenantUsers.api";
import {
  patchTenantListCache,
  snapshotTenantListCache,
  restoreTenantListCache,
} from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  USER_CREATE_SAVE_INTENT_EVENT,
  USER_CREATE_SAVE_INTENT_KEY,
  sortUsersByName,
  userFormValuesToPayload,
} from "../utils/userDrawerUtils";
import { USERS_LIST_QUERY_KEY, userDetailQueryKey } from "./tenantUsersQueryKeys";

/**
 * @param {unknown} uploaded
 * @returns {{ id: string, file_name?: string, mime_type?: string } | null}
 */
function attachmentToAvatarBrief(uploaded) {
  if (!uploaded || typeof uploaded !== "object" || !("id" in uploaded)) return null;
  const row = /** @type {{ id: unknown, file_name?: unknown, mime_type?: unknown }} */ (uploaded);
  if (row.id == null || row.id === "") return null;
  return {
    id: String(row.id),
    file_name: typeof row.file_name === "string" ? row.file_name : undefined,
    mime_type: typeof row.mime_type === "string" ? row.mime_type : undefined,
  };
}

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   mode: "create" | "edit" | "view";
 *   message: import("antd").MessageInstance;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   onSyncCreateDiscardBaseline?: (kind: "fromForm" | "defaults") => void;
 *   defaults: Record<string, unknown>;
 *   onPendingAvatarCleared?: () => void;
 * }} args
 */
export function useUserDrawerMutations({
  form,
  mode,
  message,
  t,
  tApiErrors,
  onClose,
  onCreated,
  onSyncCreateDiscardBaseline,
  defaults,
  onPendingAvatarCleared,
}) {
  const queryClient = useQueryClient();

  const applyPayload = useCallback(
    (values) => userFormValuesToPayload(values, mode === "create" ? "create" : "edit"),
    [mode],
  );

  const createMutation = useMutation({
    mutationFn: async ({ payload, pendingAvatarFile }) => {
      const created = await createTenantUser(payload);
      const record =
        created && typeof created === "object"
          ? /** @type {Record<string, unknown>} */ (created)
          : null;
      if (!record || record.id == null) return created;

      const file = pendingAvatarFile;
      if (!file) return created;

      const userId = String(record.id);
      try {
        const uploaded = await uploadUserAttachment(userId, file);
        const brief = attachmentToAvatarBrief(uploaded);
        if (brief?.id) {
          queryClient.setQueryData(userAvatarPreviewQueryKey(brief.id), file);
          return { ...record, avatar: brief };
        }
      } catch (err) {
        message.warning(
          getLocalizedApiErrorMessage(tApiErrors, err) || t("avatarUploadError"),
        );
      }
      return created;
    },
    onMutate: async ({ payload }) => {
      const listKey = USERS_LIST_QUERY_KEY;
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = snapshotTenantListCache(queryClient, listKey);
      const optimisticId = -Date.now();
      const now = new Date().toISOString();
      const optimisticRow = {
        id: optimisticId,
        ...payload,
        role: null,
        created_at: now,
        updated_at: now,
      };
      patchTenantListCache(queryClient, listKey, (rows) => sortUsersByName([...rows, optimisticRow]));
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
      const listKey = USERS_LIST_QUERY_KEY;

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(USER_CREATE_SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(USER_CREATE_SAVE_INTENT_EVENT);
      }

      const record = data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
      const id = record?.id;
      patchTenantListCache(queryClient, listKey, (rows) => {
        const withoutTemp = optimisticId != null ? rows.filter((r) => r.id !== optimisticId) : rows;
        if (id == null) return withoutTemp;
        return sortUsersByName([...withoutTemp.filter((r) => r.id !== id), data]);
      });
      if (id != null) {
        queryClient.setQueryData(userDetailQueryKey(id), data);
      }

      onPendingAvatarCleared?.();

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
      queryClient.invalidateQueries({ queryKey: USERS_LIST_QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateTenantUser(id, values),
    onMutate: async ({ id, values }) => {
      const listKey = USERS_LIST_QUERY_KEY;
      const detailKey = userDetailQueryKey(id);
      await queryClient.cancelQueries({ queryKey: listKey });
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
        queryClient.setQueryData(userDetailQueryKey(context.id), context.previousDetail);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id }) => {
      const listKey = USERS_LIST_QUERY_KEY;
      const detailKey = userDetailQueryKey(id);
      patchTenantListCache(queryClient, listKey, (rows) => sortUsersByName(rows.map((row) => (row.id === id ? data : row))));
      queryClient.setQueryData(detailKey, data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      const id = variables?.id;
      queryClient.invalidateQueries({ queryKey: USERS_LIST_QUERY_KEY });
      if (id != null) {
        queryClient.invalidateQueries({ queryKey: userDetailQueryKey(id) });
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
