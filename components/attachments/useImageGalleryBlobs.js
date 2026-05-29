"use client";

import {
  getCachedMediaBlobUrl,
  setCachedMediaBlobUrl,
} from "@/components/attachments/mediaPreviewCache";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * @typedef {{ id: number; file_name: string }} ImageAttachment
 */

/**
 * Lazy-loads image blobs per attachment id for a lightbox gallery.
 *
 * @param {{
 *   recordId: number;
 *   images: ImageAttachment[];
 *   initialIndex: number;
 *   viewBlob: (recordId: number, attachmentId: number) => Promise<Blob>;
 * }} options
 */
export function useImageGalleryBlobs({ recordId, images, initialIndex, viewBlob }) {
  const safeInitial = Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1));
  const [index, setIndex] = useState(safeInitial);
  const [urlsById, setUrlsById] = useState(/** @type {Record<number, string>} */ ({}));
  const inFlightRef = useRef(/** @type {Set<number>} */ (new Set()));

  const ensureLoaded = useCallback(
    async (/** @type {number} */ attachmentId) => {
      if (!attachmentId) return;

      const cached = getCachedMediaBlobUrl(recordId, attachmentId);
      if (cached) {
        setUrlsById((prev) => (prev[attachmentId] ? prev : { ...prev, [attachmentId]: cached }));
        return;
      }

      if (inFlightRef.current.has(attachmentId)) return;
      inFlightRef.current.add(attachmentId);

      try {
        const blob = await viewBlob(recordId, attachmentId);
        const url = URL.createObjectURL(blob);
        setCachedMediaBlobUrl(recordId, attachmentId, url);
        setUrlsById((prev) => ({ ...prev, [attachmentId]: url }));
      } catch {
        /* slide shows spinner until retry via navigation */
      } finally {
        inFlightRef.current.delete(attachmentId);
      }
    },
    [recordId, viewBlob],
  );

  useEffect(() => {
    const id = images[safeInitial]?.id;
    if (!id) return;
    const timer = window.setTimeout(() => {
      void ensureLoaded(id);
    }, 0);
    return () => window.clearTimeout(timer);
    // Mount-only: parent `key` remounts when opening a different attachment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSlideView = useCallback(
    (/** @type {number} */ nextIndex) => {
      setIndex(nextIndex);
      const id = images[nextIndex]?.id;
      if (id) void ensureLoaded(id);
    },
    [images, ensureLoaded],
  );

  const slides = images.map((img) => ({
    src: urlsById[img.id] ?? "",
    alt: img.file_name,
  }));

  return {
    index,
    slides,
    onSlideView,
  };
}
