"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import { companyLogoPreviewQueryKey, COMPANY_PROFILE_LOGO_PREVIEW_QUERY_KEY } from "../queries/companyProfile";
import {
  deleteCompanyProfileAttachment,
  uploadCompanyProfileAttachment,
  viewCompanyProfileAttachmentBlob,
} from "../api/companyProfileAttachments.api";
import {
  getAttachmentUploadErrorMessage,
  getLocalizedApiErrorMessage,
} from "@/lib/api-error-notify";
import { useBlobObjectUrl } from "@/lib/use-blob-object-url";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Spin, Upload, theme } from "antd";

const MAX_ATTACHMENT_BYTES = 15360 * 1024;

/**
 * Company logo uploader for the singleton company profile.
 *
 * @param {{
 *   logo: { id: string, file_name: string, mime_type: string } | null;
 *   profileQueryKey: unknown[];
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   tApiErrors: (key: string) => string;
 *   readOnly?: boolean;
 * }} props
 */
export default function CompanyProfileLogoSection({
  logo,
  profileQueryKey,
  t,
  tApiErrors,
  readOnly = false,
}) {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();

  const logoId = logo?.id ?? null;

  const previewQuery = useQuery({
    queryKey: companyLogoPreviewQueryKey(logoId),
    queryFn: () => viewCompanyProfileAttachmentBlob(/** @type {string} */ (logoId)),
    enabled: Boolean(logoId),
    staleTime: QUERY_STALE_TIME.infinite,
    refetchOnWindowFocus: false,
  });

  const objectUrl = useBlobObjectUrl(previewQuery.data);

  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: profileQueryKey });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const uploaded = await uploadCompanyProfileAttachment(file);
      const id =
        uploaded && typeof uploaded === "object" && "id" in uploaded
          ? String(/** @type {{ id: unknown }} */ (uploaded).id)
          : null;
      if (id) {
        queryClient.setQueryData(companyLogoPreviewQueryKey(id), file);
      }
      return uploaded;
    },
    onSuccess: async () => {
      message.success(t("logoUploadSuccess"));
      await invalidateProfile();
      if (logoId) {
        queryClient.removeQueries({
          queryKey: companyLogoPreviewQueryKey(logoId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: COMPANY_PROFILE_LOGO_PREVIEW_QUERY_KEY,
      });
    },
    onError: (err) => {
      message.error(
        getAttachmentUploadErrorMessage(t, tApiErrors, err) ||
          t("logoUploadError"),
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: () =>
      deleteCompanyProfileAttachment(/** @type {string} */ (logoId)),
    onSuccess: async () => {
      message.success(t("logoRemoveSuccess"));
      await invalidateProfile();
      queryClient.removeQueries({
        queryKey: companyLogoPreviewQueryKey(logoId),
      });
    },
    onError: (err) => {
      message.error(
        getLocalizedApiErrorMessage(tApiErrors, err) || t("logoRemoveError"),
      );
    },
  });

  const busy = uploadMutation.isPending || removeMutation.isPending;

  return (
    <section className="mb-6 max-w-2xl">
      <div
        className="mb-2 text-sm font-medium"
        style={{ color: token.colorText }}
      >
        {t("logoTitle")}
      </div>
      <p className="mb-3 text-sm" style={{ color: token.colorTextSecondary }}>
        {t("logoHint")}
      </p>
      <div className="flex flex-wrap items-start gap-4">
        <div
          className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border"
          style={{
            borderColor: token.colorBorderSecondary,
            background: token.colorFillQuaternary,
          }}
        >
          {logoId && previewQuery.isPending ? (
            <Spin size="small" />
          ) : objectUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob preview URL
            <img
              src={objectUrl}
              alt={logo?.file_name || t("logoTitle")}
              className="h-full w-full object-contain"
            />
          ) : (
            <span
              className="px-2 text-center text-xs"
              style={{ color: token.colorTextDescription }}
            >
              {t("logoEmpty")}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {readOnly ? null : (
            <>
              <Upload
                accept="image/*"
                showUploadList={false}
                disabled={busy}
                beforeUpload={(file) => {
                  if (file.size > MAX_ATTACHMENT_BYTES) {
                    message.error(t("logoFileTooLarge"));
                    return Upload.LIST_IGNORE;
                  }
                  uploadMutation.mutate(file);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />} loading={uploadMutation.isPending}>
                  {logoId ? t("logoReplace") : t("logoUpload")}
                </Button>
              </Upload>
              {logoId ? (
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  loading={removeMutation.isPending}
                  disabled={busy}
                  className="justify-start"
                  onClick={() => {
                    modal.confirm({
                      title: t("logoRemoveConfirmTitle"),
                      okText: t("logoRemoveConfirmOk"),
                      cancelText: t("logoRemoveConfirmCancel"),
                      okButtonProps: { danger: true },
                      onOk: () => removeMutation.mutateAsync(),
                    });
                  }}
                >
                  {t("logoRemove")}
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
