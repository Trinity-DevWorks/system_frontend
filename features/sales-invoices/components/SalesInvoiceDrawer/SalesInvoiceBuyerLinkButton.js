"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCompanyProfile } from "@/features/settings/queries/companyProfile";
import { createBuyerPortalLink } from "../../api/salesInvoices.api";
import { salesInvoiceProofPortalAbsoluteUrl } from "../../utils/invoiceProofPortalUrl";
import { App, Button, Popover, QRCode, Spin } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * @param {{ svg: string; invoiceNumber: string; companyName: string; printedOn: string }} params
 */
function printBuyerQr({ svg, invoiceNumber, companyName, printedOn }) {
  const company = companyName
    ? `<p class="company">${escapeHtml(companyName)}</p>`
    : "";
  const heading = invoiceNumber
    ? `<p class="number">${escapeHtml(invoiceNumber)}</p>`
    : "";
  const dateLine = printedOn ? `<p class="date">${escapeHtml(printedOn)}</p>` : "";
  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>${escapeHtml(invoiceNumber || "Invoice")}</title>
    <style>
      @page { margin: 12mm; }
      html, body { height: 100%; margin: 0; }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .sheet {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
      }
      .sheet .company { margin: 0 0 2mm; font: 600 16pt sans-serif; }
      .sheet .number { margin: 0; font: 500 12pt sans-serif; }
      .sheet .date { margin: 2mm 0 8mm; font: 400 11pt sans-serif; }
      .sheet svg { width: 70%; height: auto; }
    </style>
  </head>
  <body>
    <div class="sheet">
      ${company}
      ${heading}
      ${dateLine}
      ${svg}
    </div>
  </body>
</html>`;
  const printWindow = window.open("", "_blank", "width=480,height=640");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 200);
}

/**
 * @param {{
 *   invoiceId: string;
 *   invoiceNumber?: string | null;
 *   disabled?: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function SalesInvoiceBuyerLinkButton({
  invoiceId,
  invoiceNumber = null,
  disabled = false,
  t,
}) {
  const locale = useLocale();
  const { profile } = useCompanyProfile();
  const companyName = profile.company_name.trim();
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const qrRef = useRef(null);
  const requestRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");

  const loadLink = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setUrl("");
    try {
      const data = await createBuyerPortalLink(invoiceId);
      if (requestRef.current !== requestId) return;
      const nextUrl = salesInvoiceProofPortalAbsoluteUrl(invoiceId, locale, {
        exp: data?.exp,
        sig: data?.sig,
      });
      if (nextUrl === "") {
        message.error(t("copyBuyerLinkError"));
        return;
      }
      setUrl(nextUrl);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("copyBuyerLinkError"));
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [invoiceId, locale, message, t, tApiErrors]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      setOpen(nextOpen);
      if (nextOpen) loadLink();
    },
    [loadLink],
  );

  const handleCopy = useCallback(async () => {
    if (url === "") return;
    try {
      await navigator.clipboard.writeText(url);
      message.success(t("copyBuyerLinkSuccess"));
    } catch {
      message.error(t("copyBuyerLinkError"));
    }
  }, [message, t, url]);

  const handlePrint = useCallback(() => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg || url === "") return;
    printBuyerQr({
      svg: svg.outerHTML,
      invoiceNumber: typeof invoiceNumber === "string" ? invoiceNumber : "",
      companyName,
      printedOn: new Date().toLocaleDateString(locale, { dateStyle: "medium" }),
    });
  }, [companyName, invoiceNumber, locale, url]);

  const panel = (
    <div className="flex w-60 flex-col items-center gap-3">
      {loading ? (
        <div className="flex h-40 w-40 items-center justify-center">
          <Spin />
        </div>
      ) : null}
      {url !== "" ? (
        <div ref={qrRef}>
          <QRCode
            value={url}
            size={208}
            type="svg"
            bordered={false}
            color="#000000"
            bgColor="#ffffff"
            errorLevel="L"
          />
        </div>
      ) : null}
      {url !== "" ? (
        <p className="m-0 w-full truncate text-center text-xs" title={url}>
          {url}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button size="small" disabled={url === ""} onClick={handleCopy}>
          {t("buyerLinkCopy")}
        </Button>
        <Button size="small" disabled={url === "" || loading} onClick={handlePrint}>
          {t("buyerLinkPrint")}
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      trigger="click"
      placement="topRight"
      content={panel}
      onOpenChange={handleOpenChange}
    >
      <Button className="shrink-0" disabled={disabled}>
        {t("actionBuyerLink")}
      </Button>
    </Popover>
  );
}
