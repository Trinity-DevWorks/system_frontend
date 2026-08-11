"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { notifyPersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import {
  setUserAttachmentPrimary,
  uploadUserAttachment,
  userAvatarPreviewQueryKey,
} from "@/services/userAttachmentsApi";
import { createTenantUser, updateTenantUser } from "@/services/tenantUsersApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import {
  USER_CREATE_SAVE_INTENT_EVENT,
  USER_CREATE_SAVE_INTENT_KEY,
  sortUsersByName,
  userFormValuesToPayload,
} from "./userDrawerUtils";

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
 *   pendingAvatarFile?: File | null;
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
  pendingAvatarFile = null,
  onPendingAvatarCleared,
}) {
  const queryClient = useQueryClient();
  const pendingAvatarRef = useRef(pendingAvatarFile);
  pendingAvatarRef.current = pendingAvatarFile;

  const applyPayload = useCallback(
    (values) => userFormValuesToPayload(values, mode === "create" ? "create" : "edit"),
    [mode],
  );

  const createMutation = useMutation({
    mutationFn: async ({ payload }) => {
      const created = await createTenantUser(payload);
      const record =
        created && typeof created === "object"
          ? /** @type {Record<string, unknown>} */ (created)
          : null;
      if (!record || record.id == null) return created;

      const file = pendingAvatarRef.current;
      if (!file) return created;

      const userId = String(record.id);
      try {
        const uploaded = await uploadUserAttachment(userId, file);
        const brief = attachmentToAvatarBrief(uploaded);
        if (brief?.id) {
          if (!uploaded || typeof uploaded !== "object" || uploaded.is_primary !== true) {
            await setUserAttachmentPrimary(userId, brief.id);
          }
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
      const listKey = ["tenant", "users"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      const optimisticId = -Date.now();
      const now = new Date().toISOString();
      const optimisticRow = {
        id: optimisticId,
        ...payload,
        role: null,
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData(listKey, (old) => {
        const base = Array.isArray(old) ? old : [];
        return sortUsersByName([...base, optimisticRow]);
      });
      return { previous, optimisticId };
    },
    onError: (err, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "users"], context.previous);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, variables, context) => {
      const { intent } = variables;
      const optimisticId = context?.optimisticId;
      const listKey = ["tenant", "users"];

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
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        const withoutTemp = optimisticId != null ? old.filter((r) => r.id !== optimisticId) : old;
        if (id == null) return withoutTemp;
        return sortUsersByName([...withoutTemp.filter((r) => r.id !== id), data]);
      });
      if (id != null) {
        queryClient.setQueryData(["tenant", "users", id], data);
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
      queryClient.invalidateQueries({ queryKey: ["tenant", "users"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => updateTenantUser(id, values),
    onMutate: async ({ id, values }) => {
      const listKey = ["tenant", "users"];
      const detailKey = ["tenant", "users", id];
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousList = queryClient.getQueryData(listKey);
      const previousDetail = queryClient.getQueryData(detailKey);
      const now = new Date().toISOString();
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((row) => (row.id === id ? { ...row, ...values, updated_at: now } : row));
      });
      queryClient.setQueryData(detailKey, (old) => {
        if (!old || typeof old !== "object") {
          return { id, ...values, updated_at: now };
        }
        return { ...old, ...values, updated_at: now };
      });
      return { previousList, previousDetail, id };
    },
    onError: (err, _variables, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(["tenant", "users"], context.previousList);
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(["tenant", "users", context.id], context.previousDetail);
      }
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err));
      }
    },
    onSuccess: (data, { id }) => {
      const listKey = ["tenant", "users"];
      const detailKey = ["tenant", "users", id];
      queryClient.setQueryData(listKey, (old) => {
        if (!Array.isArray(old)) return old;
        return sortUsersByName(old.map((row) => (row.id === id ? data : row)));
      });
      queryClient.setQueryData(detailKey, data);
      message.success(t("drawerUpdateSuccess"));
      onClose();
    },
    onSettled: (_data, _error, variables) => {
      const id = variables?.id;
      queryClient.invalidateQueries({ queryKey: ["tenant", "users"] });
      if (id != null) {
        queryClient.invalidateQueries({ queryKey: ["tenant", "users", id] });
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
