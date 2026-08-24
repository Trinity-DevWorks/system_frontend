"use client";

import {
  AttachmentCategoryIcon,
  attachmentCategoryAccent,
  attachmentCategoryLabel,
  attachmentCategoryTagColor,
  attachmentProcessingLabel,
  attachmentProcessingStatus,
  attachmentProcessingTagColor,
  isAttachmentDownloadable,
} from "@/shared/components/attachments/attachmentListUi";
import { formatFileSize } from "@/shared/components/attachments/attachmentPreviewUtils";
import { DeleteOutlined, DownloadOutlined, EyeOutlined, StarFilled, StarOutlined } from "@ant-design/icons";
import { Button, Tag, Tooltip } from "antd";

/**
 * @param {{
 *   row: {
 *     id: string;
 *     file_name: string;
 *     viewer_category?: string;
 *     file_size?: number;
 *     is_primary?: boolean;
 *     processing_status?: string;
 *   };
 *   readOnly: boolean;
 *   previewLoading: boolean;
 *   enablePrimaryImage?: boolean;
 *   setPrimaryLoading?: boolean;
 *   t: (key: string) => string;
 *   onPreview: () => void;
 *   onDownload: () => void;
 *   onDelete: () => void;
 *   onSetPrimary?: () => void;
 * }} props
 */
export default function AttachmentListItem({
  row,
  readOnly,
  previewLoading,
  enablePrimaryImage = false,
  setPrimaryLoading = false,
  t,
  onPreview,
  onDownload,
  onDelete,
  onSetPrimary,
}) {
  const accent = attachmentCategoryAccent(row.viewer_category);
  const isImage = row.viewer_category === "image";
  const showPrimaryControls = enablePrimaryImage && isImage;
  const isPrimary = Boolean(row.is_primary);
  const processingStatus = attachmentProcessingStatus(row);
  const canOpen = isAttachmentDownloadable(row);
  const blockedHint =
    processingStatus === "rejected" ? t("attachmentsRejectedHint") : t("attachmentsNotReady");

  return (
    <article
      className={`group flex gap-3 rounded-lg border bg-white p-3 shadow-sm transition hover:shadow dark:bg-neutral-900 ${
        isPrimary
          ? "border-amber-400/80 ring-1 ring-amber-400/40 dark:border-amber-500/60"
          : processingStatus === "rejected"
            ? "border-red-300/80 dark:border-red-700/60"
            : processingStatus === "pending"
              ? "border-sky-300/70 dark:border-sky-700/50"
              : "border-neutral-200/80 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg ${accent}`}
        aria-hidden
      >
        <AttachmentCategoryIcon category={row.viewer_category} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-all text-sm font-medium leading-snug text-neutral-900 dark:text-neutral-100">{row.file_name}</p>
          {isPrimary ? (
            <Tag color="gold" className="!m-0 !text-xs">
              {t("attachmentsPrimary")}
            </Tag>
          ) : null}
          <Tag color={attachmentProcessingTagColor(processingStatus)} className="!m-0 !text-xs">
            {attachmentProcessingLabel(processingStatus, t)}
          </Tag>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {row.viewer_category ? (
            <Tag variant="filled" color={attachmentCategoryTagColor(row.viewer_category)} className="!m-0 !text-xs">
              {attachmentCategoryLabel(row.viewer_category)}
            </Tag>
          ) : null}
          {row.file_size != null ? (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatFileSize(row.file_size)}</span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 self-center opacity-90 sm:opacity-70 sm:group-hover:opacity-100">
        {showPrimaryControls && !readOnly ? (
          <Tooltip title={canOpen ? (isPrimary ? t("attachmentsPrimary") : t("attachmentsSetPrimary")) : blockedHint}>
            <Button
              type="text"
              size="small"
              icon={isPrimary ? <StarFilled className="!text-amber-500" /> : <StarOutlined />}
              loading={setPrimaryLoading}
              disabled={isPrimary || !canOpen}
              aria-label={t("attachmentsSetPrimary")}
              onClick={onSetPrimary}
            />
          </Tooltip>
        ) : null}
        <Tooltip title={canOpen ? t("attachmentsPreview") : blockedHint}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            loading={previewLoading}
            disabled={!canOpen}
            aria-label={t("attachmentsPreview")}
            onClick={onPreview}
          />
        </Tooltip>
        <Tooltip title={canOpen ? t("attachmentsDownload") : blockedHint}>
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            disabled={!canOpen}
            aria-label={t("attachmentsDownload")}
            onClick={onDownload}
          />
        </Tooltip>
        {!readOnly ? (
          <Tooltip title={t("attachmentsDelete")}>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={t("attachmentsDelete")}
              onClick={onDelete}
            />
          </Tooltip>
        ) : null}
      </div>
    </article>
  );
}
