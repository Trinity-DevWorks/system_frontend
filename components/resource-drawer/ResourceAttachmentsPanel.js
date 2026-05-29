"use client";

import AttachmentListItem from "@/components/attachments/AttachmentListItem";
import AttachmentMediaPreviewModal from "@/components/attachments/AttachmentMediaPreviewModal";
import AttachmentPendingListItem from "@/components/attachments/AttachmentPendingListItem";
import {
  appendAttachmentToList,
  isAttachmentRow,
  removeAttachmentFromList,
} from "@/components/attachments/attachmentQueryCache";
import { formatFileSize, usesCustomMediaPreview } from "@/components/attachments/attachmentPreviewUtils";
import { invalidateMediaPreviewCacheForRecord } from "@/components/attachments/mediaPreviewCache";
import { usePendingAttachments } from "@/components/attachments/usePendingAttachments";
import {
  attachmentToPrimaryImageBrief,
  derivePrimaryImageFromAttachments,
  invalidateItemAttachmentThumb,
  ITEMS_LIST_QUERY_KEY,
  patchItemPrimaryImageInCache,
} from "@/components/items/itemsQueryCache";
import ResourceDrawerPanelHeader from "@/components/resource-drawer/ResourceDrawerPanelHeader";
import { getAttachmentUploadErrorMessage, getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { InboxOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Badge, Button, Empty, Spin, Upload } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

/** Matches Laravel `max:15360` (kilobytes) on `StoreAttachmentRequest`. */
const MAX_ATTACHMENT_BYTES = 15360 * 1024;
const MAX_ATTACHMENT_LABEL = "15 MB";

/**
 * @typedef {{
 *   fetchList: (recordId: number) => Promise<unknown[]>;
 *   upload: (recordId: number, file: File, config?: import('axios').AxiosRequestConfig) => Promise<unknown>;
 *   remove: (recordId: number, attachmentId: number) => Promise<unknown>;
 *   downloadBlob: (recordId: number, attachmentId: number) => Promise<Blob>;
 *   viewBlob: (recordId: number, attachmentId: number) => Promise<Blob>;
 *   openViewInNewTab: (recordId: number, attachmentId: number, mimeType?: string) => Promise<void>;
 *   setPrimary?: (recordId: number, attachmentId: number) => Promise<unknown>;
 * }} ResourceAttachmentsApi
 */

/**
 * @typedef {{
 *   id: number;
 *   file_name: string;
 *   viewer_category?: string;
 *   mime_type?: string;
 *   file_size?: number;
 *   can_preview?: boolean;
 * }} AttachmentRow
 */

/**
 * @param {File} file
 * @param {(key: string) => string} t
 * @param {ReturnType<typeof App.useApp>["message"]} message
 */
function validateUploadFile(file, t, message) {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    message.error(t("attachmentsFileTooLarge"));
    return Upload.LIST_IGNORE;
  }
  return true;
}

/**
 * Polymorphic attachments UI for tenant resource drawers (customers, suppliers, salesmen, …).
 */
