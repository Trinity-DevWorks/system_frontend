"use client";

/**
 * Attachments tab — wraps the shared attachments panel for the current item.
 *
 * Used by:
 * - drawer/hooks/useItemDrawerTabItems.js
 */

import ResourceAttachmentsPanel from "@/shared/components/resource-drawer/ResourceAttachmentsPanel";
import { itemPrimaryImageSync } from "../../../queries/itemsQueryCache";
import { itemsAttachmentsApi } from "../../../api/itemsAttachments.api";
import { useMemo } from "react";
import { ITEMS_LIST_QUERY_KEY } from "../../../queries/itemsQueryKeys";

/**
 * @param {{
 *   open: boolean;
 *   itemId: string | null;
 *   readOnly: boolean;
 *   active: boolean;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 * }} props
 */
export default function ItemAttachmentsPanel({ open, itemId, readOnly, active, t, tApiErrors }) {
  const queryKey = useMemo(
    () => /** @type {const} */ ([...ITEMS_LIST_QUERY_KEY, itemId, "attachments"]),
    [itemId],
  );

  return (
    <ResourceAttachmentsPanel
      open={open && active}
      recordId={itemId}
      readOnly={readOnly}
      t={t}
      tApiErrors={tApiErrors}
      queryKey={queryKey}
      api={itemsAttachmentsApi}
      embedded
      primaryImageSync={itemPrimaryImageSync}
    />
  );
}
