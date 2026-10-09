"use client";

import { saveInvoicePdfBlob } from "../api/salesInvoices.api";
import { App, Button } from "antd";
import { useState } from "react";

/**
 * @param {{
 *   invoiceId?: string | null;
 *   invoiceNumber?: string | null;
 *   label: string;
 *   failedLabel: string;
 *   disabled?: boolean;
 *   fetchPdf: (invoiceId: string) => Promise<Blob>;
 * }} props
 */
export default function InvoicePdfDownloadButton({
  invoiceId = null,
  invoiceNumber = null,
  label,
  failedLabel,
  disabled = false,
  fetchPdf,
}) {
  const { message } = App.useApp();
  const [downloading, setDownloading] = useState(false);
  if (invoiceId == null || invoiceId === "") return null;

  return (
    <Button
      className="shrink-0"
      loading={downloading}
      disabled={disabled || downloading}
      onClick={() => {
        setDownloading(true);
        fetchPdf(invoiceId)
          .then((blob) => {
            const name = typeof invoiceNumber === "string" && invoiceNumber.trim() !== "" ? invoiceNumber.trim() : "invoice";
            saveInvoicePdfBlob(blob, name);
          })
          .catch(() => {
            message.error(failedLabel);
          })
          .finally(() => setDownloading(false));
      }}
    >
      {label}
    </Button>
  );
}
