"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { verifyDisclosureBundle } from "@/lib/invoice-proof-merkle";
import { withLocalePrefix } from "@/lib/locale-path";
import { useInvoiceVerifiersQuery } from "@/features/invoice-verifiers/queries/useInvoiceVerifiersQuery";
import {
  packsForAudience,
  pathsForPack,
  verifierNamesForPack,
} from "../../utils/disclosurePacks";
import {
  createSalesInvoiceProofDisclosure,
  fetchSalesInvoiceProofFields,
} from "../../api/salesInvoices.api";
import { ArrowLeftOutlined, DownloadOutlined, ExportOutlined, RightOutlined } from "@ant-design/icons";
import { App, Button, Modal, Spin, Tag, Tree, Typography } from "antd";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * @param {unknown} value
 */
function formatLeafValue(value) {
  if (value === null || (Array.isArray(value) && value.length === 0)) return "\u2014";
  return String(value);
}

/**
 * @param {string} segment
 * @param {Record<string, string>} labels
 * @param {(key: string, values?: Record<string, string | number>) => string} t
 */
function segmentLabel(segment, labels, t) {
  if (/^\d+$/.test(segment)) return t("fieldLine", { n: Number(segment) + 1 });
  return typeof labels[segment] === "string" ? labels[segment] : segment;
}

/**
 * Checkable tree keyed by dot-path prefixes; leaves carry the full path.
 * @param {Array<{ path: string; value: unknown }>} fields
 * @param {Record<string, string>} labels
 * @param {(key: string, values?: Record<string, string | number>) => string} t
 */