export default function ResourceAttachmentsPanel({
  open,
  recordId,
  readOnly,
  t,
  tApiErrors,
  queryKey,
  api,
  embedded = false,
  enablePrimaryImage = false,
}) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [previewingId, setPreviewingId] = useState(/** @type {number | null} */ (null));
  const [mediaPreviewRow, setMediaPreviewRow] = useState(/** @type {AttachmentRow | null} */ (null));
  const [settingPrimaryId, setSettingPrimaryId] = useState(/** @type {number | null} */ (null));
  const [uploadAllLoading, setUploadAllLoading] = useState(false);
  const pending = usePendingAttachments();

  const enabled = Boolean(open && recordId != null && Number(recordId) > 0);

  const { items: pendingItems, pendingCount, isUploading, addFiles, remove: removePending, patch: patchPending, clearAll: clearPending } =
    pending;

  useEffect(() => {
    if (!open) clearPending();
  }, [open, clearPending]);

  useEffect(() => {
    clearPending();
  }, [recordId, clearPending]);

  const attachmentsQuery = useQuery({
    queryKey,
    queryFn: () => api.fetchList(/** @type {number} */ (recordId)),
    enabled,
    staleTime: 30_000,
  });

  const patchAttachmentsCache = useCallback(
    (/** @param {(list: unknown[]) => unknown[]} */ updater) => {
      queryClient.setQueryData(queryKey, (old) => {
        const list = Array.isArray(old) ? old : [];
        return updater(list);
      });
    },
    [queryClient, queryKey],
  );

  const syncItemPrimaryImageFromAttachments = useCallback(() => {
    if (!enablePrimaryImage || recordId == null) return;
    const list = queryClient.getQueryData(queryKey);
    const attachments = Array.isArray(list) ? list : [];
    patchItemPrimaryImageInCache(
      queryClient,
      /** @type {number} */ (recordId),
      derivePrimaryImageFromAttachments(attachments),
    );
  }, [enablePrimaryImage, queryClient, queryKey, recordId]);

  /** Preview cache + item thumbnail updates (attachment list already patched in cache). */
  const syncRelatedQueries = useCallback(
    (/** @type {{ thumbAttachmentIds?: number[] }} */ options = {}) => {
      if (recordId != null) {
        invalidateMediaPreviewCacheForRecord(recordId);
      }
      if (enablePrimaryImage && recordId != null) {
        syncItemPrimaryImageFromAttachments();
        for (const attachmentId of options.thumbAttachmentIds ?? []) {
          invalidateItemAttachmentThumb(queryClient, /** @type {number} */ (recordId), attachmentId);
        }
      }
    },
    [enablePrimaryImage, queryClient, recordId, syncItemPrimaryImageFromAttachments],
  );

  const deleteMutation = useMutation({
    mutationFn: ({ id }) => api.remove(/** @type {number} */ (recordId), id),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousAttachments = queryClient.getQueryData(queryKey);
      const previousItems = enablePrimaryImage ? queryClient.getQueryData(ITEMS_LIST_QUERY_KEY) : undefined;
      const base = Array.isArray(previousAttachments) ? previousAttachments : [];
      const nextList = removeAttachmentFromList(base, id);
      patchAttachmentsCache(() => nextList);
      if (enablePrimaryImage && recordId != null) {
        patchItemPrimaryImageInCache(
          queryClient,
          /** @type {number} */ (recordId),
          derivePrimaryImageFromAttachments(nextList),
        );
      }
      return { previousAttachments, previousItems };
    },
    onSuccess: (_data, { id }) => {
      syncRelatedQueries({ thumbAttachmentIds: [id] });
      message.success(t("attachmentsDeleteSuccess"));
    },
    onError: (err, _vars, context) => {
      if (context?.previousAttachments !== undefined) {
        queryClient.setQueryData(queryKey, context.previousAttachments);
      }
      if (context?.previousItems !== undefined) {
        queryClient.setQueryData(ITEMS_LIST_QUERY_KEY, context.previousItems);
      }
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("attachmentsDeleteError"));
    },
  });

  const rows = useMemo(() => {
    const d = attachmentsQuery.data;
    return Array.isArray(d) ? /** @type {AttachmentRow[]} */ (d) : [];
  }, [attachmentsQuery.data]);

  const imageAttachments = useMemo(
    () => rows.filter((row) => row.viewer_category === "image"),
    [rows],
  );

  const initialImageIndex = useMemo(() => {
    if (!mediaPreviewRow || mediaPreviewRow.viewer_category !== "image") return 0;
    const idx = imageAttachments.findIndex((img) => img.id === mediaPreviewRow.id);
    return idx >= 0 ? idx : 0;
  }, [imageAttachments, mediaPreviewRow]);

  const totalBytes = useMemo(
    () => rows.reduce((sum, row) => sum + (row.file_size ?? 0), 0),
    [rows],
  );

  const handleDownload = useCallback(
    async (/** @type {AttachmentRow} */ row) => {
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

  const handlePreview = useCallback(
    async (/** @type {AttachmentRow} */ row) => {
      if (usesCustomMediaPreview(row)) {
        setMediaPreviewRow(row);
        return;
      }

      setPreviewingId(row.id);
      try {
        await api.openViewInNewTab(/** @type {number} */ (recordId), row.id, row.mime_type);
      } catch (err) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("attachmentsPreviewError"));
      } finally {
        setPreviewingId(null);
      }
    },
    [api, message, recordId, t, tApiErrors],
  );

  const handleSetPrimary = useCallback(
    async (/** @type {AttachmentRow} */ row) => {
      if (!api.setPrimary) return;
      setSettingPrimaryId(row.id);
      try {
        await api.setPrimary(/** @type {number} */ (recordId), row.id);
        patchAttachmentsCache((list) =>
          list.map((item) => {
            if (!item || typeof item !== "object") return item;
            const rowItem = /** @type {AttachmentRow} */ (item);
            return { ...rowItem, is_primary: rowItem.id === row.id };
          }),
        );
        if (enablePrimaryImage && recordId != null) {
          patchItemPrimaryImageInCache(
            queryClient,
            /** @type {number} */ (recordId),
            attachmentToPrimaryImageBrief({ ...row, is_primary: true }),
          );
        }
        syncRelatedQueries({ thumbAttachmentIds: [row.id] });
        message.success(t("attachmentsSetPrimarySuccess"));
      } catch (err) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("attachmentsUploadError"));
      } finally {
        setSettingPrimaryId(null);
      }
    },
    [api, enablePrimaryImage, message, patchAttachmentsCache, queryClient, recordId, syncRelatedQueries, t, tApiErrors],
  );

  const handleDelete = useCallback(
    (/** @type {AttachmentRow} */ row) => {
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

  const uploadPendingFile = useCallback(
    async (/** @type {string} */ pendingId) => {
      const entry = pendingItems.find((i) => i.id === pendingId);
      if (!entry || entry.status === "uploading") return;

      patchPending(pendingId, { status: "uploading", progress: 0, errorMessage: undefined });

      try {
        const created = await api.upload(/** @type {number} */ (recordId), entry.file, {
          onUploadProgress: (event) => {
            const total = event.total ?? 0;
            const progress = total > 0 ? Math.round((event.loaded / total) * 100) : 0;
            patchPending(pendingId, { progress });
          },
        });
        if (isAttachmentRow(created)) {
          patchAttachmentsCache((list) =>
            appendAttachmentToList(list, /** @type {Record<string, unknown>} */ (created)),
          );
          syncRelatedQueries({ thumbAttachmentIds: [created.id] });
        } else {
          syncRelatedQueries();
        }
        removePending(pendingId);
        message.success(t("attachmentsUploadSuccess"));
      } catch (err) {
        patchPending(pendingId, {
          status: "error",
          progress: 0,
          errorMessage: getAttachmentUploadErrorMessage(t, tApiErrors, err),
        });
      }
    },
    [
      api,
      message,
      patchAttachmentsCache,
      patchPending,
      pendingItems,
      recordId,
      removePending,
      syncRelatedQueries,
      t,
      tApiErrors,
    ],
  );

  const uploadAllPending = useCallback(async () => {
    const queue = pendingItems.filter((i) => i.status === "pending" || i.status === "error");
    if (!queue.length) return;
    setUploadAllLoading(true);
    try {
      for (const entry of queue) {
        await uploadPendingFile(entry.id);
      }
    } finally {
      setUploadAllLoading(false);
    }
  }, [pendingItems, uploadPendingFile]);

  const handleSelectFiles = useCallback(
    (/** @type {File} */ file) => {
      const result = validateUploadFile(file, t, message);
      if (result === Upload.LIST_IGNORE) return Upload.LIST_IGNORE;
      addFiles([file]);
      return false;
    },
    [addFiles, message, t],
  );

  const fileSelectProps = {
    showUploadList: false,
    multiple: true,
    beforeUpload: handleSelectFiles,
  };

  const hasPendingQueue = pendingItems.length > 0;

  const rootClassName = embedded ? "" : "mt-2";

  const headerDescription =
    rows.length > 0
      ? t("attachmentsSummary", { count: rows.length, size: formatFileSize(totalBytes) })
      : t("attachmentsUploadHint");

  if (!enabled) {
    return (
      <div className={rootClassName}>
        <ResourceDrawerPanelHeader title={t("attachmentsTitle")} description={t("attachmentsHintCreate")} />
        <Alert type="info" showIcon className="!rounded-lg" title={t("attachmentsHintCreate")} />
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      {mediaPreviewRow ? (
        <AttachmentMediaPreviewModal
          key={mediaPreviewRow.id}
          open
          onClose={() => setMediaPreviewRow(null)}
          recordId={recordId}
          attachment={mediaPreviewRow}
          imageAttachments={imageAttachments}
          initialImageIndex={initialImageIndex}
          api={api}
          t={t}
        />
      ) : null}

      <ResourceDrawerPanelHeader
        title={
          <span className="inline-flex items-center gap-2">
            {t("attachmentsTitle")}
            {rows.length > 0 ? (
              <Badge count={rows.length} showZero={false} color="var(--ant-color-primary)" overflowCount={99} />
            ) : null}
          </span>
        }
        description={headerDescription}
      />

      <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-3 dark:border-neutral-700 dark:bg-neutral-900/40">
        {!readOnly ? (
          <Upload.Dragger {...fileSelectProps} className="!mb-3 !rounded-lg !bg-white dark:!bg-neutral-900">
            <p className="ant-upload-drag-icon !mb-2">
              <InboxOutlined className="!text-3xl !text-[var(--ant-color-primary)]" />
            </p>
            <p className="ant-upload-text !text-sm !font-medium">{t("attachmentsDropTitle")}</p>
            <p className="ant-upload-hint !text-xs !text-neutral-500 dark:!text-neutral-400">
              {t("attachmentsDropHint", { max: MAX_ATTACHMENT_LABEL })}
            </p>
          </Upload.Dragger>
        ) : null}

        {hasPendingQueue ? (
          <section className="mb-3" aria-label={t("attachmentsPendingTitle")}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h4 className="m-0 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {t("attachmentsPendingTitle")}
              </h4>
              {pendingCount > 1 ? (
                <Button
                  type="primary"
                  size="small"
                  icon={<UploadOutlined />}
                  loading={uploadAllLoading || isUploading}
                  onClick={uploadAllPending}
                >
                  {t("attachmentsUploadAll", { count: pendingCount })}
                </Button>
              ) : null}
            </div>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {pendingItems.map((entry) => (
                <li key={entry.id}>
                  <AttachmentPendingListItem
                    fileName={entry.fileName}
                    fileSize={entry.fileSize}
                    category={entry.category}
                    previewUrl={entry.previewUrl}
                    status={entry.status}
                    progress={entry.progress}
                    errorMessage={entry.errorMessage}
                    t={t}
                    onRemove={() => removePending(entry.id)}
                    onUpload={() => uploadPendingFile(entry.id)}
                    onRetry={() => uploadPendingFile(entry.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {hasPendingQueue && rows.length > 0 && !attachmentsQuery.isPending && !attachmentsQuery.isError ? (
          <div
            className="my-3 border-t border-neutral-200 dark:border-neutral-700"
            role="separator"
            aria-hidden
          />
        ) : null}

        {attachmentsQuery.isPending ? (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        ) : attachmentsQuery.isError ? (
          <Alert type="error" showIcon className="!rounded-lg" title={t("attachmentsLoadError")} />
        ) : rows.length === 0 ? (
          <Empty
            className="!my-4"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("attachmentsEmpty")}
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {rows.map((row) => (
              <li key={row.id}>
                <AttachmentListItem
                  row={row}
                  readOnly={readOnly}
                  previewLoading={previewingId === row.id}
                  enablePrimaryImage={enablePrimaryImage}
                  setPrimaryLoading={settingPrimaryId === row.id}
                  t={t}
                  onPreview={() => handlePreview(row)}
                  onDownload={() => handleDownload(row)}
                  onDelete={() => handleDelete(row)}
                  onSetPrimary={() => handleSetPrimary(row)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
