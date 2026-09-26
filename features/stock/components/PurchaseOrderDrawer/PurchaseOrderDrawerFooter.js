"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { Button, Space } from "antd";
import StockDocumentDrawerFooter from "../StockDocumentDrawerFooter";

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
 * @param {{
 *   t: (key: string) => string;
 *   createdBy?: unknown;
 *   createdAt?: string | null;
 *   sentBy?: unknown;
 *   sentAt?: string | null;
 * }} props
 */
function PurchaseOrderFooterAuditMeta({
  t,
  createdBy = null,
  createdAt = null,
  sentBy = null,
  sentAt = null,
}) {
  return (
    <div className="sales-invoice-drawer-footer-posted stock-transfer-drawer-footer-audit">
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">{t("poFieldCreatedBy")}</span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {userDisplayName(createdBy) || "\u2014"}
        </span>
      </span>
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">{t("poFieldCreatedAt")}</span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {formatTenantDateTime(createdAt) || "\u2014"}
        </span>
      </span>
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">{t("poFieldSentBy")}</span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {userDisplayName(sentBy) || "\u2014"}
        </span>
      </span>
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">{t("poFieldSentIn")}</span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {formatTenantDateTime(sentAt) || "\u2014"}
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
 *   confirmDisabled: boolean;
 *   showDelete: boolean;
 *   showCancelOrder: boolean;
 *   showSupplierActions?: boolean;
 *   canMarkSent?: boolean;
 *   canReceive?: boolean;
 *   pdfLoading?: boolean;
 *   receiveLoading?: boolean;
 *   createdBy?: unknown;
 *   createdAt?: string | null;
 *   sentBy?: unknown;
 *   sentAt?: string | null;
 *   onSave: () => void;
 *   onConfirm: () => void;
 *   onCancelOrder: () => void;
 *   onDelete: () => void;
 *   onDownloadPdf?: () => void;
 *   onMarkSent?: () => void;
 *   onReceive?: () => void;
 * }} props
 */
export default function PurchaseOrderDrawerFooter({
  readOnly,
  t,
  forceClose,
  requestClose,
  submitting,
  saveDisabled,
  confirmDisabled,
  showDelete,
  showCancelOrder,
  showSupplierActions = false,
  canMarkSent = false,
  canReceive = false,
  pdfLoading = false,
  receiveLoading = false,
  createdBy = null,
  createdAt = null,
  sentBy = null,
  sentAt = null,
  onSave,
  onConfirm,
  onCancelOrder,
  onDelete,
  onDownloadPdf,
  onMarkSent,
  onReceive,
}) {
  const viewExtras =
    showSupplierActions || showCancelOrder ? (
      <Space wrap>
        {showSupplierActions ? (
          <Button loading={pdfLoading} disabled={submitting} onClick={onDownloadPdf}>
            {t("actionDownloadPoPdf")}
          </Button>
        ) : null}
        {canMarkSent ? (
          <Button disabled={submitting} onClick={onMarkSent}>
            {t("actionMarkPoSent")}
          </Button>
        ) : null}
        {showCancelOrder ? (
          <Button disabled={submitting} onClick={onCancelOrder}>
            {t("actionCancelPo")}
          </Button>
        ) : null}
        {canReceive ? (
          <Button type="primary" disabled={submitting} loading={receiveLoading} onClick={onReceive}>
            {t("actionReceiveGoods")}
          </Button>
        ) : null}
      </Space>
    ) : null;

  return (
    <StockDocumentDrawerFooter
      readOnly={readOnly}
      t={t}
      forceClose={forceClose}
      requestClose={requestClose}
      submitting={submitting}
      saveDisabled={saveDisabled}
      primaryDisabled={confirmDisabled}
      showDelete={showDelete}
      showPrimary
      primaryLabel={t("actionConfirmPo")}
      meta={
        <PurchaseOrderFooterAuditMeta
          t={t}
          createdBy={createdBy}
          createdAt={createdAt}
          sentBy={sentBy}
          sentAt={sentAt}
        />
      }
      startExtras={
        showCancelOrder ? (
          <Button disabled={submitting} onClick={onCancelOrder}>
            {t("actionCancelPo")}
          </Button>
        ) : null
      }
      readOnlyExtras={viewExtras}
      onSave={onSave}
      onPrimary={onConfirm}
      onDelete={onDelete}
    />
  );
}
