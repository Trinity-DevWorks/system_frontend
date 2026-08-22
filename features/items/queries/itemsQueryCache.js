import { patchTenantListCache } from "@/lib/tables/tenantListCache";
import { ITEMS_LIST_QUERY_KEY, itemDetailQueryKey } from "./itemsQueryKeys";

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {string} itemId
 * @param {{ id: string; file_name: string; mime_type: string } | null} primaryImage
 */
export function patchItemPrimaryImageInCache(queryClient, itemId, primaryImage) {
  patchTenantListCache(queryClient, ITEMS_LIST_QUERY_KEY, (rows) =>
    rows.map((row) => (row?.id === itemId ? { ...row, primary_image: primaryImage } : row)),
  );

  queryClient.setQueryData(itemDetailQueryKey(itemId), (old) => {
    if (!old || typeof old !== "object") return old;
    return { .../** @type {Record<string, unknown>} */ (old), primary_image: primaryImage };
  });
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {string} itemId
 * @param {string | number | null | undefined} attachmentId
 */
export function invalidateItemAttachmentThumb(queryClient, itemId, attachmentId) {
  if (attachmentId == null) return;
  void queryClient.invalidateQueries({
    queryKey: [...ITEMS_LIST_QUERY_KEY, itemId, "attachments", attachmentId, "thumb"],
  });
}

/**
 * Lets the shared attachments panel maintain the item list's denormalised
 * `primary_image` without importing anything from this feature.
 *
 * @type {import("@/shared/components/attachments/primaryImage").PrimaryImageSync}
 */
export const itemPrimaryImageSync = {
  listQueryKey: ITEMS_LIST_QUERY_KEY,
  patchPrimaryImage: patchItemPrimaryImageInCache,
  invalidateThumb: invalidateItemAttachmentThumb,
};

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
