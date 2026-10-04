"use client";

import { deletePlatformLogo, uploadPlatformLogo } from "../api/platformSettings.api";
import { PLATFORM_PROFILE_QUERY_KEY } from "../queries/platformSettingsQueryKeys";
import { getAttachmentUploadErrorMessage, getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { setPlatformBrandingFromProfile } from "@/lib/platform-branding";
import { FALLBACK_PLATFORM_LOGO, platformLogoUrl } from "@/lib/platform-branding-shape";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Upload, theme } from "antd";

/** Mirrors backend `UploadPlatformLogoRequest` (2 MB, raster only). */
const MAX_LOGO_BYTES = 2048 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Platform logo uploader. The preview uses the public logo URL, which is also what the login pages,
 * sidebars, and favicon load.
 *
 * @param {{
 *   logo: { mime_type?: string, version?: number | null } | null;
 *   name: string;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   tApiErrors: (key: string) => string;
 *   readOnly?: boolean;
 *   size?: number;
 * }} props
 */
export default function PlatformLogoSection({ logo, name, t, tApiErrors, readOnly = false, size = 88 }) {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();

  const version = logo?.version ?? null;
  const logoUrl = platformLogoUrl({ has_logo: version !== null, logo_version: version });

  const applyProfile = (profile) => {
    queryClient.setQueryData(PLATFORM_PROFILE_QUERY_KEY, profile);
    setPlatformBrandingFromProfile(queryClient, profile);
  };

  const uploadMutation = useMutation({
    mutationFn: uploadPlatformLogo,
    onSuccess: (profile) => {
      applyProfile(profile);
      message.success(t("logoUploadSuccess"));
    },
    onError: (err) => {
      message.error(getAttachmentUploadErrorMessage(t, tApiErrors, err) || t("logoUploadError"));
    },
  });

  const removeMutation = useMutation({
    mutationFn: deletePlatformLogo,
    onSuccess: (profile) => {
      applyProfile(profile);
      message.success(t("logoRemoveSuccess"));
    },
    onError: (err) => {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("logoRemoveError"));
    },
  });

  const busy = uploadMutation.isPending || removeMutation.isPending;
  const uploadLabel = logoUrl ? t("logoReplace") : t("logoUpload");

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex items-center justify-center overflow-hidden rounded-xl border"
        style={{
          width: size,
          height: size,
          borderColor: token.colorBorderSecondary,
          background: token.colorFillQuaternary,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- logo is served by the central API host */}
        <img
          src={logoUrl ?? FALLBACK_PLATFORM_LOGO}
          alt={logoUrl ? name : t("logoDefault")}
          className="h-full w-full object-contain p-2"
        />
      </div>
      {readOnly ? null : (
        <div className="flex flex-wrap justify-center gap-2">
          <Upload
            accept={ACCEPTED_LOGO_TYPES.join(",")}
            showUploadList={false}
            disabled={busy}
            beforeUpload={(file) => {
              if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
                message.error(t("logoInvalidType"));
                return Upload.LIST_IGNORE;
              }
              if (file.size > MAX_LOGO_BYTES) {
                message.error(t("attachmentsFileTooLarge"));
                return Upload.LIST_IGNORE;
              }
              uploadMutation.mutate(file);
              return false;
            }}
          >
            <Button
              icon={<UploadOutlined />}
              loading={uploadMutation.isPending}
              size="small"
              aria-label={uploadLabel}
              title={uploadLabel}
            />
          </Upload>
          {logoUrl ? (
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={removeMutation.isPending}
              disabled={busy}
              size="small"
              aria-label={t("logoRemove")}
              title={t("logoRemove")}
              onClick={() => {
                modal.confirm({
                  title: t("logoRemoveConfirmTitle"),
                  content: t("logoRemoveConfirmContent"),
                  okText: t("logoRemoveConfirmOk"),
                  cancelText: t("logoRemoveConfirmCancel"),
                  okButtonProps: { danger: true },
                  onOk: () => closeConfirmOnError(removeMutation.mutateAsync()),
                });
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
