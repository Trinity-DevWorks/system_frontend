"use client";

import {
  deleteUserAttachment,
  uploadUserAttachment,
  userAvatarPreviewQueryKey,
  viewUserAttachmentBlob,
} from "@/services/userAttachmentsApi";
import {
  getAttachmentUploadErrorMessage,
  getLocalizedApiErrorMessage,
} from "@/lib/api-error-notify";
import { useBlobObjectUrl } from "@/lib/use-blob-object-url";
import { DeleteOutlined, UploadOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Avatar, Button, Spin, Upload, theme } from "antd";

const MAX_ATTACHMENT_BYTES = 15360 * 1024;

/**
 * Avatar upload/preview for a user (self profile or admin user drawer).
 *
 * Create mode (no `userId`): stages a local `pendingFile` until the parent saves the user.
 * Edit/profile mode: uploads immediately via the attachments API.
 * Backend replaces any previous avatar on store (single-image slot).
 *
 * @param {{
 *   userId: string | null | undefined;
 *   avatar: { id: string, file_name?: string, mime_type?: string } | null | undefined;
 *   pendingFile?: File | null;
 *   onPendingFileChange?: (file: File | null) => void;
 *   invalidateQueryKeys?: unknown[][];
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   tApiErrors: (key: string) => string;
 *   readOnly?: boolean;
 *   size?: number;
 * }} props
 */
