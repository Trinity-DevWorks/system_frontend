"use client";

import { useMediaPreviewBlob } from "@/components/attachments/useMediaPreviewBlob";
import { formatFileSize } from "@/components/attachments/attachmentPreviewUtils";
import dynamic from "next/dynamic";
import { Alert, Modal, Spin } from "antd";

const ImageGalleryViewer = dynamic(() => import("@/components/attachments/viewers/ImageGalleryViewer"), {
  ssr: false,
});

/**
 * In-app preview for images (lightbox gallery) and audio (modal player).
 *
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   recordId: number | null;
 *   attachment: {
 *     id: number;
 *     file_name: string;
 *     viewer_category?: string;
 *     mime_type?: string;
 *     file_size?: number;
 *   } | null;
 *   imageAttachments: { id: number; file_name: string }[];
 *   initialImageIndex: number;
 *   api: { viewBlob: (recordId: number, attachmentId: number) => Promise<Blob> };
 *   t: (key: string) => string;
 * }} props
 */
export default function AttachmentMediaPreviewModal({
  open,
  onClose,
  recordId,
  attachment,
  imageAttachments,
  initialImageIndex,
  api,
  t,
}) {
  const attachmentId = attachment?.id ?? null;
  const category = attachment?.viewer_category ?? "";

  const { blobUrl, loading, error } = useMediaPreviewBlob({
    open: open && category === "audio",
    recordId,
    attachmentId,
    viewBlob: api.viewBlob,
  });

  if (!open || !attachment || recordId == null) {
    return null;
  }

  if (category === "image" && imageAttachments.length > 0) {
    return (
      <ImageGalleryViewer
        recordId={recordId}
        images={imageAttachments}
        initialIndex={initialImageIndex}
        viewBlob={api.viewBlob}
        onClose={onClose}
      />
    );
  }

  const subtitle = [
    attachment.viewer_category,
    attachment.file_size != null ? formatFileSize(attachment.file_size) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Modal open={open} onCancel={onClose} title={attachment.file_name} width={480} destroyOnHidden footer={null}>
      {subtitle ? (
        <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert type="error" showIcon title={t("attachmentsPreviewError")} />
      ) : category === "audio" && blobUrl ? (
        <audio key={blobUrl} src={blobUrl} controls className="w-full">
          {attachment.mime_type ? <source src={blobUrl} type={attachment.mime_type} /> : null}
        </audio>
      ) : null}
    </Modal>
  );
}
