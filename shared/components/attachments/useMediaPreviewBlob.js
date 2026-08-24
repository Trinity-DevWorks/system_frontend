"use client";

import {
  getCachedMediaBlobUrl,
  setCachedMediaBlobUrl,
} from "@/shared/components/attachments/mediaPreviewCache";
import { useEffect, useRef, useState } from "react";

/**
 * @param {{
 *   open: boolean;
 *   recordId: number | null;
 *   attachmentId: number | null;
 *   viewBlob: (recordId: number, attachmentId: number) => Promise<Blob>;
 * }} options
 */
export function useMediaPreviewBlob({ open, recordId, attachmentId, viewBlob }) {
  const cachedUrl =
    open && recordId != null && attachmentId != null
      ? getCachedMediaBlobUrl(recordId, attachmentId)
      : null;

  const [fetchedUrl, setFetchedUrl] = useState(/** @type {string | null} */ (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const pendingUrlRef = useRef(/** @type {string | null} */ (null));

  const blobUrl = cachedUrl ?? fetchedUrl;

  useEffect(() => {
    if (!open || !recordId || !attachmentId) return;

    if (getCachedMediaBlobUrl(recordId, attachmentId)) {
      return;
    }

    let cancelled = false;

    async function load() {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      setFetchedUrl(null);

      try {
        const blob = await viewBlob(recordId, attachmentId);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        pendingUrlRef.current = url;
        if (cancelled) {
          URL.revokeObjectURL(url);
          pendingUrlRef.current = null;
          return;
        }
        pendingUrlRef.current = null;
        setCachedMediaBlobUrl(recordId, attachmentId, url);
        setFetchedUrl(url);
      } catch {
        if (!cancelled) setError("load_failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (pendingUrlRef.current) {
        URL.revokeObjectURL(pendingUrlRef.current);
        pendingUrlRef.current = null;
      }
    };
  }, [open, recordId, attachmentId, viewBlob]);

  return {
    blobUrl,
    loading: cachedUrl ? false : loading,
    error,
  };
}
