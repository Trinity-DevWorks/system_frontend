"use client";

import {
  AttachmentCategoryIcon,
  attachmentCategoryAccent,
  attachmentCategoryLabel,
  attachmentCategoryTagColor,
} from "@/shared/components/attachments/attachmentListUi";
import { formatFileSize } from "@/shared/components/attachments/attachmentPreviewUtils";
import { CloseOutlined, ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import { Alert, Button, Progress, Tag, Tooltip } from "antd";

/**
 * @typedef {'pending' | 'uploading' | 'success' | 'error'} PendingUploadStatus
 */

/**
 * @param {{
 *   fileName: string;
 *   fileSize: number;
 *   category: string;
 *   previewUrl?: string;
 *   status: PendingUploadStatus;
 *   progress: number;
 *   errorMessage?: string;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   onRemove: () => void;
 *   onUpload: () => void;
 *   onRetry: () => void;
 * }} props
 */
export default function AttachmentPendingListItem({
  fileName,
  fileSize,
  category,
  previewUrl,
  status,
  progress,
  errorMessage,
  t,
  onRemove,
  onUpload,
  onRetry,
}) {
  const accent = attachmentCategoryAccent(category);
  const isUploading = status === "uploading";
  const isSuccess = status === "success";
  const isError = status === "error";
  const isPending = status === "pending";

  const statusTag = (() => {
    if (isPending) {
      return (
        <Tag variant="filled" className="!m-0 !text-xs">
          {t("attachmentsStatusPending")}
        </Tag>
      );
    }
    if (isUploading) {
      return (
        <Tag variant="filled" color="processing" className="!m-0 !text-xs">
          {t("attachmentsStatusUploading")}
        </Tag>
      );
    }
    if (isSuccess) {
      return (
        <Tag variant="filled" color="success" className="!m-0 !text-xs">
          {t("attachmentsStatusSuccess")}
        </Tag>
      );
    }
    return (
      <Tag variant="filled" color="error" className="!m-0 !text-xs">
        {t("attachmentsStatusError")}
      </Tag>
    );
  })();

  return (
    <article
      className={`rounded-lg border bg-white p-3 shadow-sm dark:bg-neutral-900 ${
        isError
          ? "border-red-300/80 dark:border-red-800/80"
          : isSuccess
            ? "border-emerald-300/80 dark:border-emerald-800/80"
            : "border-dashed border-neutral-300 dark:border-neutral-600"
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg text-lg ${accent}`}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <AttachmentCategoryIcon category={category} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-all text-sm font-medium leading-snug text-neutral-900 dark:text-neutral-100">
              {fileName}
            </p>
            {statusTag}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {category ? (
              <Tag variant="filled" color={attachmentCategoryTagColor(category)} className="!m-0 !text-xs">
                {attachmentCategoryLabel(category)}
              </Tag>
            ) : null}
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatFileSize(fileSize)}</span>
          </div>

          {isUploading ? (
            <Progress
              percent={progress}
              size="small"
              status="active"
              className="!mt-2 !mb-0 max-w-md"
              aria-label={t("attachmentsStatusUploading")}
            />
          ) : null}

          {isError && errorMessage ? (
            <Alert type="error" showIcon className="!mt-2 !rounded-md !py-1.5" title={errorMessage} />
          ) : null}
        </div>

        <div className="flex shrink-0 items-start gap-0.5 self-center">
          {isPending ? (
            <Tooltip title={t("attachmentsUpload")}>
              <Button type="primary" size="small" icon={<UploadOutlined />} onClick={onUpload}>
                {t("attachmentsUpload")}
              </Button>
            </Tooltip>
          ) : null}
          {isError ? (
            <Tooltip title={t("attachmentsRetryUpload")}>
              <Button type="primary" size="small" icon={<ReloadOutlined />} onClick={onRetry}>
                {t("attachmentsRetryUpload")}
              </Button>
            </Tooltip>
          ) : null}
          {!isUploading && !isSuccess ? (
            <Tooltip title={t("attachmentsRemovePending")}>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                aria-label={t("attachmentsRemovePending")}
                onClick={onRemove}
              />
            </Tooltip>
          ) : null}
        </div>
      </div>
    </article>
  );
}
