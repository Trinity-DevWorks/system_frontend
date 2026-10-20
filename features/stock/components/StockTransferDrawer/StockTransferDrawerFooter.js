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
 * @param {(key: string) => string} t
 * @param {string} key
 * @param {string} fallback
 */
function stockLabel(t, key, fallback) {
  const value = t(key);
  if (!value || value === key || value.endsWith(`.${key}`)) return fallback;
  return value;
}

/**
 * @param {{
 *   t: (key: string) => string;
 *   dispatchedBy?: unknown;
 *   dispatchedAt?: string | null;
 *   receivedBy?: unknown;
 *   receivedAt?: string | null;
 * }} props
 */
function TransferFooterAuditMeta({
  t,
  dispatchedBy = null,
  dispatchedAt = null,
  receivedBy = null,
  receivedAt = null,
}) {
  return (
    <div className="sales-invoice-drawer-footer-posted stock-transfer-drawer-footer-audit">
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">
          {stockLabel(t, "transferFieldDispatchedBy", "Dispatched by")}
        </span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {userDisplayName(dispatchedBy) || "\u2014"}
        </span>
      </span>
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">{t("transferFieldDispatchedAt")}</span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {formatTenantDateTime(dispatchedAt) || "\u2014"}
        </span>
      </span>
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">
          {stockLabel(t, "transferFieldReceivedBy", "Received by")}
        </span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {userDisplayName(receivedBy) || "\u2014"}
        </span>
      </span>
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">{t("transferFieldReceivedAt")}</span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {formatTenantDateTime(receivedAt) || "\u2014"}
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
 *   dispatchDisabled: boolean;
 *   showDelete: boolean;
 *   canReceive?: boolean;
 *   canCancelInTransit?: boolean;
 *   canCloseOpen?: boolean;
 *   dispatchedBy?: unknown;
 *   dispatchedAt?: string | null;
 *   receivedBy?: unknown;
 *   receivedAt?: string | null;
 *   onSave: () => void;
 *   onDispatch: () => void;
 *   onReceive?: () => void;
 *   onCloseOpen?: () => void;
 *   onCancelTransfer: () => void;
 *   onDelete: () => void;
 * }} props
 */
export default function StockTransferDrawerFooter({
  readOnly,
  t,
  forceClose,
  requestClose,
  submitting,
  saveDisabled,
  dispatchDisabled,
  showDelete,
  canReceive = false,
  canCancelInTransit = false,
  canCloseOpen = false,
  dispatchedBy = null,
  dispatchedAt = null,
  receivedBy = null,
  receivedAt = null,
  onSave,
  onDispatch,
  onReceive,
  onCloseOpen,
  onCancelTransfer,
  onDelete,
}) {
  return (
    <StockDocumentDrawerFooter
      readOnly={readOnly}
      t={t}
      forceClose={forceClose}
      requestClose={requestClose}
      submitting={submitting}
      saveDisabled={saveDisabled}
      primaryDisabled={dispatchDisabled}
      showDelete={showDelete}
      showPrimary
      primaryLabel={t("actionDispatchTransfer")}
      meta={
        <TransferFooterAuditMeta
          t={t}
          dispatchedBy={dispatchedBy}
          dispatchedAt={dispatchedAt}
          receivedBy={receivedBy}
          receivedAt={receivedAt}
        />
      }
      readOnlyStartExtras={
        canCancelInTransit ? (
          <Button disabled={submitting} onClick={onCancelTransfer}>
            {t("actionCancelTransfer")}
          </Button>
        ) : null
      }
      readOnlyExtras={
        canCloseOpen || canReceive ? (
          <Space wrap>
            {canCloseOpen ? (
              <Button disabled={submitting} onClick={onCloseOpen}>
                {t("actionCloseTransferOpen")}
              </Button>
            ) : null}
            {canReceive ? (
              <Button type="primary" disabled={submitting} onClick={onReceive}>
                {t("actionReceiveTransfer")}
              </Button>
            ) : null}
          </Space>
        ) : null
      }
      onSave={onSave}
      onPrimary={onDispatch}
      onDelete={onDelete}
    />
  );
}
