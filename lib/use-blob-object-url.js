"use client";

import { useEffect, useState } from "react";

/**
 * Object URL for a Blob, with revoke on change/unmount.
 * setState is deferred so it does not trip react-hooks/set-state-in-effect
 * while still surviving React Strict Mode effect re-runs (unlike useMemo + revoke).
 *
 * @param {Blob | null | undefined} blob
 * @returns {string | null}
 */
export function useBlobObjectUrl(blob) {
  const [objectUrl, setObjectUrl] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!blob) {
      queueMicrotask(() => setObjectUrl(null));
      return undefined;
    }
    const url = URL.createObjectURL(blob);
    queueMicrotask(() => setObjectUrl(url));
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return objectUrl;
}
