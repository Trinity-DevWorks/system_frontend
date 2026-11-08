"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { postedByDisplayName } from "./SalesInvoiceDrawerHeaderMeta";
import { useDrawerSubmitShortcut } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { DownOutlined } from "@ant-design/icons";
import { Button, Dropdown, Space } from "antd";
import { useSyncExternalStore } from "react";

/** "post" = post on account without paying; "pay" = open the payment window. */
/** @typedef {"post" | "pay"} PostIntent */

const POST_INTENT_KEY = "salesInvoice.postIntent";
const POST_INTENT_EVENT = "salesInvoice:postIntent";

/** @returns {PostIntent} */
function readPostIntent() {
  try {
    return localStorage.getItem(POST_INTENT_KEY) === "post" ? "post" : "pay";
  } catch {
    return "pay";
  }
}

/** @param {PostIntent} intent */
function savePostIntent(intent) {
  try {
    localStorage.setItem(POST_INTENT_KEY, intent);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(POST_INTENT_EVENT));
}

/** @param {() => void} onChange */
function subscribePostIntent(onChange) {
  window.addEventListener(POST_INTENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(POST_INTENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * @param {{
 *   t: (key: string) => string;
 *   postedBy?: unknown;
 *   postedAt?: string | null;
 * }} props
 */
function FooterPostedMeta({ t, postedBy, postedAt }) {
  return (
    <div className="sales-invoice-drawer-footer-posted">
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">{t("fieldPostedBy")}</span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {postedByDisplayName(postedBy) || "\u2014"}
        </span>
      </span>
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">{t("fieldPostedOn")}</span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {formatTenantDateTime(postedAt) || "\u2014"}
        </span>
      </span>
    </div>
  );
}

/**
 * @param {{
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   forceClose: () => void;
 *   requestClose: () => void;
 *   submitting: boolean;
 *   saveDisabled: boolean;
 *   postDisabled: boolean;
 *   showDelete: boolean;
 *   showReverse?: boolean;
 *   showPdf?: boolean;
 *   pdfLoading?: boolean;
 *   printLoading?: boolean;
 *   showCreateReceipt?: boolean;
 *   showCreateCreditNote?: boolean;
 *   postedBy?: unknown;
 *   postedAt?: string | null;
 *   onSave: () => void;
 *   onPost: () => void;
 *   onQuickPost: () => void;
 *   onDelete: () => void;
 *   onReverse?: () => void;
 *   onPrint?: () => void;
 *   onPrintReceipt?: () => void;
 *   receiptLoading?: boolean;
 *   onDownloadPdf?: () => void;
 *   onCreateReceipt?: () => void;
 *   onCreateCreditNote?: () => void;
 * }} props
 */
export default function SalesInvoiceDrawerFooter({
  readOnly,
  t,
  forceClose,
  requestClose,
  submitting,
  saveDisabled,
  postDisabled,
  showDelete,
  showReverse = false,
  showPdf = false,
  pdfLoading = false,
  printLoading = false,
  showCreateReceipt = false,
  showCreateCreditNote = false,
  postedBy = null,
  postedAt = null,
  onSave,
  onPost,
  onQuickPost,
  onDelete,
  onReverse,
  onPrint,
  onPrintReceipt,
  receiptLoading = false,
  onDownloadPdf,
  onCreateReceipt,
  onCreateCreditNote,
}) {
  // Main button repeats the last choice (like Save / Save and new / Save and close).
  const lastPostIntent = useSyncExternalStore(subscribePostIntent, readPostIntent, () => /** @type {PostIntent} */ ("pay"));
  const postLabel = (/** @type {PostIntent} */ intent) => (intent === "post" ? t("actionPost") : t("actionPostAndPay"));
  const runPost = (/** @type {PostIntent} */ intent) => {
    savePostIntent(intent);
    if (intent === "post") onQuickPost();
    else onPost();
  };
  const runLastPost = () => runPost(readPostIntent());

  useDrawerSubmitShortcut({
    enabled: !readOnly,
    submitting,
    onSave,
    saveDisabled,
    onPost: runLastPost,
    postDisabled,
  });

  if (readOnly) {
    return (
      <div className="flex w-full min-w-0 items-center gap-3">
        <FooterPostedMeta t={t} postedBy={postedBy} postedAt={postedAt} />
        <Button className="shrink-0" onClick={forceClose}>
          {t("drawerClose")}
        </Button>
        {showPdf ? (
          <>
            {onPrint ? (
              <Button className="shrink-0" loading={printLoading} disabled={submitting} onClick={onPrint}>
                {t("actionPrint")}
              </Button>
            ) : null}
            {onPrintReceipt ? (
              <Button className="shrink-0" loading={receiptLoading} disabled={submitting} onClick={onPrintReceipt}>
                {t("actionPrintReceipt")}
              </Button>
            ) : null}
            <Button className="shrink-0" loading={pdfLoading} disabled={submitting} onClick={onDownloadPdf}>
              {t("actionDownloadPdf")}
            </Button>
          </>
        ) : null}
        {showReverse ? (
          <Button className="shrink-0" danger disabled={submitting} loading={submitting} onClick={onReverse}>
            {t("actionReverse")}
          </Button>
        ) : null}
        {showCreateCreditNote ? (
          <Button className="shrink-0" onClick={onCreateCreditNote}>
            {t("actionCreateCreditNote")}
          </Button>
        ) : null}
        {showCreateReceipt ? (
          <Button className="shrink-0" type="primary" onClick={onCreateReceipt}>
            {t("actionRecordPayment")}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      <FooterPostedMeta t={t} postedBy={postedBy} postedAt={postedAt} />
      {showDelete ? (
        <Button className="shrink-0" danger disabled={submitting} onClick={onDelete}>
          {t("actionDelete")}
        </Button>
      ) : null}
      <Space className="ms-auto shrink-0">
        <Button onClick={requestClose} disabled={submitting}>
          {t("drawerCancel")}
        </Button>
        <Button
          disabled={saveDisabled || submitting}
          loading={submitting}
          onClick={onSave}
          title={`${t("drawerSave")} (Ctrl+Enter)`}
        >
          {t("drawerSave")}
        </Button>
        <Space.Compact className="rounded-md shadow-sm ring-1 ring-black/10 dark:ring-white/15">
          <Button
            type="primary"
            disabled={postDisabled || submitting}
            loading={submitting}
            onClick={runLastPost}
            title={`${postLabel(lastPostIntent)} (Ctrl+Shift+Enter)`}
          >
            {postLabel(lastPostIntent)}
          </Button>
          <Dropdown
            trigger={["click"]}
            disabled={postDisabled || submitting}
            menu={{
              items: [
                { key: "post", label: t("actionPost") },
                { key: "pay", label: t("actionPostAndPay") },
              ],
              onClick: ({ key }) => runPost(/** @type {PostIntent} */ (key)),
            }}
          >
            <Button
              type="primary"
              icon={<DownOutlined />}
              loading={submitting}
              disabled={postDisabled || submitting}
              aria-label={t("postActionsMenu")}
            />
          </Dropdown>
        </Space.Compact>
      </Space>
    </div>
  );
}
