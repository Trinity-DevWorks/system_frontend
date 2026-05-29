/** @type {readonly ["tenant", "items"]} */
export const ITEMS_LIST_QUERY_KEY = /** @type {const} */ (["tenant", "items"]);

/**
 * @param {Record<string, unknown>} attachment
 * @returns {{ id: number; file_name: string; mime_type: string } | null}
 */
export function attachmentToPrimaryImageBrief(attachment) {
  if (attachment.viewer_category !== "image") return null;
  const id = attachment.id;
  if (typeof id !== "number") return null;
  return {
    id,
    file_name: String(attachment.file_name ?? ""),
    mime_type: String(attachment.mime_type ?? ""),
  };
}

/**
 * @param {unknown[]} attachments
 * @returns {{ id: number; file_name: string; mime_type: string } | null}
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
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} itemId
 * @param {{ id: number; file_name: string; mime_type: string } | null} primaryImage
 */
export function patchItemPrimaryImageInCache(queryClient, itemId, primaryImage) {
  queryClient.setQueryData(ITEMS_LIST_QUERY_KEY, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((row) => (row?.id === itemId ? { ...row, primary_image: primaryImage } : row));
  });

  queryClient.setQueryData(["tenant", "items", itemId], (old) => {
    if (!old || typeof old !== "object") return old;
    return { .../** @type {Record<string, unknown>} */ (old), primary_image: primaryImage };
  });
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} itemId
 * @param {number | null | undefined} attachmentId
 */
export function invalidateItemAttachmentThumb(queryClient, itemId, attachmentId) {
  if (attachmentId == null) return;
  void queryClient.invalidateQueries({
    queryKey: ["tenant", "items", itemId, "attachments", attachmentId, "thumb"],
  });
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number[]} itemIds
 */
export function removeItemsFromListCache(queryClient, itemIds) {
  if (!itemIds.length) return;
  const idSet = new Set(itemIds);
  queryClient.setQueryData(ITEMS_LIST_QUERY_KEY, (old) => {
    if (!Array.isArray(old)) return old;
    return old.filter((row) => !idSet.has(/** @type {{ id?: number }} */ (row)?.id));
  });
}

/**
 * Keep list thumbnail if PUT response omits it.
 * @param {unknown} previousRow
 * @param {unknown} nextRow
 */
export function mergeItemListRow(previousRow, nextRow) {
  if (!nextRow || typeof nextRow !== "object") return nextRow;
  if (!previousRow || typeof previousRow !== "object") return nextRow;
  const prev = /** @type {{ primary_image?: unknown }} */ (previousRow);
  const next = /** @type {Record<string, unknown>} */ (nextRow);
  if (next.primary_image == null && prev.primary_image != null) {
    return { ...next, primary_image: prev.primary_image };
  }
  return next;
}
