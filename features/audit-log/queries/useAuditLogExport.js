"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCallback, useState } from "react";
import { downloadAuditsCsv } from "../api/audits.api";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   filters: Record<string, string>;
 * }} args
 */
export function useAuditLogExport({ t, tApiErrors, notification, filters }) {
  const [exporting, setExporting] = useState(false);

  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      await downloadAuditsCsv(filters);
      notification.success({ title: t("exportSuccess") });
    } catch (error) {
      notification.error({
        title: t("exportError"),
        description: getLocalizedApiErrorMessage(tApiErrors, error),
      });
    } finally {
      setExporting(false);
    }
  }, [filters, notification, t, tApiErrors]);

  return { exportCsv, exporting };
}