export default function UserAvatarSection({
  userId,
  avatar,
  pendingFile = null,
  onPendingFileChange,
  invalidateQueryKeys = [],
  t,
  tApiErrors,
  readOnly = false,
  size = 96,
}) {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();

  const avatarId = avatar?.id ? String(avatar.id) : null;
  const staging = !userId && typeof onPendingFileChange === "function";
  const canMutate = !readOnly && (staging || Boolean(userId));

  const previewQuery = useQuery({
    queryKey: userAvatarPreviewQueryKey(avatarId),
    queryFn: () =>
      viewUserAttachmentBlob(
        /** @type {string} */ (userId),
        /** @type {string} */ (avatarId),
      ),
    enabled: Boolean(userId && avatarId),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });

  const remoteObjectUrl = useBlobObjectUrl(previewQuery.data);
  const pendingObjectUrl = useBlobObjectUrl(staging ? pendingFile : null);
  const objectUrl = pendingObjectUrl || remoteObjectUrl;

  const invalidateRelated = async () => {
    for (const key of invalidateQueryKeys) {
      await queryClient.invalidateQueries({ queryKey: key });
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const uploaded = await uploadUserAttachment(
        /** @type {string} */ (userId),
        file,
      );
      const id =
        uploaded && typeof uploaded === "object" && "id" in uploaded
          ? String(/** @type {{ id: unknown }} */ (uploaded).id)
          : null;
      if (id) {
        queryClient.setQueryData(userAvatarPreviewQueryKey(id), file);
      }
      return uploaded;
    },
    onSuccess: async (uploaded) => {
      message.success(t("avatarUploadSuccess"));
      const brief =
        uploaded && typeof uploaded === "object" && "id" in uploaded
          ? {
              id: String(/** @type {{ id: unknown }} */ (uploaded).id),
              file_name:
                typeof /** @type {{ file_name?: unknown }} */ (uploaded).file_name ===
                "string"
                  ? /** @type {{ file_name: string }} */ (uploaded).file_name
                  : undefined,
              mime_type:
                typeof /** @type {{ mime_type?: unknown }} */ (uploaded).mime_type ===
                "string"
                  ? /** @type {{ mime_type: string }} */ (uploaded).mime_type
                  : undefined,
            }
          : null;

      if (userId && brief?.id) {
        queryClient.setQueryData(["tenant", "users", userId], (old) => {
          if (!old || typeof old !== "object") return old;
          return { ...old, avatar: brief };
        });
        queryClient.setQueryData(["tenant", "users"], (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((row) =>
            row && typeof row === "object" && String(row.id) === String(userId)
              ? { ...row, avatar: brief }
              : row,
          );
        });
        queryClient.setQueryData(["tenant", "auth-me"], (old) => {
          if (!old || typeof old !== "object") return old;
          if (String(/** @type {{ id?: unknown }} */ (old).id) !== String(userId)) {
            return old;
          }
          return { ...old, avatar: brief };
        });
      }

      await invalidateRelated();
      if (avatarId && avatarId !== brief?.id) {
        queryClient.removeQueries({
          queryKey: userAvatarPreviewQueryKey(avatarId),
        });
      }
    },
    onError: (err) => {
      message.error(
        getAttachmentUploadErrorMessage(t, tApiErrors, err) ||
          t("avatarUploadError"),
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: () =>
      deleteUserAttachment(
        /** @type {string} */ (userId),
        /** @type {string} */ (avatarId),
      ),
    onSuccess: async () => {
      message.success(t("avatarRemoveSuccess"));
      if (userId) {
        queryClient.setQueryData(["tenant", "users", userId], (old) => {
          if (!old || typeof old !== "object") return old;
          return { ...old, avatar: null };
        });
        queryClient.setQueryData(["tenant", "users"], (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((row) =>
            row && typeof row === "object" && String(row.id) === String(userId)
              ? { ...row, avatar: null }
              : row,
          );
        });
        queryClient.setQueryData(["tenant", "auth-me"], (old) => {
          if (!old || typeof old !== "object") return old;
          if (String(/** @type {{ id?: unknown }} */ (old).id) !== String(userId)) {
            return old;
          }
          return { ...old, avatar: null };
        });
      }
      await invalidateRelated();
      queryClient.removeQueries({
        queryKey: userAvatarPreviewQueryKey(avatarId),
      });
    },
    onError: (err) => {
      message.error(
        getLocalizedApiErrorMessage(tApiErrors, err) || t("avatarRemoveError"),
      );
    },
  });

  const busy = uploadMutation.isPending || removeMutation.isPending;
  const showPendingSpinner =
    Boolean(avatarId) && previewQuery.isPending && !objectUrl && !pendingObjectUrl;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium" style={{ color: token.colorText }}>
        {t("avatarTitle")}
      </div>
      <div className="text-xs" style={{ color: token.colorTextSecondary }}>
        {t("avatarHint")}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {showPendingSpinner ? (
          <span
            className="inline-flex items-center justify-center"
            style={{ width: size, height: size }}
          >
            <Spin size="small" />
          </span>
        ) : objectUrl ? (
          <Avatar size={size} src={objectUrl} alt={avatar?.file_name || t("avatarTitle")} />
        ) : (
          <Avatar size={size} icon={<UserOutlined />} />
        )}
        {canMutate ? (
          <div className="flex flex-wrap gap-2">
            <Upload
              accept="image/*"
              showUploadList={false}
              disabled={busy}
              beforeUpload={(file) => {
                if (file.size > MAX_ATTACHMENT_BYTES) {
                  message.error(t("avatarFileTooLarge"));
                  return Upload.LIST_IGNORE;
                }
                if (staging) {
                  onPendingFileChange(file);
                  return false;
                }
                uploadMutation.mutate(file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />} loading={uploadMutation.isPending}>
                {staging
                  ? pendingFile
                    ? t("avatarReplace")
                    : t("avatarUpload")
                  : avatarId
                    ? t("avatarReplace")
                    : t("avatarUpload")}
              </Button>
            </Upload>
            {(staging && pendingFile) || (!staging && avatarId) ? (
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={removeMutation.isPending}
                onClick={() => {
                  if (staging) {
                    onPendingFileChange(null);
                    return;
                  }
                  modal.confirm({
                    title: t("avatarRemoveConfirmTitle"),
                    okText: t("avatarRemoveConfirmOk"),
                    cancelText: t("avatarRemoveConfirmCancel"),
                    onOk: () => removeMutation.mutateAsync(),
                  });
                }}
              >
                {t("avatarRemove")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
