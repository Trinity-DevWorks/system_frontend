"use client";

import { Button } from "antd";
import { useTranslations } from "next-intl";
import { useState } from "react";
import SalesInvoiceProofDisclosureModal from "./SalesInvoiceProofDisclosureModal";

/**
 * @param {{
 *   invoiceId: string;
 *   invoiceNumber?: string | null;
 *   disabled?: boolean;
 * }} props
 */
export default function SalesInvoiceProofDisclosureButton({ invoiceId, invoiceNumber = null, disabled = false }) {
  const t = useTranslations("InvoiceProofDisclosure");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className="shrink-0" disabled={disabled} onClick={() => setOpen(true)}>
        {t("action")}
      </Button>
      <SalesInvoiceProofDisclosureModal
        open={open}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
