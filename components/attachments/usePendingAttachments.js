"use client";

import {
  createFilePreviewUrl,
  guessViewerCategoryFromFile,
  revokeFilePreviewUrl,
} from "@/components/attachments/attachmentFileUtils";
import { useCallback, useEffect, useRef, useState } from "react";

/** @typedef {'pending' | 'uploading' | 'success' | 'error'} PendingUploadStatus */

/**
 * @typedef {{
 *   id: string;
 *   file: File;
 *   fileName: string;
 *   fileSize: number;
 *   category: string;
 *   previewUrl?: string;
 *   status: PendingUploadStatus;
 *   progress: number;
 *   errorMessage?: string;
 * }} PendingAttachment
 */

/**
 * @param {File} file
 * @returns {PendingAttachment}
 */
function createPendingEntry(file) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    file,
    fileName: file.name,
    fileSize: file.size,
    category: guessViewerCategoryFromFile(file),
    previewUrl: createFilePreviewUrl(file),
    status: "pending",
    progress: 0,
  };
}

export function usePendingAttachments() {
  const [items, setItems] = useState(/** @type {PendingAttachment[]} */ ([]));
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const revokeEntry = useCallback((/** @type {PendingAttachment} */ entry) => {
    revokeFilePreviewUrl(entry.previewUrl);
  }, []);

  const addFiles = useCallback((/** @type {File[]} */ files) => {
    if (!files.length) return;
    setItems((prev) => [...prev, ...files.map(createPendingEntry)]);
  }, []);

  const remove = useCallback(
    (/** @type {string} */ id) => {
      setItems((prev) => {
        const entry = prev.find((i) => i.id === id);
        if (entry) revokeEntry(entry);
        return prev.filter((i) => i.id !== id);
      });
    },
    [revokeEntry],
  );

  const patch = useCallback((/** @type {string} */ id, /** @type {Partial<PendingAttachment>} */ updates) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }, []);

  const clearAll = useCallback(() => {
    setItems((prev) => {
      prev.forEach(revokeEntry);
      return [];
    });
  }, [revokeEntry]);

  useEffect(
    () => () => {
      itemsRef.current.forEach(revokeEntry);
    },
    [revokeEntry],
  );

  const pendingCount = items.filter((i) => i.status === "pending" || i.status === "error").length;
  const isUploading = items.some((i) => i.status === "uploading");

  return {
    items,
    pendingCount,
    isUploading,
    addFiles,
    remove,
    patch,
    clearAll,
  };
}
