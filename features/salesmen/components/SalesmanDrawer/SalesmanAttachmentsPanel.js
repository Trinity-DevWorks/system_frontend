"use client";

import ResourceAttachmentsPanel from "@/shared/components/resource-drawer/ResourceAttachmentsPanel";
import { salesmenAttachmentsApi } from "../../api/salesmenAttachments.api";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { SALESMEN_LIST_QUERY_KEY } from "../../queries/salesmenQueryKeys";

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
    () => /** @type {const} */ ([...SALESMEN_LIST_QUERY_KEY, salesmanId, "attachments"]),
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
