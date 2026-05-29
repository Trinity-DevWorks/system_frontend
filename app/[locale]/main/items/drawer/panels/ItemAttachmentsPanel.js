"use client";

/**
 * Attachments tab — wraps the shared attachments panel for the current item.
 *
 * Used by:
 * - drawer/hooks/useItemDrawerTabItems.js
 */

import ResourceAttachmentsPanel from "@/components/resource-drawer/ResourceAttachmentsPanel";
import { itemsAttachmentsApi } from "@/services/itemsAttachmentsApi";
import { useMemo } from "react";

/**
 * @param {{
 *   open: boolean;
 *   itemId: number | null;
 *   readOnly: boolean;
 *   active: boolean;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 * }} props
 */
export default function ItemAttachmentsPanel({ open, itemId, readOnly, active, t, tApiErrors }) {
  const queryKey = useMemo(
    () => /** @type {const} */ (["tenant", "items", itemId, "attachments"]),
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
      enablePrimaryImage
    />
  );
}
