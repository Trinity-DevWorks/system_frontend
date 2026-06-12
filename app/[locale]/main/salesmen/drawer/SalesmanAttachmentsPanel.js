"use client";

import ResourceAttachmentsPanel from "@/components/resource-drawer/ResourceAttachmentsPanel";
import { salesmenAttachmentsApi } from "@/services/salesmenAttachmentsApi";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

/**
 * @param {{
 *   open: boolean;
 *   salesmanId: string | null;
 *   readOnly: boolean;
 * }} props
 */
export default function SalesmanAttachmentsPanel({ open, salesmanId, readOnly }) {
  const t = useTranslations("Salesmen");
  const tApiErrors = useTranslations("ApiErrors");

  const queryKey = useMemo(
    () => /** @type {const} */ (["tenant", "salesmen", salesmanId, "attachments"]),
    [salesmanId],
  );

  return (
    <ResourceAttachmentsPanel
      open={open}
      recordId={salesmanId}
      readOnly={readOnly}
      t={t}
      tApiErrors={tApiErrors}
      queryKey={queryKey}
      api={salesmenAttachmentsApi}
    />
  );
}
