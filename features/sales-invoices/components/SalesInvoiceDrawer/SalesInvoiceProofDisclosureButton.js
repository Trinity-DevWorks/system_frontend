"use client";

import { Button, Tooltip } from "antd";
import { useTranslations } from "next-intl";
import { useState } from "react";
import SalesInvoiceProofDisclosureModal from "./SalesInvoiceProofDisclosureModal";

/**
 * @param {{
 *   invoiceId: string;
 *   invoiceNumber?: string | null;
 *   disabled?: boolean;
 *   disabledReason?: string | null;
 * }} props
 */
export default function SalesInvoiceProofDisclosureButton({
  invoiceId,
  invoiceNumber = null,
  disabled = false,
  disabledReason = null,
  fetchFields,
  createDisclosure,
}) {
  const t = useTranslations("InvoiceProofDisclosure");
  const [open, setOpen] = useState(false);

  const button = (
    <Button className="shrink-0" disabled={disabled} onClick={() => setOpen(true)}>
      {t("action")}
    </Button>
  );

  return (
    <>
      {disabledReason ? (
        <Tooltip title={disabledReason}>
          <span className="inline-flex shrink-0">{button}</span>
        </Tooltip>
      ) : (
        button
      )}
      <SalesInvoiceProofDisclosureModal
        open={open}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        onClose={() => setOpen(false)}
        fetchFields={fetchFields}
        createDisclosure={createDisclosure}
      />
    </>
  );
}
