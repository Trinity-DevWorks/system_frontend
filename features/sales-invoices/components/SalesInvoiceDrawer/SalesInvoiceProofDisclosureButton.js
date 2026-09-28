"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { verifyDisclosureBundle } from "@/lib/invoice-proof-merkle";
import { withLocalePrefix } from "@/lib/locale-path";
import {
  createSalesInvoiceProofDisclosure,
  fetchSalesInvoiceProofFields,
} from "../../api/salesInvoices.api";
import { App, Button, Modal, Spin, Tree, Typography } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";

/**
 * @param {unknown} value
 */
function formatLeafValue(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "[]";
  return String(value);
}

/**
 * Checkable tree keyed by dot-path prefixes; leaves carry the full path.
 * @param {Array<{ path: string; value: unknown }>} fields
 */
function buildFieldTree(fields) {
  /** @type {Array<Record<string, unknown>>} */
  const roots = [];
  /** @type {Map<string, Record<string, unknown>>} */
  const groups = new Map();

  for (const field of fields) {
    const segments = field.path.split(".");
    let siblings = roots;
    for (let depth = 0; depth < segments.length - 1; depth += 1) {
      const key = segments.slice(0, depth + 1).join(".");
      let group = groups.get(key);
      if (!group) {
        group = { key, title: segments[depth], children: [] };
        groups.set(key, group);
        siblings.push(group);
      }
      siblings = /** @type {Array<Record<string, unknown>>} */ (group.children);
    }
    siblings.push({
      key: field.path,
      isLeaf: true,
      title: (
        <span dir="ltr">
          <span className="font-mono text-xs">{segments[segments.length - 1]}</span>
          <span className="ms-2 text-[var(--ant-color-text-secondary)]">{formatLeafValue(field.value)}</span>
        </span>
      ),
    });
  }

  return roots;
}

/**
 * @param {string} fileName
 * @param {unknown} data
 */
function downloadJson(fileName, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * @param {{
 *   invoiceId: string;
 *   invoiceNumber?: string | null;
 *   disabled?: boolean;
 * }} props
 */
export default function SalesInvoiceProofDisclosureButton({ invoiceId, invoiceNumber = null, disabled = false }) {
  const t = useTranslations("InvoiceProofDisclosure");
  const tApiErrors = useTranslations("ApiErrors");
  const locale = useLocale();
  const { message } = App.useApp();
  const requestRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fields, setFields] = useState(/** @type {Array<{ path: string; value: unknown }>} */ ([]));
  const [checked, setChecked] = useState(/** @type {string[]} */ ([]));

  const leafPaths = useMemo(() => new Set(fields.map((field) => field.path)), [fields]);
  const treeData = useMemo(() => buildFieldTree(fields), [fields]);
  const selectedPaths = useMemo(() => checked.filter((key) => leafPaths.has(key)), [checked, leafPaths]);

  const handleOpen = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setOpen(true);
    setLoading(true);
    setFields([]);
    setChecked([]);
    try {
      const data = await fetchSalesInvoiceProofFields(invoiceId);
      if (requestRef.current !== requestId) return;
      setFields(Array.isArray(data?.fields) ? data.fields : []);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("loadError"));
      setOpen(false);
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [invoiceId, message, t, tApiErrors]);

  const handleDownload = useCallback(async () => {
    if (selectedPaths.length === 0) return;
    setCreating(true);
    try {
      const bundle = await createSalesInvoiceProofDisclosure(invoiceId, selectedPaths);
      if (!verifyDisclosureBundle(bundle).valid) {
        message.error(t("selfCheckFailed"));
        return;
      }
      const number = typeof invoiceNumber === "string" && invoiceNumber !== "" ? invoiceNumber : invoiceId;
      downloadJson(`invoice-proof-${number}.json`, bundle);
      message.success(t("downloadSuccess"));
    } catch (err) {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("createError"));
    } finally {
      setCreating(false);
    }
  }, [invoiceId, invoiceNumber, message, selectedPaths, t, tApiErrors]);

  return (
    <>
      <Button className="shrink-0" disabled={disabled} onClick={handleOpen}>
        {t("action")}
      </Button>
      <Modal
        open={open}
        title={t("title")}
        onCancel={() => setOpen(false)}
        width={560}
        destroyOnHidden
        footer={
          <div className="flex items-center justify-between gap-3">
            <a href={withLocalePrefix(locale, "/proofs/verify")} target="_blank" rel="noreferrer">
              {t("openVerifier")}
            </a>
            <div className="flex gap-2">
              <Button onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button
                type="primary"
                loading={creating}
                disabled={selectedPaths.length === 0 || loading}
                onClick={handleDownload}
              >
                {t("download", { count: selectedPaths.length })}
              </Button>
            </div>
          </div>
        }
      >
        <Typography.Paragraph className="!mb-3 !text-sm !text-[var(--ant-color-text-secondary)]">
          {t("description")}
        </Typography.Paragraph>
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spin />
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-auto rounded-lg border border-[var(--ant-color-border-secondary)] p-2">
            <Tree
              checkable
              selectable={false}
              treeData={treeData}
              checkedKeys={checked}
              onCheck={(keys) => setChecked((Array.isArray(keys) ? keys : keys.checked).map(String))}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
