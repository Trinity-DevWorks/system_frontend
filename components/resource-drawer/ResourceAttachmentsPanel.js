"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { DeleteOutlined, DownloadOutlined, PaperClipOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Empty, Spin, Typography, Upload } from "antd";
import { useCallback, useMemo } from "react";

/** Matches Laravel `max:15360` (kilobytes) on `StoreAttachmentRequest`. */
const MAX_ATTACHMENT_BYTES = 15360 * 1024;

/**
 * @typedef {{
 *   fetchList: (recordId: number) => Promise<unknown[]>;
 *   upload: (recordId: number, file: File) => Promise<unknown>;
 *   remove: (recordId: number, attachmentId: number) => Promise<unknown>;
 *   downloadBlob: (recordId: number, attachmentId: number) => Promise<Blob>;
 * }} ResourceAttachmentsApi
 */

/**
 * Polymorphic attachments UI for tenant resource drawers (customers, suppliers, salesmen, …).
 *
 * @param {{
 *   open: boolean;
 *   recordId: number | null;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   queryKey: readonly unknown[];
 *   api: ResourceAttachmentsApi;
 * }} props
 */
export default function ResourceAttachmentsPanel({ open, recordId, readOnly, t, tApiErrors, queryKey, api }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const enabled = Boolean(open && recordId != null && Number(recordId) > 0);

  const attachmentsQuery = useQuery({
    queryKey,
    queryFn: () => api.fetchList(/** @type {number} */ (recordId)),
    enabled,
    staleTime: 30_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const uploadMutation = useMutation({
    mutationFn: (/** @type {File} */ file) => api.upload(/** @type {number} */ (recordId), file),
    onSuccess: () => {
      invalidate();
      message.success(t("attachmentsUploadSuccess"));
    },
    onError: (err) => {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("attachmentsUploadError"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }) => api.remove(/** @type {number} */ (recordId), id),
    onSuccess: () => {
      invalidate();
      message.success(t("attachmentsDeleteSuccess"));
    },
    onError: (err) => {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("attachmentsDeleteError"));
    },
  });

  const rows = useMemo(() => {
    const d = attachmentsQuery.data;
    return Array.isArray(d) ? d : [];
  }, [attachmentsQuery.data]);

  const handleDownload = useCallback(
    async (/** @type {{ id: number; file_name: string }} */ row) => {
      try {
        const blob = await api.downloadBlob(/** @type {number} */ (recordId), row.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = row.file_name;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("attachmentsDownloadError"));
      }
    },
    [api, message, recordId, t, tApiErrors],
  );

  const handleDelete = useCallback(
    (/** @type {{ id: number; file_name: string }} */ row) => {
      modal.confirm({
        title: t("attachmentsDeleteConfirmTitle"),
        content: row.file_name,
        okText: t("attachmentsDeleteConfirmOk"),
        cancelText: t("drawerCancel"),
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await deleteMutation.mutateAsync({ id: row.id });
          } catch {
            /* mutation onError */
          }
        },
      });
    },
    [deleteMutation, modal, t],
  );

  if (!enabled) {
    return (
      <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
        <Typography.Title level={5} className="!mb-2 !mt-0">
          {t("attachmentsTitle")}
        </Typography.Title>
        <Alert type="info" showIcon title={t("attachmentsHintCreate")} />
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Typography.Title level={5} className="!mb-0 !mt-0">
          {t("attachmentsTitle")}
        </Typography.Title>
        {!readOnly && (
          <Upload
            showUploadList={false}
            disabled={uploadMutation.isPending}
            beforeUpload={(file) => {
              if (file.size > MAX_ATTACHMENT_BYTES) {
                message.error(t("attachmentsFileTooLarge"));
                return Upload.LIST_IGNORE;
              }
              return true;
            }}
            customRequest={async ({ file, onError, onSuccess }) => {
              try {
                await uploadMutation.mutateAsync(/** @type {File} */ (file));
                onSuccess?.(null);
              } catch (e) {
                onError?.(e);
              }
            }}
          >
            <Button type="default" icon={<PaperClipOutlined />} loading={uploadMutation.isPending}>
              {t("attachmentsUpload")}
            </Button>
          </Upload>
        )}
      </div>

      {attachmentsQuery.isPending ? (
        <div className="flex justify-center py-6">
          <Spin />
        </div>
      ) : attachmentsQuery.isError ? (
        <Alert type="error" showIcon title={t("attachmentsLoadError")} />
      ) : rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("attachmentsEmpty")} />
      ) : (
        <ul className="m-0 list-none p-0">
          {rows.map((item) => {
            const row = /** @type {{ id: number; file_name: string; file_type?: string }} */ (item);
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-neutral-200 py-2 last:border-b-0 dark:border-neutral-700"
              >
                <div className="min-w-0 flex-1">
                  <div className="break-all text-sm font-medium text-neutral-900 dark:text-neutral-100">{row.file_name}</div>
                  {row.file_type ? (
                    <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{row.file_type}</div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(row)}>
                    {t("attachmentsDownload")}
                  </Button>
                  {!readOnly && (
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(row)}
                    >
                      {t("attachmentsDelete")}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
