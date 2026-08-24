/**
 * Generic primary-image helpers for attachment lists.
 *
 * These know nothing about any particular resource. Features that keep a
 * denormalised `primary_image` on their list rows supply a sync adapter to
 * `ResourceAttachmentsPanel` (see `primaryImageSync`).
 */

/**
 * @param {Record<string, unknown>} attachment
 * @returns {{ id: string; file_name: string; mime_type: string } | null}
 */
export function attachmentToPrimaryImageBrief(attachment) {
  if (attachment.viewer_category !== "image") return null;
  const id = attachment.id;
  if (id == null || id === "") return null;
  return {
    id: String(id),
    file_name: String(attachment.file_name ?? ""),
    mime_type: String(attachment.mime_type ?? ""),
  };
}

/**
 * @param {unknown[]} attachments
 * @returns {{ id: string; file_name: string; mime_type: string } | null}
 */
export function derivePrimaryImageFromAttachments(attachments) {
  const images = attachments.filter(
    (row) => row && typeof row === "object" && /** @type {{ viewer_category?: string }} */ (row).viewer_category === "image",
  );
  const marked = images.find((row) => Boolean(/** @type {{ is_primary?: boolean }} */ (row).is_primary));
  const pick = marked ?? images[0];
  return pick && typeof pick === "object"
    ? attachmentToPrimaryImageBrief(/** @type {Record<string, unknown>} */ (pick))
    : null;
}

/**
 * Adapter a feature passes to `ResourceAttachmentsPanel` so the panel can keep
 * that feature's list/detail cache in step without importing it.
 *
 * @typedef {{
 *   listQueryKey: readonly unknown[];
 *   patchPrimaryImage: (
 *     queryClient: import("@tanstack/react-query").QueryClient,
 *     recordId: string,
 *     primaryImage: { id: string; file_name: string; mime_type: string } | null,
 *   ) => void;
 *   invalidateThumb: (
 *     queryClient: import("@tanstack/react-query").QueryClient,
 *     recordId: string,
 *     attachmentId: string | number | null | undefined,
 *   ) => void;
 * }} PrimaryImageSync
 */
export {};
