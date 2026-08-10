"use client";

import {
  deleteUserAttachment,
  setUserAttachmentPrimary,
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
 * @param {{
 *   userId: string | null | undefined;
 *   avatar: { id: string, file_name?: string, mime_type?: string } | null | undefined;
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
  const canMutate = Boolean(userId) && !readOnly;

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

  const objectUrl = useBlobObjectUrl(previewQuery.data);

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
      if (id && id !== avatarId) {
        await setUserAttachmentPrimary(/** @type {string} */ (userId), id);
      }
      return uploaded;
    },
    onSuccess: async () => {
      message.success(t("avatarUploadSuccess"));
      await invalidateRelated();
      queryClient.invalidateQueries({ queryKey: ["user-avatar-preview"] });
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

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium" style={{ color: token.colorText }}>
        {t("avatarTitle")}
      </div>
      <div className="text-xs" style={{ color: token.colorTextSecondary }}>
        {t("avatarHint")}
      </div>
        <div className="flex flex-wrap items-center gap-3">
          {avatarId && previewQuery.isPending && !objectUrl ? (
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
                uploadMutation.mutate(file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />} loading={uploadMutation.isPending}>
                {avatarId ? t("avatarReplace") : t("avatarUpload")}
              </Button>
            </Upload>
            {avatarId ? (
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={removeMutation.isPending}
                onClick={() => {
                  modal.confirm({
                    title: t("avatarRemoveConfirmTitle"),
                    okText: t("avatarRemoveConfirmOk"),
                    cancelText: t("avatarRemoveConfirmCancel"),
                    onOk: () => removeMutation.mutate(),
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