function buildFieldTree(fields, labels, t) {
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
        group = { key, title: segmentLabel(segments[depth], labels, t), children: [] };
        groups.set(key, group);
        siblings.push(group);
      }
      siblings = /** @type {Array<Record<string, unknown>>} */ (group.children);
    }
    siblings.push({
      key: field.path,
      isLeaf: true,
      title: (
        <span>
          <span>{segmentLabel(segments[segments.length - 1], labels, t)}</span>
          <span className="ms-2 text-[var(--ant-color-text-secondary)]" dir="ltr">
            {formatLeafValue(field.value)}
          </span>
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
 * @param {string | null | undefined} invoiceNumber
 * @param {string} invoiceId
 * @param {string | null} slug
 */
function proofFileName(invoiceNumber, invoiceId, slug) {
  const raw = typeof invoiceNumber === "string" && invoiceNumber !== "" ? invoiceNumber : invoiceId;
  const safe = String(raw).replace(/[^\w.-]+/g, "-");
  return slug ? `invoice-proof-${safe}-${slug}.json` : `invoice-proof-${safe}.json`;
}

const PACK_COPY = {
  auditor: { title: "packAuditor", summary: "packAuditorSummary" },
  tax_authority: { title: "packTax", summary: "packTaxSummary" },
  financier: { title: "packFinancier", summary: "packFinancierSummary" },
};

/**
 * Downloads a selective-disclosure proof. Opens with a ready file for each verifier role.
 * Choose fields keeps the leaf picker for a one-off share.
 *
 * @param {{
 *   open: boolean;
 *   invoiceId: string | null;
 *   invoiceNumber?: string | null;
 *   audience?: "sales" | "purchase";
 *   onClose: () => void;
 *   fetchFields?: typeof fetchSalesInvoiceProofFields;
 *   createDisclosure?: typeof createSalesInvoiceProofDisclosure;
 * }} props
 */
export default function SalesInvoiceProofDisclosureModal({
  open,
  invoiceId,
  invoiceNumber = null,
  audience = "sales",
  onClose,
  fetchFields = fetchSalesInvoiceProofFields,
  createDisclosure = createSalesInvoiceProofDisclosure,
}) {
  const t = useTranslations("InvoiceProofDisclosure");
  const tApiErrors = useTranslations("ApiErrors");
  const messages = useMessages();
  const fieldLabels = /** @type {Record<string, string>} */ (
    messages?.InvoiceProofDisclosure &&
    typeof messages.InvoiceProofDisclosure === "object" &&
    messages.InvoiceProofDisclosure.fields &&
    typeof messages.InvoiceProofDisclosure.fields === "object"
      ? messages.InvoiceProofDisclosure.fields
      : {}
  );
  const locale = useLocale();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(/** @type {string | null} */ (null));
  const [mode, setMode] = useState(/** @type {"packs" | "custom"} */ ("packs"));
  const [fields, setFields] = useState(/** @type {Array<{ path: string; value: unknown }>} */ ([]));
  const [checked, setChecked] = useState(/** @type {string[]} */ ([]));
  const verifiersQuery = useInvoiceVerifiersQuery({ enabled: open && invoiceId != null });

  const leafPaths = useMemo(() => new Set(fields.map((field) => field.path)), [fields]);
  const treeData = useMemo(() => buildFieldTree(fields, fieldLabels, t), [fields, fieldLabels, t]);
  const selectedPaths = useMemo(() => checked.filter((key) => leafPaths.has(key)), [checked, leafPaths]);
  const packs = useMemo(() => packsForAudience(audience), [audience]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestKey = open && invoiceId != null ? `${audience}:${invoiceId}` : null;
  const [loadedKey, setLoadedKey] = useState(/** @type {string | null} */ (null));
  if (requestKey !== loadedKey) {
    setLoadedKey(requestKey);
    setMode("packs");
    setCreating(null);
    if (requestKey != null) {
      setLoading(true);
      setFields([]);
      setChecked([]);
    }
  }

  useEffect(() => {
    if (requestKey == null || invoiceId == null) return undefined;
    let cancelled = false;
    fetchFields(invoiceId)
      .then((data) => {
        if (!cancelled) setFields(Array.isArray(data?.fields) ? data.fields : []);
      })
      .catch((err) => {
        if (cancelled) return;
        message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("loadError"));
        onCloseRef.current();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, invoiceId, fetchFields, message, t, tApiErrors]);

  const downloadPaths = useCallback(
    async (paths, slug, creatingKey) => {
      if (invoiceId == null || paths.length === 0 || creating != null) return;
      setCreating(creatingKey);
      try {
        const bundle = await createDisclosure(invoiceId, paths);
        if (!verifyDisclosureBundle(bundle).valid) {
          message.error(t("selfCheckFailed"));
          return;
        }
        downloadJson(proofFileName(invoiceNumber, invoiceId, slug), bundle);
        message.success(t("downloadSuccess"));
      } catch (err) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("createError"));
      } finally {
        setCreating(null);
      }
    },
    [creating, createDisclosure, invoiceId, invoiceNumber, message, t, tApiErrors],
  );

  const customMode = mode === "custom";
  const invoiceLabel = typeof invoiceNumber === "string" && invoiceNumber !== "" ? invoiceNumber : null;
  const arrowClass = locale === "ar" ? "rotate-180" : undefined;

  return (
    <Modal
      open={open && invoiceId != null}
      title={
        <div>
          <div>{customMode ? t("title") : t("packsTitle")}</div>
          {invoiceLabel ? (
            <div className="text-sm font-normal text-[var(--ant-color-text-secondary)]">{invoiceLabel}</div>
          ) : null}
        </div>
      }
      onCancel={onClose}
      width={560}
      destroyOnHidden
      footer={
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="text-start text-xs text-[var(--ant-color-text-secondary)]">
            {t("verifierHint")}{" "}
            <a
              href={withLocalePrefix(locale, "/proofs/verify")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap"
            >
              {t("openVerifier")}
              <ExportOutlined className="text-[10px]" />
            </a>
          </span>
          <div className="ms-auto flex gap-2">
            <Button onClick={onClose}>{t("cancel")}</Button>
            {customMode ? (
              <Button
                type="primary"
                loading={creating === "custom"}
                disabled={selectedPaths.length === 0 || loading || (creating != null && creating !== "custom")}
                onClick={() => downloadPaths(selectedPaths, null, "custom")}
              >
                {t("download", { count: selectedPaths.length })}
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <Typography.Paragraph className="!mb-3 !text-sm !text-[var(--ant-color-text-secondary)]">
        {customMode ? t("description") : t("packsDescription")}
      </Typography.Paragraph>
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spin />
        </div>
      ) : customMode ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <Button type="link" className="!h-auto !px-0" icon={<ArrowLeftOutlined className={arrowClass} />} onClick={() => setMode("packs")}>
              {t("backToPacks")}
            </Button>
            <span className="text-xs text-[var(--ant-color-text-secondary)]">{t("selectedCount", { count: selectedPaths.length })}</span>
          </div>
          <div className="max-h-[50vh] overflow-auto rounded-lg border border-[var(--ant-color-border-secondary)] p-2">
            <Tree
              checkable
              selectable={false}
              treeData={treeData}
              checkedKeys={checked}
              onCheck={(keys) => setChecked((Array.isArray(keys) ? keys : keys.checked).map(String))}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {packs.map((pack) => {
            const paths = pathsForPack(fields, pack);
            const names = verifierNamesForPack(verifiersQuery.rows, pack.id, audience);
            const copy = PACK_COPY[pack.id];
            return (
              <div key={pack.id} className="rounded-lg border border-[var(--ant-color-border-secondary)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{t(copy.title)}</div>
                    <div className="mt-1 text-sm text-[var(--ant-color-text-secondary)]">{t(copy.summary)}</div>
                  </div>
                  <Button
                    className="shrink-0"
                    icon={<DownloadOutlined />}
                    loading={creating === pack.id}
                    disabled={paths.length === 0 || (creating != null && creating !== pack.id)}
                    onClick={() => downloadPaths(paths, pack.fileSlug, pack.id)}
                  >
                    {t("packDownload")}
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ant-color-text-secondary)]">
                  <span>{t("packFieldCount", { count: paths.length })}</span>
                  {names.length > 0 ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{t("packFor")}</span>
                      {names.map((name) => (
                        <Tag key={name} className="!m-0">
                          {name}
                        </Tag>
                      ))}
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-[var(--ant-color-border)] bg-transparent p-3 text-start text-inherit transition-colors hover:border-[var(--ant-color-primary)] hover:bg-[var(--ant-color-fill-quaternary)]"
            onClick={() => setMode("custom")}
          >
            <span className="min-w-0">
              <span className="block font-medium">{t("chooseFields")}</span>
              <span className="mt-1 block text-sm text-[var(--ant-color-text-secondary)]">{t("chooseFieldsHint")}</span>
            </span>
            <RightOutlined className={`shrink-0 text-[var(--ant-color-text-tertiary)] ${arrowClass ?? ""}`} />
          </button>
        </div>
      )}
    </Modal>
  );
}
