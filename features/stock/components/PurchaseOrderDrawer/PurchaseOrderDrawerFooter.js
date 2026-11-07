"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { Button, Space } from "antd";

/**
 * @param {unknown} user
 * @returns {string | null}
 */
function userDisplayName(user) {
  if (!user || typeof user !== "object") return null;
  const name = "name" in user && typeof user.name === "string" ? user.name.trim() : "";
  return name || null;
}

/**
 * @param {{ label: string; value: string }} props
 */
function AuditItem({ label, value }) {
  return (
    <span className="sales-invoice-drawer-footer-posted-item">
      <span className="sales-invoice-drawer-footer-posted-label">{label}</span>
      <span className="sales-invoice-drawer-footer-posted-value">{value || "\u2014"}</span>
    </span>
  );
}

/**
 * Purchase order footer, laid out like the sales order footer: audit info on the start side,
 * document actions on the end side.
 *
 * @param {{
 *   t: (key: string) => string;
 *   editable: boolean;
 *   isNew: boolean;
 *   submitting: boolean;
 *   saveDisabled: boolean;
 *   confirmDisabled: boolean;
 *   showDelete: boolean;
 *   showConfirm: boolean;
 *   showCancelOrder: boolean;
 *   showPdf: boolean;
 *   showMarkSent: boolean;
 *   showReceive: boolean;
 *   pdfLoading?: boolean;
 *   printLoading?: boolean;
 *   createdBy?: unknown;
 *   createdAt?: string | null;
 *   sentBy?: unknown;
 *   sentAt?: string | null;
 *   forceClose: () => void;
 *   requestClose: () => void;
 *   onSave: () => void;
 *   onConfirm: () => void;
 *   onCancelOrder: () => void;
 *   onDelete: () => void;
 *   onPrint?: () => void;
 *   onDownloadPdf: () => void;
 *   onMarkSent: () => void;
 *   onReceive: () => void;
 * }} props
 */
export default function PurchaseOrderDrawerFooter({
  t,
  editable,
  isNew,
  submitting,
  saveDisabled,
  confirmDisabled,
  showDelete,
  showConfirm,
  showCancelOrder,
  showPdf,
  showMarkSent,
  showReceive,
  pdfLoading = false,
  printLoading = false,
  createdBy = null,
  createdAt = null,
  sentBy = null,
  sentAt = null,
  forceClose,
  requestClose,
  onSave,
  onConfirm,
  onCancelOrder,
  onDelete,
  onPrint,
  onDownloadPdf,
  onMarkSent,
  onReceive,
}) {
  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      {!isNew ? (
        <div className="sales-invoice-drawer-footer-posted">
          <AuditItem label={t("poFieldCreatedBy")} value={userDisplayName(createdBy) ?? ""} />
          <AuditItem label={t("poFieldCreatedAt")} value={formatTenantDateTime(createdAt) ?? ""} />
          {sentAt ? (
            <>
              <AuditItem label={t("poFieldSentBy")} value={userDisplayName(sentBy) ?? ""} />
              <AuditItem label={t("poFieldSentIn")} value={formatTenantDateTime(sentAt) ?? ""} />
            </>
          ) : null}
        </div>
      ) : null}
      <Space className="ms-auto shrink-0">
        {showDelete ? (
          <Button danger disabled={submitting} onClick={onDelete}>
            {t("actionDelete")}
          </Button>
        ) : null}
        <Button onClick={editable ? requestClose : forceClose} disabled={submitting}>
          {editable ? t("drawerCancel") : t("drawerClose")}
        </Button>
        {editable ? (
          <Button disabled={saveDisabled || submitting} loading={submitting} onClick={onSave}>
            {t("drawerSave")}
          </Button>
        ) : null}
        {showCancelOrder ? (
          <Button danger disabled={submitting} onClick={onCancelOrder}>
            {t("actionCancelPo")}
          </Button>
        ) : null}
        {showPdf ? (
          <>
            {onPrint ? (
              <Button loading={printLoading} disabled={submitting} onClick={onPrint}>
                {t("actionPrint")}
              </Button>
            ) : null}
            <Button loading={pdfLoading} disabled={submitting} onClick={onDownloadPdf}>
              {t("actionDownloadPdf")}
            </Button>
          </>
        ) : null}
        {showMarkSent ? (
          <Button disabled={submitting} onClick={onMarkSent}>
            {t("actionMarkPoSent")}
          </Button>
        ) : null}
        {showConfirm ? (
          <Button type="primary" disabled={confirmDisabled || submitting} onClick={onConfirm}>
            {t("actionConfirmPo")}
          </Button>
        ) : null}
        {showReceive ? (
          <Button type="primary" disabled={submitting} onClick={onReceive}>
            {t("actionReceiveGoods")}
          </Button>
        ) : null}
      </Space>
    </div>
  );
}
